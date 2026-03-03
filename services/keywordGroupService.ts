/**
 * keywordGroupService.ts
 *
 * Manages keyword groups:
 * - AI clustering (gpt-4o-mini for low cost)
 * - Persisting clusters as KeywordGroup documents
 * - Assigning groups to websites with priority scoring
 * - Blog topic suggestion generation
 */

import mongoose from 'mongoose';
import OpenAI from 'openai';
import { connectDB } from '@/lib/db';
import { KeywordMaster, KeywordGroup, Website } from '@/models';
import type { IKeywordMaster } from '@/models/KeywordMaster';
import type { IKeywordGroupAISuggestion } from '@/models/KeywordGroup';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawClusterResult {
  groupName: string;
  primaryKeyword: string;
  keywords: string[];
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  niche?: string;
}

// ─── AI Clustering ────────────────────────────────────────────────────────────

/**
 * Cluster a list of KeywordMaster IDs into groups using gpt-4o-mini.
 * Persists results as KeywordGroup documents.
 * Returns the created/updated group IDs.
 */
export async function clusterAndPersist(
  keywordMasterIds: string[],
  options: { niche?: string; maxGroupSize?: number } = {}
): Promise<{ groups: string[]; tokensUsed: number }> {
  await connectDB();

  if (!keywordMasterIds.length) return { groups: [], tokensUsed: 0 };

  // Fetch keyword strings (send strings only to AI — not full docs)
  const masters = await KeywordMaster.find({
    _id: { $in: keywordMasterIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select('_id keyword volume kd')
    .lean();

  if (!masters.length) return { groups: [], tokensUsed: 0 };

  const kwList = masters
    .map((m) => `${m.keyword} [vol:${m.volume}, kd:${m.kd}]`)
    .join('\n');

  const prompt = `Cluster these SEO keywords into topic groups for blog content planning.
Each group should target one blog post. Aim for 3–8 keywords per group.
${options.niche ? `Website niche: ${options.niche}` : ''}

Keywords:
${kwList}

Return JSON array only:
[
  {
    "groupName": "descriptive group name",
    "primaryKeyword": "most important keyword in group",
    "keywords": ["kw1", "kw2", ...],
    "intent": "informational|commercial|transactional|navigational",
    "niche": "sub-niche if applicable"
  }
]`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini', // cost-efficient for classification
    messages: [
      { role: 'system', content: 'You are an SEO strategist. Return only valid JSON arrays, no other text.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  });

  const tokensUsed = completion.usage?.total_tokens ?? 0;
  const raw = completion.choices[0]?.message?.content ?? '[]';

  let clusters: RawClusterResult[];
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    clusters = JSON.parse(cleaned);
  } catch {
    console.error('[KeywordGroupService] Failed to parse AI clustering result');
    return { groups: [], tokensUsed };
  }

  // Build keyword → master map (lean() returns FlattenMaps, let TS infer)
  const masterMap = new Map(
    masters.map((m) => [m.keyword.toLowerCase(), m] as const)
  );

  const createdGroupIds: string[] = [];

  for (const cluster of clusters) {
    const memberIds: mongoose.Types.ObjectId[] = [];
    let totalVolume = 0;
    let totalKD = 0;
    let primaryId: mongoose.Types.ObjectId | undefined;

    for (const kw of cluster.keywords) {
      const master = masterMap.get(kw.toLowerCase());
      if (master) {
        memberIds.push(master._id);
        totalVolume += master.volume;
        totalKD += master.kd;
        if (kw.toLowerCase() === cluster.primaryKeyword.toLowerCase()) {
          primaryId = master._id;
        }
      }
    }

    if (!memberIds.length) continue;

    const avgKD = memberIds.length ? totalKD / memberIds.length : 0;
    const priorityScore = Math.round(totalVolume * 0.4 + (100 - avgKD) * 0.3 * memberIds.length);

    const group = await KeywordGroup.findOneAndUpdate(
      { name: cluster.groupName },
      {
        $setOnInsert: {
          name: cluster.groupName,
          isUserEdited: false,
          createdAt: new Date(),
        },
        $set: {
          keywordMasterIds: memberIds,
          primaryKeywordId: primaryId,
          niche: cluster.niche || options.niche,
          totalVolume,
          avgKD: Math.round(avgKD),
          keywordCount: memberIds.length,
          priorityScore,
          lastClusteredAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    if (group) createdGroupIds.push(group._id.toString());
  }

  return { groups: createdGroupIds, tokensUsed };
}

// ─── Website Assignment ───────────────────────────────────────────────────────

/**
 * Assign a keyword group to a website.
 * Recalculates priority score using website organic traffic gap.
 */
export async function assignGroupToWebsite(
  groupId: string,
  websiteId: string
): Promise<void> {
  await connectDB();

  const [group, website] = await Promise.all([
    KeywordGroup.findById(groupId),
    Website.findById(websiteId).lean(),
  ]);

  if (!group) throw new Error(`KeywordGroup not found: ${groupId}`);
  if (!website) throw new Error(`Website not found: ${websiteId}`);

  // Recalculate priority: volume * 0.4 + (100-kd) * 0.3 + traffic_gap * 0.3
  const trafficGap = Math.max(0, 100 - Math.min(100, (website.traffic || 0) / 1000));
  const priorityScore = Math.round(
    group.totalVolume * 0.4 +
    (100 - group.avgKD) * 0.3 +
    trafficGap * 0.3
  );

  await KeywordGroup.findByIdAndUpdate(groupId, {
    websiteId: new mongoose.Types.ObjectId(websiteId),
    status: 'assigned',
    assignedAt: new Date(),
    priorityScore,
  });
}

/**
 * Auto-recommend the best unassigned groups for a website.
 * Ranked by priority score, filtered by niche match.
 */
export async function recommendGroupsForWebsite(
  websiteId: string,
  limit: number = 10
) {
  await connectDB();

  const website = await Website.findById(websiteId).lean();
  if (!website) throw new Error(`Website not found: ${websiteId}`);

  const filter: Record<string, unknown> = {
    status: 'ungrouped',
    websiteId: { $exists: false },
  };

  // Filter by niche if available
  if (website.niche) {
    filter.niche = { $regex: new RegExp(website.niche, 'i') };
  }

  return KeywordGroup.find(filter)
    .sort({ priorityScore: -1 })
    .limit(limit)
    .populate('primaryKeyword', 'keyword volume kd')
    .lean();
}

// ─── Blog Topic Suggestions ───────────────────────────────────────────────────

/**
 * Generate AI blog topic suggestions for a keyword group.
 * Uses gpt-4o-mini and sends only keyword strings + group name.
 */
export async function generateBlogSuggestions(
  groupId: string
): Promise<IKeywordGroupAISuggestion> {
  await connectDB();

  const group = await KeywordGroup.findById(groupId)
    .populate<{ keywordMasterIds: IKeywordMaster[] }>('keywordMasterIds', 'keyword volume kd')
    .lean();

  if (!group) throw new Error(`KeywordGroup not found: ${groupId}`);

  // Send only top 8 keywords to minimise tokens
  const topKeywords = (group.keywordMasterIds as IKeywordMaster[])
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
    .map((k) => k.keyword);

  const prompt = `Generate an SEO blog post plan for this keyword group.

Group: "${group.name}"
Keywords: ${topKeywords.join(', ')}
${group.niche ? `Niche: ${group.niche}` : ''}

Return JSON only:
{
  "blogTitle": "SEO-optimised title under 65 chars",
  "outline": ["H2 section 1", "H2 section 2", "H2 section 3", "H2 section 4"],
  "targetAudience": "who this is for",
  "contentType": "listicle|how-to|comparison|guide|review|news"
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an SEO content strategist. Return only valid JSON, no extra text.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 400,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: Partial<IKeywordGroupAISuggestion>;
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI blog suggestion response');
  }

  const suggestion: IKeywordGroupAISuggestion = {
    blogTitle: parsed.blogTitle ?? group.name,
    outline: parsed.outline ?? [],
    targetAudience: parsed.targetAudience ?? '',
    contentType: parsed.contentType ?? 'guide',
    generatedAt: new Date(),
  };

  // Persist to group
  await KeywordGroup.findByIdAndUpdate(groupId, { aiSuggestions: suggestion });

  return suggestion;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Mark a group as published after blog is live.
 */
export async function markGroupPublished(
  groupId: string,
  blogContentId: string,
  blogUrl: string
): Promise<void> {
  await connectDB();

  await KeywordGroup.findByIdAndUpdate(groupId, {
    status: 'published',
    blogContentId: new mongoose.Types.ObjectId(blogContentId),
    blogPublishedAt: new Date(),
    blogUrl,
  });
}

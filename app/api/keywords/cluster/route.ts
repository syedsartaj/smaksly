import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Keyword } from '@/models';
import OpenAI from 'openai';
import mongoose from 'mongoose';

// Lazy-load OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface ClusterResult {
  clusterId: string;
  clusterName: string;
  keywords: string[];
  parentKeyword: string;
  intent: string;
  contentSuggestion: string;
}

// POST - Cluster keywords into topic groups
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { keywordIds, keywords: rawKeywords, autoUpdate = false } = body;

    let keywordsToCluster: string[] = [];

    // Get keywords from IDs or use provided list
    if (keywordIds && Array.isArray(keywordIds) && keywordIds.length > 0) {
      const dbKeywords = await Keyword.find({
        _id: { $in: keywordIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
      }).lean();
      keywordsToCluster = dbKeywords.map((k) => k.keyword);
    } else if (rawKeywords && Array.isArray(rawKeywords)) {
      keywordsToCluster = rawKeywords;
    }

    if (keywordsToCluster.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No keywords provided for clustering' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert SEO content strategist. Analyze and cluster the following keywords into logical topic groups for content planning:

Keywords:
${keywordsToCluster.map((k, i) => `${i + 1}. ${k}`).join('\n')}

For each cluster, provide:
1. A unique cluster ID (e.g., "cluster-1", "cluster-2")
2. A descriptive cluster name (the main topic)
3. The list of keywords that belong to this cluster
4. The parent/primary keyword for the cluster (best keyword to target)
5. The primary search intent for this cluster
6. A content suggestion (article title/type)

Group semantically related keywords together. A keyword should only appear in one cluster.
Aim for 3-10 keywords per cluster.

Return your response as a JSON array with objects containing:
- clusterId: string
- clusterName: string
- keywords: string[]
- parentKeyword: string
- intent: "informational" | "navigational" | "commercial" | "transactional"
- contentSuggestion: string

Return ONLY the JSON array, no additional text.`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert. Return only valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || '[]';

    let clusters: ClusterResult[];
    try {
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      clusters = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { success: false, error: 'Failed to parse clustering results' },
        { status: 500 }
      );
    }

    // Auto-update keywords in database if requested
    if (autoUpdate && keywordIds && clusters.length > 0) {
      for (const cluster of clusters) {
        await Keyword.updateMany(
          {
            _id: { $in: keywordIds },
            keyword: { $in: cluster.keywords },
          },
          {
            $set: {
              clusterId: cluster.clusterId,
              clusterName: cluster.clusterName,
              parentKeyword: cluster.parentKeyword,
              intent: cluster.intent,
            },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: clusters,
      clusterCount: clusters.length,
      keywordsProcessed: keywordsToCluster.length,
      updated: autoUpdate,
    });
  } catch (error) {
    console.error('Error clustering keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cluster keywords' },
      { status: 500 }
    );
  }
}

// GET - Get existing clusters
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');

    const match: Record<string, unknown> = {
      clusterId: { $exists: true, $ne: null },
    };

    if (websiteId) {
      match.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    const clusters = await Keyword.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$clusterId',
          clusterName: { $first: '$clusterName' },
          parentKeyword: { $first: '$parentKeyword' },
          intent: { $first: '$intent' },
          keywords: { $push: '$keyword' },
          keywordCount: { $sum: 1 },
          totalVolume: { $sum: '$volume' },
          avgDifficulty: { $avg: '$difficulty' },
        },
      },
      { $sort: { totalVolume: -1 } },
    ]);

    return NextResponse.json({
      success: true,
      data: clusters,
      count: clusters.length,
    });
  } catch (error) {
    console.error('Error fetching clusters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clusters' },
      { status: 500 }
    );
  }
}

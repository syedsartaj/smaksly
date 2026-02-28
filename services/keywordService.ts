import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Keyword, Website } from '@/models';
import { fetchKeywordSuggestions, fetchSERPResults } from '@/lib/dataforseo';
import type { DataForSEOKeyword, KeywordFilter } from '@/types/keyword';

const LOCATION_CODES: Record<string, number> = {
  US: 2840, GB: 2826, CA: 2124, AU: 2036, IN: 2356,
  AE: 2784, SA: 2682, DE: 2276, FR: 2250, ES: 2724,
};

export async function fetchKeywordIdeas(
  websiteId: string,
  seedKeywords?: string[]
): Promise<DataForSEOKeyword[]> {
  await connectDB();
  const website = await Website.findById(websiteId);
  if (!website) throw new Error(`Website not found: ${websiteId}`);

  const seeds = seedKeywords?.length
    ? seedKeywords
    : [website.niche, ...website.tags.slice(0, 4)].filter(Boolean);

  if (seeds.length === 0) throw new Error('No seed keywords available.');

  const locationCode = LOCATION_CODES[website.country] || LOCATION_CODES.US;
  return fetchKeywordSuggestions(seeds, locationCode, website.language || 'en', 200);
}

export function filterByDifficulty(
  keywords: DataForSEOKeyword[],
  filter: KeywordFilter = { maxDifficulty: 40, minVolume: 100 }
): DataForSEOKeyword[] {
  return keywords.filter((kw) => {
    if (kw.difficulty > filter.maxDifficulty) return false;
    if (kw.volume < filter.minVolume) return false;
    if (filter.intents?.length && !filter.intents.includes(kw.intent)) return false;
    return true;
  });
}

export async function storeKeywords(
  websiteId: string,
  categoryId: string,
  keywords: DataForSEOKeyword[]
): Promise<{ inserted: number; duplicates: number }> {
  await connectDB();
  const operations = keywords.map((kw) => ({
    updateOne: {
      filter: { keyword: kw.keyword.toLowerCase(), websiteId: new mongoose.Types.ObjectId(websiteId) },
      update: {
        $setOnInsert: {
          keyword: kw.keyword.toLowerCase(),
          websiteId: new mongoose.Types.ObjectId(websiteId),
          categoryId: new mongoose.Types.ObjectId(categoryId),
          volume: kw.volume, difficulty: kw.difficulty, cpc: kw.cpc,
          competition: kw.competition, trend: kw.trend, intent: kw.intent,
          isLongTail: kw.keyword.split(' ').length >= 4,
          wordCount: kw.keyword.split(' ').length,
          status: 'discovered', source: 'ai_research',
          serpFeatures: kw.serpFeatures, discoveredAt: new Date(),
        },
        $set: { lastUpdatedMetricsAt: new Date() },
      },
      upsert: true,
    },
  }));

  if (operations.length === 0) return { inserted: 0, duplicates: 0 };
  const result = await Keyword.bulkWrite(operations, { ordered: false });
  return { inserted: result.upsertedCount, duplicates: result.modifiedCount };
}

export async function enrichWithSERP(websiteId: string, limit: number = 10): Promise<number> {
  await connectDB();
  const website = await Website.findById(websiteId);
  if (!website) throw new Error(`Website not found: ${websiteId}`);

  const keywords = await Keyword.find({
    websiteId: new mongoose.Types.ObjectId(websiteId),
    status: 'discovered',
    'topCompetitors.0': { $exists: false },
  }).sort({ volume: -1 }).limit(limit);

  let enriched = 0;
  for (const kw of keywords) {
    try {
      kw.topCompetitors = (await fetchSERPResults(kw.keyword, LOCATION_CODES[website.country] || 2840, website.language || 'en')).slice(0, 10);
      await kw.save();
      enriched++;
    } catch (error) {
      console.error(`SERP enrichment failed for "${kw.keyword}":`, error);
    }
  }
  return enriched;
}

export async function getUnassignedKeywords(websiteId: string, limit: number = 5) {
  await connectDB();
  return Keyword.find({
    websiteId: new mongoose.Types.ObjectId(websiteId),
    status: 'discovered',
    contentId: { $exists: false },
  }).sort({ volume: -1, difficulty: 1 }).limit(limit).lean();
}

export async function runDailyKeywordResearch() {
  await connectDB();
  const websites = await Website.find({ status: 'active' }).lean();
  const results = [];

  for (const website of websites) {
    try {
      const raw = await fetchKeywordIdeas(website._id.toString());
      const filtered = filterByDifficulty(raw, { maxDifficulty: 40, minVolume: 100 });
      const stored = await storeKeywords(website._id.toString(), website.categoryId.toString(), filtered);
      results.push({ websiteId: website._id.toString(), websiteName: website.name, fetched: raw.length, filtered: filtered.length, stored });
      console.log(`[KeywordService] ${website.name}: fetched=${raw.length}, filtered=${filtered.length}, inserted=${stored.inserted}`);
    } catch (error) {
      console.error(`[KeywordService] Failed for ${website.name}:`, error);
      results.push({ websiteId: website._id.toString(), websiteName: website.name, fetched: 0, filtered: 0, stored: { inserted: 0, duplicates: 0 } });
    }
  }
  return results;
}

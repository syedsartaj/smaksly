/**
 * keywordMasterService.ts
 *
 * Manages the global keyword deduplication store (KeywordMaster)
 * and the append-only daily history (KeywordHistory).
 *
 * Rules:
 * - KeywordMaster: upsert only (keyword+country unique globally)
 * - KeywordHistory: insert only (never update existing records)
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { KeywordMaster, KeywordHistory, Website } from '@/models';
import type { IKeywordMaster, KMProvider } from '@/models/KeywordMaster';

export interface KeywordImportRow {
  keyword: string;
  country?: string;
  region?: string;
  volume?: number;
  kd?: number;
  cpc?: number;
  competition?: number;
  trend?: 'rising' | 'stable' | 'declining';
  provider?: KMProvider;
  providerKeywordId?: string;
}

export interface KeywordHistoryRow {
  keywordMasterId: string;
  websiteId: string;
  keyword: string;
  country: string;
  date: Date;
  rank?: number | null;
  previousRank?: number | null;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
  volume?: number;
  kd?: number;
  provider?: string;
}

// ─── Master Upsert ────────────────────────────────────────────────────────────

/**
 * Bulk upsert rows into keywords_master.
 * Returns counts of newly inserted vs updated records.
 */
export async function importToMaster(
  rows: KeywordImportRow[]
): Promise<{ inserted: number; updated: number; errors: number }> {
  await connectDB();

  if (!rows.length) return { inserted: 0, updated: 0, errors: 0 };

  const ops = rows.map((row) => ({
    updateOne: {
      filter: {
        keyword: row.keyword.toLowerCase().trim(),
        country: (row.country || 'US').toUpperCase(),
      },
      update: {
        $setOnInsert: {
          keyword: row.keyword.toLowerCase().trim(),
          country: (row.country || 'US').toUpperCase(),
          createdAt: new Date(),
        },
        $set: {
          region: row.region,
          volume: row.volume ?? 0,
          kd: row.kd ?? 0,
          cpc: row.cpc ?? 0,
          competition: row.competition ?? 0,
          trend: row.trend ?? 'stable',
          provider: row.provider ?? 'import',
          providerKeywordId: row.providerKeywordId,
          lastRefreshedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  try {
    const result = await KeywordMaster.bulkWrite(ops, { ordered: false });
    return {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      errors: 0,
    };
  } catch (err: unknown) {
    console.error('[KeywordMasterService] bulkWrite error:', err);
    const writeErrors = (err as { writeErrors?: unknown[] }).writeErrors?.length ?? 0;
    return { inserted: 0, updated: 0, errors: writeErrors };
  }
}

// ─── History Append ───────────────────────────────────────────────────────────

/**
 * Append daily history rows for a set of keywords.
 * Uses ordered: false so a duplicate key on one record doesn't block others.
 */
export async function appendHistory(
  rows: KeywordHistoryRow[]
): Promise<{ appended: number; skipped: number }> {
  await connectDB();

  if (!rows.length) return { appended: 0, skipped: 0 };

  // Truncate date to UTC midnight for consistent daily keys
  const normalised = rows.map((r) => {
    const d = new Date(r.date);
    d.setUTCHours(0, 0, 0, 0);
    return { ...r, date: d };
  });

  const ops = normalised.map((r) => ({
    updateOne: {
      filter: {
        keywordMasterId: new mongoose.Types.ObjectId(r.keywordMasterId),
        websiteId: new mongoose.Types.ObjectId(r.websiteId),
        date: r.date,
      },
      update: {
        $setOnInsert: {
          keywordMasterId: new mongoose.Types.ObjectId(r.keywordMasterId),
          websiteId: new mongoose.Types.ObjectId(r.websiteId),
          keyword: r.keyword.toLowerCase().trim(),
          country: r.country.toUpperCase(),
          date: r.date,
          rank: r.rank ?? null,
          previousRank: r.previousRank ?? null,
          rankChange:
            r.rank != null && r.previousRank != null
              ? r.previousRank - r.rank // positive = improved
              : null,
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: r.ctr ?? 0,
          position: r.position ?? 0,
          volume: r.volume ?? 0,
          kd: r.kd ?? 0,
          provider: r.provider ?? 'gsc',
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  try {
    const result = await KeywordHistory.bulkWrite(ops, { ordered: false });
    return {
      appended: result.upsertedCount,
      skipped: result.matchedCount, // already existed — not overwritten
    };
  } catch (err: unknown) {
    console.error('[KeywordMasterService] appendHistory error:', err);
    return { appended: 0, skipped: rows.length };
  }
}

// ─── GSC Sync ─────────────────────────────────────────────────────────────────

/**
 * Pull per-keyword GSC data for a single website and append to history.
 * Uses the last 1 day of GSC data for the daily cron.
 */
export async function syncDailyRankingsFromGSC(websiteId: string): Promise<{
  processed: number;
  appended: number;
  skipped: number;
}> {
  await connectDB();

  const website = await Website.findById(websiteId).lean();
  if (!website) throw new Error(`Website not found: ${websiteId}`);
  if (!website.gscConnected) {
    console.log(`[KeywordMasterService] GSC not connected for ${website.name}`);
    return { processed: 0, appended: 0, skipped: 0 };
  }

  // Fetch top keywords from stored SEOMetric (already pulled from GSC by healthWorker)
  const { SEOMetric } = await import('@/models');
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  const metric = await SEOMetric.findOne({
    websiteId: new mongoose.Types.ObjectId(websiteId),
    period: 'daily',
    date: { $gte: yesterday },
  })
    .sort({ date: -1 })
    .lean();

  if (!metric || !metric.topKeywords?.length) {
    console.log(`[KeywordMasterService] No GSC data for ${website.name} on ${yesterday.toISOString()}`);
    return { processed: 0, appended: 0, skipped: 0 };
  }

  const country = (website.country || 'US').toUpperCase();
  const historyRows: KeywordHistoryRow[] = [];

  for (const kw of metric.topKeywords) {
    // Ensure keyword exists in master (.lean() returns FlattenMaps — infer type)
    let master = await KeywordMaster.findOne({
      keyword: kw.keyword.toLowerCase(),
      country,
    }).lean();

    if (!master) {
      master = await KeywordMaster.findOneAndUpdate(
        { keyword: kw.keyword.toLowerCase(), country },
        {
          $setOnInsert: {
            keyword: kw.keyword.toLowerCase(),
            country,
            volume: 0,
            kd: 0,
            trend: 'stable',
            provider: 'gsc',
            lastRefreshedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      ).lean();
    }

    if (!master) continue;

    historyRows.push({
      keywordMasterId: master._id.toString(),
      websiteId,
      keyword: kw.keyword,
      country,
      date: yesterday,
      rank: kw.position ? Math.round(kw.position) : null,
      clicks: kw.clicks ?? 0,
      impressions: kw.impressions ?? 0,
      ctr: kw.ctr ?? 0,
      position: kw.position ?? 0,
      provider: 'gsc',
    });
  }

  const { appended, skipped } = await appendHistory(historyRows);
  return { processed: historyRows.length, appended, skipped };
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Get ranking trend for a keyword on a website over N days.
 */
export async function getKeywordTrend(
  keywordMasterId: string,
  websiteId: string,
  days: number = 30
) {
  await connectDB();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  return KeywordHistory.find({
    keywordMasterId: new mongoose.Types.ObjectId(keywordMasterId),
    websiteId: new mongoose.Types.ObjectId(websiteId),
    date: { $gte: since },
  })
    .sort({ date: 1 })
    .select('date rank clicks impressions ctr position')
    .lean();
}

/**
 * Get all keywords tracked for a website with their latest ranking.
 */
export async function getLatestRankings(websiteId: string) {
  await connectDB();

  return KeywordHistory.aggregate([
    { $match: { websiteId: new mongoose.Types.ObjectId(websiteId) } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$keywordMasterId',
        keyword: { $first: '$keyword' },
        latestRank: { $first: '$rank' },
        latestPosition: { $first: '$position' },
        latestClicks: { $first: '$clicks' },
        latestImpressions: { $first: '$impressions' },
        latestDate: { $first: '$date' },
        rankChange: { $first: '$rankChange' },
      },
    },
    { $sort: { latestClicks: -1 } },
  ]);
}

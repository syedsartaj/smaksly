import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { KeywordMaster } from '@/models';
import { importToMaster } from '@/services/keywordMasterService';
import mongoose from 'mongoose';

// GET /api/keywords/master
// List keywords from master with filtering & pagination
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '50'));
    const country = searchParams.get('country');
    const q = searchParams.get('q');
    const minVolume = searchParams.get('minVolume');
    const maxKD = searchParams.get('maxKD');
    const trend = searchParams.get('trend');
    const sortBy = searchParams.get('sortBy') ?? 'volume';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = {};
    if (country) filter.country = country.toUpperCase();
    if (trend) filter.trend = trend;
    if (minVolume) filter.volume = { $gte: parseInt(minVolume) };
    if (maxKD) filter.kd = { ...(filter.kd as object ?? {}), $lte: parseInt(maxKD) };
    if (q) filter.$text = { $search: q };

    const allowedSort: Record<string, string> = {
      volume: 'volume', kd: 'kd', keyword: 'keyword', updatedAt: 'updatedAt',
    };
    const sortField = allowedSort[sortBy] ?? 'volume';

    const [total, keywords] = await Promise.all([
      KeywordMaster.countDocuments(filter),
      KeywordMaster.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: keywords,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[API] GET /keywords/master:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch keywords' }, { status: 500 });
  }
}

// POST /api/keywords/master
// Bulk import keywords into master
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    // Accept: { keywords: [...] } or a single keyword object
    const rows = Array.isArray(body.keywords) ? body.keywords : [body];

    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'No keywords provided' }, { status: 400 });
    }

    if (rows.length > 5000) {
      return NextResponse.json({ success: false, error: 'Max 5000 keywords per import' }, { status: 400 });
    }

    const result = await importToMaster(rows);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Imported ${result.inserted} new, updated ${result.updated} existing keywords`,
    });
  } catch (error) {
    console.error('[API] POST /keywords/master:', error);
    return NextResponse.json({ success: false, error: 'Failed to import keywords' }, { status: 500 });
  }
}

// DELETE /api/keywords/master?id=xxx
// Remove a keyword from master (and its history)
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Valid id required' }, { status: 400 });
    }
    await KeywordMaster.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Keyword deleted from master' });
  } catch (error) {
    console.error('[API] DELETE /keywords/master:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete keyword' }, { status: 500 });
  }
}

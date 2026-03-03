import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { KeywordGroup, KeywordMaster } from '@/models';
import { clusterAndPersist } from '@/services/keywordGroupService';
import mongoose from 'mongoose';

// GET /api/keywords/groups
// List all keyword groups with optional filters
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
    const status = searchParams.get('status');
    const websiteId = searchParams.get('websiteId');
    const niche = searchParams.get('niche');
    const unassigned = searchParams.get('unassigned') === 'true';
    const sortBy = searchParams.get('sortBy') ?? 'priorityScore';

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (niche) filter.niche = { $regex: new RegExp(niche, 'i') };
    if (websiteId && mongoose.isValidObjectId(websiteId)) {
      filter.websiteId = new mongoose.Types.ObjectId(websiteId);
    }
    if (unassigned) {
      filter.websiteId = { $exists: false };
      filter.status = 'ungrouped';
    }

    const allowedSort: Record<string, string> = {
      priorityScore: 'priorityScore',
      totalVolume: 'totalVolume',
      avgKD: 'avgKD',
      createdAt: 'createdAt',
      name: 'name',
    };
    const sortField = allowedSort[sortBy] ?? 'priorityScore';

    const [total, groups] = await Promise.all([
      KeywordGroup.countDocuments(filter),
      KeywordGroup.find(filter)
        .sort({ [sortField]: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('primaryKeyword', 'keyword volume kd')
        .populate('website', 'name domain')
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: groups,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[API] GET /keywords/groups:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST /api/keywords/groups
// Two modes:
// 1. { action: 'cluster', keywordMasterIds: [...], niche? }  → AI cluster
// 2. { name, keywordMasterIds: [...], niche? }               → manual create
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (body.action === 'cluster') {
      // AI clustering mode
      const { keywordMasterIds, niche } = body;
      if (!Array.isArray(keywordMasterIds) || !keywordMasterIds.length) {
        return NextResponse.json(
          { success: false, error: 'keywordMasterIds array required' },
          { status: 400 }
        );
      }

      const result = await clusterAndPersist(keywordMasterIds, { niche });

      return NextResponse.json({
        success: true,
        data: { groupIds: result.groups, tokensUsed: result.tokensUsed },
        message: `Created/updated ${result.groups.length} groups`,
      });
    }

    // Manual create mode
    const { name, keywordMasterIds, niche, websiteId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }

    // Validate keyword IDs and compute metrics
    const masters = keywordMasterIds?.length
      ? await KeywordMaster.find({
          _id: { $in: keywordMasterIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
        })
          .select('_id volume kd')
          .lean()
      : [];

    const totalVolume = masters.reduce((s, m) => s + m.volume, 0);
    const avgKD = masters.length
      ? Math.round(masters.reduce((s, m) => s + m.kd, 0) / masters.length)
      : 0;

    const group = await KeywordGroup.create({
      name: name.trim(),
      niche,
      keywordMasterIds: masters.map((m) => m._id),
      totalVolume,
      avgKD,
      keywordCount: masters.length,
      priorityScore: Math.round(totalVolume * 0.4 + (100 - avgKD) * 0.3),
      websiteId: websiteId && mongoose.isValidObjectId(websiteId)
        ? new mongoose.Types.ObjectId(websiteId)
        : undefined,
      status: websiteId ? 'assigned' : 'ungrouped',
      isUserEdited: true,
    });

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /keywords/groups:', error);
    return NextResponse.json({ success: false, error: 'Failed to create group' }, { status: 500 });
  }
}

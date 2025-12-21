import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Keyword, Website } from '@/models';
import mongoose from 'mongoose';

// GET - List keywords with filters and pagination
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const websiteId = searchParams.get('websiteId');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const intent = searchParams.get('intent');
    const difficulty = searchParams.get('difficulty'); // easy, medium, hard
    const sortBy = searchParams.get('sortBy') || 'volume';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search');
    const clusterId = searchParams.get('clusterId');

    const query: Record<string, unknown> = {};

    if (websiteId) {
      query.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    if (categoryId) {
      query.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    if (status) {
      query.status = status;
    }

    if (intent) {
      query.intent = intent;
    }

    if (difficulty) {
      switch (difficulty) {
        case 'easy':
          query.difficulty = { $lte: 30 };
          break;
        case 'medium':
          query.difficulty = { $gt: 30, $lte: 60 };
          break;
        case 'hard':
          query.difficulty = { $gt: 60 };
          break;
      }
    }

    if (clusterId) {
      query.clusterId = clusterId;
    }

    if (search) {
      query.$or = [
        { keyword: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [keywords, total] = await Promise.all([
      Keyword.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('websiteId', 'name domain')
        .populate('categoryId', 'name slug')
        .lean(),
      Keyword.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: keywords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

// POST - Add new keywords (bulk or single)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { keywords, websiteId, categoryId } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    // Validate website if provided
    if (websiteId) {
      const website = await Website.findById(websiteId);
      if (!website) {
        return NextResponse.json(
          { success: false, error: 'Website not found' },
          { status: 404 }
        );
      }
    }

    // Prepare keywords for insertion
    const keywordsToInsert = keywords.map((kw: {
      keyword: string;
      volume?: number;
      difficulty?: number;
      cpc?: number;
      intent?: string;
      topic?: string;
      clusterId?: string;
      parentKeyword?: string;
      priority?: string;
    }) => ({
      keyword: kw.keyword,
      volume: kw.volume || 0,
      difficulty: kw.difficulty || 0,
      cpc: kw.cpc || 0,
      intent: kw.intent || 'informational',
      topic: kw.topic,
      clusterId: kw.clusterId,
      parentKeyword: kw.parentKeyword,
      websiteId: websiteId ? new mongoose.Types.ObjectId(websiteId) : undefined,
      categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
      status: 'new',
      priority: kw.priority || 'medium',
      source: 'manual',
    }));

    // Use insertMany with ordered: false to continue on duplicates
    const result = await Keyword.insertMany(keywordsToInsert, {
      ordered: false,
    }).catch((error) => {
      // Handle duplicate key errors
      if (error.code === 11000) {
        return { insertedCount: error.result?.nInserted || 0 };
      }
      throw error;
    });

    const insertedCount = Array.isArray(result) ? result.length : (result as { insertedCount: number }).insertedCount;

    return NextResponse.json({
      success: true,
      data: {
        inserted: insertedCount,
        total: keywords.length,
      },
      message: `Added ${insertedCount} new keywords`,
    });
  } catch (error) {
    console.error('Error adding keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add keywords' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete keywords
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keyword IDs are required' },
        { status: 400 }
      );
    }

    const result = await Keyword.deleteMany({
      _id: { $in: ids.map((id: string) => new mongoose.Types.ObjectId(id)) },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} keywords`,
    });
  } catch (error) {
    console.error('Error deleting keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete keywords' },
      { status: 500 }
    );
  }
}

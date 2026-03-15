import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content, Website, Keyword } from '@/models';
import mongoose from 'mongoose';

// GET - List content with filters and pagination
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const websiteId = searchParams.get('websiteId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const authorName = searchParams.get('authorName');
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: Record<string, unknown> = {};

    if (websiteId) {
      query.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (authorName) {
      query.authorName = { $regex: authorName, $options: 'i' };
    }

    if (categoryId) {
      query.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [content, total] = await Promise.all([
      Content.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('websiteId', 'name domain')
        .populate('keywordId', 'keyword volume')
        .populate('categoryId', 'name slug')
        .lean(),
      Content.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// POST - Create new content
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, title, slug, type = 'blog_post', status = 'draft' } = body;

    if (!websiteId || !title) {
      return NextResponse.json(
        { success: false, error: 'Website ID and title are required' },
        { status: 400 }
      );
    }

    // Validate website
    const website = await Website.findById(websiteId);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Generate slug if not provided
    const contentSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existingContent = await Content.findOne({
      websiteId: new mongoose.Types.ObjectId(websiteId),
      slug: contentSlug,
    });

    if (existingContent) {
      return NextResponse.json(
        { success: false, error: 'Content with this slug already exists' },
        { status: 400 }
      );
    }

    // Strip HTML for accurate word count
    const rawBody = body.content || body.body || '';
    const plainText = rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText ? plainText.split(/\s+/).length : 0;

    // Truncate meta fields to fit model constraints
    const metaTitle = (body.metaTitle || body.seo?.metaTitle || '')?.slice(0, 70) || undefined;
    const metaDescription = (body.metaDescription || body.seo?.metaDescription || '')?.slice(0, 160) || undefined;

    const content = await Content.create({
      websiteId: new mongoose.Types.ObjectId(websiteId),
      title,
      slug: contentSlug,
      type,
      status,
      excerpt: body.excerpt,
      body: rawBody,
      featuredImage: body.featuredImage,
      metaTitle,
      metaDescription,
      authorName: body.authorName || body.author || 'Admin',
      keywordId: body.keywordId
        ? new mongoose.Types.ObjectId(body.keywordId)
        : undefined,
      focusKeyword: body.focusKeyword,
      secondaryKeywords: body.secondaryKeywords || [],
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : (status === 'published' ? new Date() : undefined),
      internalLinks: body.internalLinks || [],
      outboundLinks: body.externalLinks || [],
      categoryId: body.categoryId ? new mongoose.Types.ObjectId(body.categoryId) : undefined,
      tags: body.tags || [],
      isAiGenerated: body.isAiGenerated || false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      schemaMarkup: body.schemaMarkup || undefined,
      wordCount,
      readingTime: Math.ceil(wordCount / 200),
    });

    // Update keyword status if assigned
    if (body.keywordId) {
      await Keyword.findByIdAndUpdate(body.keywordId, {
        status: 'assigned',
        contentId: content._id,
      });
    }

    return NextResponse.json({
      success: true,
      data: content,
      message: 'Content created successfully',
    });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create content' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete content
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content IDs are required' },
        { status: 400 }
      );
    }

    // Get content to find associated keywords
    const content = await Content.find({
      _id: { $in: ids.map((id: string) => new mongoose.Types.ObjectId(id)) },
    }).lean();

    // Reset keyword statuses
    const keywordIds = content
      .map((c) => c.keywordId)
      .filter((id) => id);

    if (keywordIds.length > 0) {
      await Keyword.updateMany(
        { _id: { $in: keywordIds } },
        { $set: { status: 'new', contentId: null } }
      );
    }

    const result = await Content.deleteMany({
      _id: { $in: ids.map((id: string) => new mongoose.Types.ObjectId(id)) },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} content items`,
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}

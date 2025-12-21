import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GuestPost, Website } from '@/models';
import mongoose from 'mongoose';
import { isValidObjectId, isValidUrl, sanitizeString } from '@/lib/security';

// Allowed sort fields
const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'status', 'price', 'expiresAt'];

// GET - List guest posts with filters and pagination
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const websiteId = searchParams.get('websiteId');
    const partnerId = searchParams.get('partnerId');
    const status = searchParams.get('status');
    const expiringDays = searchParams.get('expiringDays');
    const sortByParam = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate sortBy
    const sortBy = ALLOWED_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'createdAt';

    const query: Record<string, unknown> = {};

    if (websiteId) {
      if (!isValidObjectId(websiteId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid website ID format' },
          { status: 400 }
        );
      }
      query.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    if (partnerId) {
      if (!isValidObjectId(partnerId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid partner ID format' },
          { status: 400 }
        );
      }
      query.partnerId = new mongoose.Types.ObjectId(partnerId);
    }

    if (status) {
      if (status === 'pending') {
        query.status = {
          $in: ['content_pending', 'content_submitted', 'under_review', 'revision_requested'],
        };
      } else if (status === 'active') {
        query.status = 'published';
        query.$or = [
          { hasExpiry: false },
          { expiresAt: { $gt: new Date() } },
        ];
      } else {
        query.status = status;
      }
    }

    // Filter by expiring within X days
    if (expiringDays) {
      const days = parseInt(expiringDays);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      query.hasExpiry = true;
      query.status = 'published';
      query.expiresAt = {
        $gte: new Date(),
        $lte: futureDate,
      };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [guestPosts, total] = await Promise.all([
      GuestPost.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('websiteId', 'name domain da dr')
        .populate('partnerId', 'companyName contactName email')
        .populate('orderId', 'orderNumber totalAmount')
        .lean(),
      GuestPost.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: guestPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching guest posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guest posts' },
      { status: 500 }
    );
  }
}

// POST - Create a new guest post (usually from order)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      orderId,
      websiteId,
      partnerId,
      targetUrl,
      anchorText,
      isDoFollow = true,
      additionalLinks = [],
      price,
      hasExpiry = false,
      expiryDays,
      expiryAction = 'nofollow',
    } = body;

    // Validate required fields and formats
    if (!orderId || !isValidObjectId(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Valid order ID is required' },
        { status: 400 }
      );
    }

    if (!websiteId || !isValidObjectId(websiteId)) {
      return NextResponse.json(
        { success: false, error: 'Valid website ID is required' },
        { status: 400 }
      );
    }

    if (!partnerId || !isValidObjectId(partnerId)) {
      return NextResponse.json(
        { success: false, error: 'Valid partner ID is required' },
        { status: 400 }
      );
    }

    if (!targetUrl || !isValidUrl(targetUrl)) {
      return NextResponse.json(
        { success: false, error: 'Valid target URL is required' },
        { status: 400 }
      );
    }

    if (!anchorText || anchorText.length < 1 || anchorText.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Anchor text is required (1-200 characters)' },
        { status: 400 }
      );
    }

    // Validate additional links if provided
    if (additionalLinks && Array.isArray(additionalLinks)) {
      for (const link of additionalLinks) {
        if (link.url && !isValidUrl(link.url)) {
          return NextResponse.json(
            { success: false, error: 'All additional link URLs must be valid' },
            { status: 400 }
          );
        }
      }
    }

    // Validate website
    const website = await Website.findById(websiteId);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Calculate expiry date if applicable
    let expiresAt;
    if (hasExpiry && expiryDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
    }

    // Sanitize anchor text
    const sanitizedAnchorText = sanitizeString(anchorText).substring(0, 200);

    const guestPost = await GuestPost.create({
      orderId: new mongoose.Types.ObjectId(orderId),
      websiteId: new mongoose.Types.ObjectId(websiteId),
      partnerId: new mongoose.Types.ObjectId(partnerId),
      targetUrl,
      anchorText: sanitizedAnchorText,
      isDoFollow,
      additionalLinks,
      price: price || website.guestPostPrice,
      hasExpiry,
      expiryDays,
      expiresAt,
      expiryAction,
      status: 'paid',
      statusHistory: [
        { status: 'pending_payment', changedAt: new Date() },
        { status: 'paid', changedAt: new Date() },
      ],
    });

    return NextResponse.json({
      success: true,
      data: guestPost,
      message: 'Guest post created successfully',
    });
  } catch (error) {
    console.error('Error creating guest post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create guest post' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete guest posts
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Guest post IDs are required' },
        { status: 400 }
      );
    }

    // Validate and filter IDs
    const validIds = ids.filter((id: string) => isValidObjectId(id));
    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid guest post IDs provided' },
        { status: 400 }
      );
    }

    // Limit bulk delete
    if (validIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete more than 100 guest posts at once' },
        { status: 400 }
      );
    }

    const result = await GuestPost.deleteMany({
      _id: { $in: validIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} guest posts`,
    });
  } catch (error) {
    console.error('Error deleting guest posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete guest posts' },
      { status: 500 }
    );
  }
}

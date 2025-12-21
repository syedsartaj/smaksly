import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Commission, Partner } from '@/models';
import mongoose from 'mongoose';
import { isValidObjectId, sanitizeString } from '@/lib/security';

// Allowed sort fields
const ALLOWED_SORT_FIELDS = ['createdAt', 'commissionAmount', 'orderAmount', 'status'];
// Valid status values
const VALID_STATUSES = ['pending', 'approved', 'paid', 'cancelled', 'on_hold'];
// Valid commission types
const VALID_TYPES = ['guest_post_sale', 'referral', 'bonus'];

// GET - List commissions with filters
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const partnerId = searchParams.get('partnerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortByParam = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate sortBy
    const sortBy = ALLOWED_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'createdAt';

    const query: Record<string, unknown> = {};

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
      // Validate status value
      if (VALID_STATUSES.includes(status)) {
        query.status = status;
      }
    }

    if (type) {
      // Validate type value
      if (VALID_TYPES.includes(type)) {
        query.type = type;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      // Validate date format
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) {
          (query.createdAt as Record<string, Date>).$gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) {
          (query.createdAt as Record<string, Date>).$lte = parsedEnd;
        }
      }
    }

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      Commission.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('partnerId', 'contactName companyName contactEmail')
        .populate('orderId', 'orderNumber')
        .populate('websiteId', 'name domain')
        .lean(),
      Commission.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: commissions.map((c) => ({
        ...c,
        orderAmount: c.orderAmount / 100,
        commissionAmount: c.commissionAmount / 100,
        platformFee: c.platformFee / 100,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commissions' },
      { status: 500 }
    );
  }
}

// POST - Create a commission manually (admin only)
// TODO: Add admin authentication middleware
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      partnerId,
      type,
      description,
      amount,
      commissionRate,
      orderId,
      websiteId,
    } = body;

    // Validate partnerId format
    if (!partnerId || !isValidObjectId(partnerId)) {
      return NextResponse.json(
        { success: false, error: 'Valid Partner ID is required' },
        { status: 400 }
      );
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Valid commission type is required (guest_post_sale, referral, bonus)' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number within reasonable bounds
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000000) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number up to 1,000,000' },
        { status: 400 }
      );
    }

    // Validate optional IDs
    if (orderId && !isValidObjectId(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    if (websiteId && !isValidObjectId(websiteId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid website ID format' },
        { status: 400 }
      );
    }

    // Get partner for commission rate
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Validate commission rate if provided
    let rate = partner.customCommissionRate ?? partner.commissionRate ?? 70;
    if (commissionRate !== undefined) {
      const parsedRate = parseFloat(commissionRate);
      if (!isNaN(parsedRate) && parsedRate >= 0 && parsedRate <= 100) {
        rate = parsedRate;
      }
    }

    const amountCents = Math.round(parsedAmount * 100);
    const commissionAmount = Math.round(amountCents * (rate / 100));
    const platformFee = amountCents - commissionAmount;

    // Sanitize description
    const sanitizedDescription = description
      ? sanitizeString(description).substring(0, 500)
      : `${type.replace(/_/g, ' ')} commission`;

    const commission = await Commission.create({
      partnerId: new mongoose.Types.ObjectId(partnerId),
      orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
      websiteId: websiteId ? new mongoose.Types.ObjectId(websiteId) : undefined,
      type,
      description: sanitizedDescription,
      orderAmount: amountCents,
      commissionRate: rate,
      commissionAmount,
      platformFee,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          changedAt: new Date(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: {
        ...commission.toObject(),
        orderAmount: commission.orderAmount / 100,
        commissionAmount: commission.commissionAmount / 100,
        platformFee: commission.platformFee / 100,
      },
      message: 'Commission created successfully',
    });
  } catch (error) {
    console.error('Error creating commission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create commission' },
      { status: 500 }
    );
  }
}

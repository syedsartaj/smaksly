import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Payout, Commission, Partner } from '@/models';
import mongoose from 'mongoose';

// GET - List payouts
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const partnerId = searchParams.get('partnerId');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const query: Record<string, unknown> = {};

    if (partnerId) {
      query.partnerId = new mongoose.Types.ObjectId(partnerId);
    }

    if (status) {
      query.status = status;
    }

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      Payout.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('partnerId', 'contactName companyName contactEmail tier stripeAccountId')
        .lean(),
      Payout.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: payouts.map((p) => ({
        ...p,
        totalAmount: p.totalAmount / 100,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}

// POST - Create a payout (batch approved commissions)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { partnerId, payoutMethod, commissionIds } = body;

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    if (!payoutMethod || !['stripe', 'paypal', 'bank_transfer', 'crypto'].includes(payoutMethod)) {
      return NextResponse.json(
        { success: false, error: 'Valid payout method is required' },
        { status: 400 }
      );
    }

    // Get partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Check if partner has Stripe connected for Stripe payouts
    if (payoutMethod === 'stripe' && !partner.stripeAccountId) {
      return NextResponse.json(
        { success: false, error: 'Partner must connect Stripe account for Stripe payouts' },
        { status: 400 }
      );
    }

    // Get approved commissions
    const commissionsQuery: Record<string, unknown> = {
      partnerId: new mongoose.Types.ObjectId(partnerId),
      status: 'approved',
      payoutId: { $exists: false },
    };

    if (commissionIds && Array.isArray(commissionIds) && commissionIds.length > 0) {
      commissionsQuery._id = {
        $in: commissionIds.map((id: string) => new mongoose.Types.ObjectId(id)),
      };
    }

    const commissions = await Commission.find(commissionsQuery);

    if (commissions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No approved commissions found for payout' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    // Minimum payout threshold (e.g., $50)
    const minPayout = 5000; // $50 in cents
    if (totalAmount < minPayout) {
      return NextResponse.json(
        { success: false, error: `Minimum payout amount is $${minPayout / 100}` },
        { status: 400 }
      );
    }

    // Create payout
    const payout = await Payout.create({
      partnerId: new mongoose.Types.ObjectId(partnerId),
      totalAmount,
      commissionIds: commissions.map((c) => c._id),
      commissionCount: commissions.length,
      status: 'pending',
      payoutMethod,
    });

    // Update commissions with payout reference
    await Commission.updateMany(
      { _id: { $in: commissions.map((c) => c._id) } },
      {
        $set: {
          payoutId: payout._id,
          payoutMethod,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        id: payout._id,
        totalAmount: payout.totalAmount / 100,
        commissionCount: payout.commissionCount,
        payoutMethod: payout.payoutMethod,
        status: payout.status,
      },
      message: 'Payout created successfully. Ready for processing.',
    });
  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payout' },
      { status: 500 }
    );
  }
}

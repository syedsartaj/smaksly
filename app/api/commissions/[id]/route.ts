import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Commission } from '@/models';

// GET - Get single commission
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const commission = await Commission.findById(id)
      .populate('partnerId', 'contactName companyName contactEmail tier')
      .populate('orderId', 'orderNumber status')
      .populate('websiteId', 'name domain')
      .populate('guestPostId', 'title status')
      .populate('payoutId', 'status totalAmount')
      .lean();

    if (!commission) {
      return NextResponse.json(
        { success: false, error: 'Commission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...commission,
        orderAmount: commission.orderAmount / 100,
        commissionAmount: commission.commissionAmount / 100,
        platformFee: commission.platformFee / 100,
      },
    });
  } catch (error) {
    console.error('Error fetching commission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commission' },
      { status: 500 }
    );
  }
}

// PUT - Update commission status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { action, reason, holdUntil } = body;

    const commission = await Commission.findById(id);
    if (!commission) {
      return NextResponse.json(
        { success: false, error: 'Commission not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'approve':
        if (commission.status !== 'pending' && commission.status !== 'on_hold') {
          return NextResponse.json(
            { success: false, error: 'Can only approve pending or on-hold commissions' },
            { status: 400 }
          );
        }
        commission.status = 'approved';
        commission.approvedAt = new Date();
        commission.holdReason = undefined;
        commission.holdUntil = undefined;
        break;

      case 'hold':
        if (commission.status === 'paid' || commission.status === 'cancelled') {
          return NextResponse.json(
            { success: false, error: 'Cannot hold paid or cancelled commissions' },
            { status: 400 }
          );
        }
        commission.status = 'on_hold';
        commission.holdReason = reason;
        commission.holdUntil = holdUntil ? new Date(holdUntil) : undefined;
        break;

      case 'cancel':
        if (commission.status === 'paid') {
          return NextResponse.json(
            { success: false, error: 'Cannot cancel paid commissions' },
            { status: 400 }
          );
        }
        commission.status = 'cancelled';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Add to status history
    commission.statusHistory.push({
      status: commission.status,
      changedAt: new Date(),
      reason,
    });

    await commission.save();

    return NextResponse.json({
      success: true,
      data: {
        id: commission._id,
        status: commission.status,
        approvedAt: commission.approvedAt,
        holdReason: commission.holdReason,
        holdUntil: commission.holdUntil,
      },
      message: `Commission ${action}d successfully`,
    });
  } catch (error) {
    console.error('Error updating commission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update commission' },
      { status: 500 }
    );
  }
}

// DELETE - Delete commission (only pending ones)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const commission = await Commission.findById(id);
    if (!commission) {
      return NextResponse.json(
        { success: false, error: 'Commission not found' },
        { status: 404 }
      );
    }

    if (commission.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Can only delete pending commissions' },
        { status: 400 }
      );
    }

    await Commission.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Commission deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting commission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete commission' },
      { status: 500 }
    );
  }
}

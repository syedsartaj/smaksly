import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Payout, Commission, Partner } from '@/models';

// GET - Get single payout with details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const payout = await Payout.findById(id)
      .populate('partnerId', 'contactName companyName contactEmail tier stripeAccountId')
      .populate({
        path: 'commissionIds',
        select: 'type description orderAmount commissionAmount status createdAt',
      })
      .lean();

    if (!payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    // commissionIds is populated so it contains full commission objects
    const commissions = payout.commissionIds as unknown as Array<{
      _id: string;
      type: string;
      description: string;
      orderAmount: number;
      commissionAmount: number;
      status: string;
      createdAt: Date;
    }>;

    return NextResponse.json({
      success: true,
      data: {
        ...payout,
        totalAmount: payout.totalAmount / 100,
        commissions: commissions.map((c) => ({
          ...c,
          orderAmount: c.orderAmount / 100,
          commissionAmount: c.commissionAmount / 100,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching payout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payout' },
      { status: 500 }
    );
  }
}

// PUT - Update payout status (process, complete, fail)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { action, transactionReference, failureReason } = body;

    const payout = await Payout.findById(id);
    if (!payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'process':
        if (payout.status !== 'pending') {
          return NextResponse.json(
            { success: false, error: 'Can only process pending payouts' },
            { status: 400 }
          );
        }
        payout.status = 'processing';
        payout.processedAt = new Date();
        break;

      case 'complete':
        if (payout.status !== 'processing') {
          return NextResponse.json(
            { success: false, error: 'Can only complete payouts that are being processed' },
            { status: 400 }
          );
        }

        if (!transactionReference) {
          return NextResponse.json(
            { success: false, error: 'Transaction reference is required' },
            { status: 400 }
          );
        }

        payout.status = 'completed';
        payout.transactionReference = transactionReference;
        payout.completedAt = new Date();

        // Update all associated commissions to paid
        await Commission.updateMany(
          { _id: { $in: payout.commissionIds } },
          {
            $set: {
              status: 'paid',
              paidAt: new Date(),
            },
            $push: {
              statusHistory: {
                status: 'paid',
                changedAt: new Date(),
                reason: `Payout ${id} completed`,
              },
            },
          }
        );

        // Update partner total earnings
        await Partner.findByIdAndUpdate(payout.partnerId, {
          $inc: { totalEarnings: payout.totalAmount },
        });

        break;

      case 'fail':
        if (payout.status !== 'processing') {
          return NextResponse.json(
            { success: false, error: 'Can only fail payouts that are being processed' },
            { status: 400 }
          );
        }

        payout.status = 'failed';
        payout.failureReason = failureReason || 'Payout processing failed';
        payout.retryCount = (payout.retryCount || 0) + 1;

        // Remove payout reference from commissions so they can be included in another payout
        await Commission.updateMany(
          { _id: { $in: payout.commissionIds } },
          {
            $unset: { payoutId: 1, payoutMethod: 1 },
          }
        );

        break;

      case 'retry':
        if (payout.status !== 'failed') {
          return NextResponse.json(
            { success: false, error: 'Can only retry failed payouts' },
            { status: 400 }
          );
        }

        if (payout.retryCount >= 3) {
          return NextResponse.json(
            { success: false, error: 'Maximum retry attempts reached' },
            { status: 400 }
          );
        }

        payout.status = 'pending';
        payout.failureReason = undefined;
        payout.processedAt = undefined;

        // Re-associate commissions with payout
        await Commission.updateMany(
          { _id: { $in: payout.commissionIds } },
          {
            $set: {
              payoutId: payout._id,
              payoutMethod: payout.payoutMethod,
            },
          }
        );

        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    await payout.save();

    return NextResponse.json({
      success: true,
      data: {
        id: payout._id,
        status: payout.status,
        transactionReference: payout.transactionReference,
        failureReason: payout.failureReason,
        processedAt: payout.processedAt,
        completedAt: payout.completedAt,
      },
      message: `Payout ${action} successful`,
    });
  } catch (error) {
    console.error('Error updating payout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payout' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel pending payout
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const payout = await Payout.findById(id);
    if (!payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    if (payout.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Can only cancel pending payouts' },
        { status: 400 }
      );
    }

    // Remove payout reference from commissions
    await Commission.updateMany(
      { _id: { $in: payout.commissionIds } },
      {
        $unset: { payoutId: 1, payoutMethod: 1 },
      }
    );

    await Payout.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Payout cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling payout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel payout' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Payout, Commission } from '@/models';

// GET - Payout statistics
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const [
      payoutStats,
      byStatus,
      byMethod,
      pendingByPartner,
      recentPayouts,
    ] = await Promise.all([
      // Overall payout statistics
      Payout.aggregate([
        {
          $group: {
            _id: null,
            totalPayouts: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            completedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0],
              },
            },
            processingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'processing'] }, '$totalAmount', 0],
              },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
          },
        },
      ]),

      // By status
      Payout.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
      ]),

      // By payout method
      Payout.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$payoutMethod',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
      ]),

      // Pending commissions by partner (ready for payout)
      Commission.aggregate([
        {
          $match: {
            status: 'approved',
            payoutId: { $exists: false },
          },
        },
        {
          $group: {
            _id: '$partnerId',
            totalAmount: { $sum: '$commissionAmount' },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'partners',
            localField: '_id',
            foreignField: '_id',
            as: 'partner',
          },
        },
        { $unwind: '$partner' },
        { $sort: { totalAmount: -1 } },
        { $limit: 20 },
      ]),

      // Recent payouts
      Payout.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('partnerId', 'contactName companyName')
        .lean(),
    ]);

    const overall = payoutStats[0] || {
      totalPayouts: 0,
      totalAmount: 0,
      completedAmount: 0,
      pendingAmount: 0,
      processingAmount: 0,
      failedCount: 0,
    };

    // Format status breakdown
    const statusBreakdown = byStatus.reduce(
      (acc: Record<string, { count: number; amount: number }>, item) => {
        acc[item._id] = {
          count: item.count,
          amount: item.amount / 100,
        };
        return acc;
      },
      {}
    );

    // Format method breakdown
    const methodBreakdown = byMethod.reduce(
      (acc: Record<string, { count: number; amount: number }>, item) => {
        acc[item._id] = {
          count: item.count,
          amount: item.amount / 100,
        };
        return acc;
      },
      {}
    );

    // Format pending by partner
    const pendingList = pendingByPartner.map((p) => ({
      partnerId: p._id,
      partnerName: p.partner.companyName || p.partner.contactName,
      tier: p.partner.tier,
      pendingAmount: p.totalAmount / 100,
      commissionCount: p.count,
    }));

    // Calculate total pending for payout
    const totalPendingForPayout = pendingByPartner.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          totalPayouts: overall.totalPayouts,
          totalAmount: overall.totalAmount / 100,
          completedAmount: overall.completedAmount / 100,
          pendingAmount: overall.pendingAmount / 100,
          processingAmount: overall.processingAmount / 100,
          failedCount: overall.failedCount,
        },
        pendingForPayout: {
          totalAmount: totalPendingForPayout / 100,
          partnerCount: pendingByPartner.length,
        },
        byStatus: statusBreakdown,
        byMethod: methodBreakdown,
        pendingByPartner: pendingList,
        recentPayouts: recentPayouts.map((p) => ({
          id: p._id,
          partner: p.partnerId,
          amount: p.totalAmount / 100,
          method: p.payoutMethod,
          status: p.status,
          createdAt: p.createdAt,
          completedAt: p.completedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching payout stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payout statistics' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Commission, Payout } from '@/models';
import mongoose from 'mongoose';

// GET - Commission statistics
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partnerId');
    const period = searchParams.get('period') || '30'; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const matchQuery: Record<string, unknown> = {};
    if (partnerId) {
      matchQuery.partnerId = new mongoose.Types.ObjectId(partnerId);
    }

    const [
      overallStats,
      periodStats,
      byStatus,
      byType,
      pendingPayouts,
      topPartners,
      monthlyTrend,
    ] = await Promise.all([
      // Overall statistics
      Commission.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalCommissions: { $sum: 1 },
            totalOrderAmount: { $sum: '$orderAmount' },
            totalCommissionAmount: { $sum: '$commissionAmount' },
            totalPlatformFee: { $sum: '$platformFee' },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0],
              },
            },
            approvedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0],
              },
            },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0],
              },
            },
          },
        },
      ]),

      // Period statistics
      Commission.aggregate([
        {
          $match: {
            ...matchQuery,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$commissionAmount' },
          },
        },
      ]),

      // By status
      Commission.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$commissionAmount' },
          },
        },
      ]),

      // By type
      Commission.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            amount: { $sum: '$commissionAmount' },
          },
        },
      ]),

      // Pending payouts (approved commissions not yet paid)
      Commission.aggregate([
        {
          $match: {
            ...matchQuery,
            status: 'approved',
            payoutId: { $exists: false },
          },
        },
        {
          $group: {
            _id: '$partnerId',
            pendingAmount: { $sum: '$commissionAmount' },
            commissionCount: { $sum: 1 },
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
        { $sort: { pendingAmount: -1 } },
        { $limit: 10 },
      ]),

      // Top earning partners
      Commission.aggregate([
        {
          $match: {
            ...matchQuery,
            status: { $in: ['approved', 'paid'] },
          },
        },
        {
          $group: {
            _id: '$partnerId',
            totalEarnings: { $sum: '$commissionAmount' },
            commissionCount: { $sum: 1 },
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
        { $sort: { totalEarnings: -1 } },
        { $limit: 10 },
      ]),

      // Monthly trend (last 6 months)
      Commission.aggregate([
        {
          $match: {
            ...matchQuery,
            createdAt: {
              $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            totalAmount: { $sum: '$commissionAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const overall = overallStats[0] || {
      totalCommissions: 0,
      totalOrderAmount: 0,
      totalCommissionAmount: 0,
      totalPlatformFee: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
    };

    const periodData = periodStats[0] || { count: 0, totalAmount: 0 };

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

    // Format type breakdown
    const typeBreakdown = byType.reduce(
      (acc: Record<string, { count: number; amount: number }>, item) => {
        acc[item._id] = {
          count: item.count,
          amount: item.amount / 100,
        };
        return acc;
      },
      {}
    );

    // Format pending payouts
    const pendingPayoutsList = pendingPayouts.map((p) => ({
      partnerId: p._id,
      partnerName: p.partner.companyName || p.partner.contactName,
      pendingAmount: p.pendingAmount / 100,
      commissionCount: p.commissionCount,
    }));

    // Format top partners
    const topPartnersList = topPartners.map((p) => ({
      partnerId: p._id,
      partnerName: p.partner.companyName || p.partner.contactName,
      tier: p.partner.tier,
      totalEarnings: p.totalEarnings / 100,
      commissionCount: p.commissionCount,
    }));

    // Format monthly trend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend = monthlyTrend.map((m) => ({
      month: months[m._id.month - 1],
      year: m._id.year,
      amount: m.totalAmount / 100,
      count: m.count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          totalCommissions: overall.totalCommissions,
          totalOrderAmount: overall.totalOrderAmount / 100,
          totalCommissionAmount: overall.totalCommissionAmount / 100,
          totalPlatformFee: overall.totalPlatformFee / 100,
          pendingAmount: overall.pendingAmount / 100,
          approvedAmount: overall.approvedAmount / 100,
          paidAmount: overall.paidAmount / 100,
          averageCommissionRate: overall.totalOrderAmount > 0
            ? Math.round((overall.totalCommissionAmount / overall.totalOrderAmount) * 100)
            : 0,
        },
        period: {
          days: parseInt(period),
          count: periodData.count,
          amount: periodData.totalAmount / 100,
        },
        byStatus: statusBreakdown,
        byType: typeBreakdown,
        pendingPayouts: pendingPayoutsList,
        topPartners: topPartnersList,
        monthlyTrend: trend,
      },
    });
  } catch (error) {
    console.error('Error fetching commission stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commission statistics' },
      { status: 500 }
    );
  }
}

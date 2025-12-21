import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, GuestPost } from '@/models';
import { getPartnerSession } from '@/lib/partner-auth';
import mongoose from 'mongoose';

// GET - Get partner order statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const partnerId = new mongoose.Types.ObjectId(session.partnerId);

    // Get order stats
    const [
      orderStats,
      guestPostStats,
      recentOrders,
      monthlySpend,
    ] = await Promise.all([
      // Order statistics
      Order.aggregate([
        { $match: { partnerId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0],
              },
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            processingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] },
            },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
            },
          },
        },
      ]),

      // Guest post statistics
      GuestPost.aggregate([
        { $match: { partnerId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            inReview: { $sum: { $cond: [{ $eq: ['$status', 'in_review'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
            live: { $sum: { $cond: [{ $eq: ['$status', 'live'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            revisionRequired: { $sum: { $cond: [{ $eq: ['$status', 'revision_required'] }, 1, 0] } },
          },
        },
      ]),

      // Recent orders
      Order.find({ partnerId })
        .select('orderNumber status paymentStatus total createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Monthly spend (last 6 months)
      Order.aggregate([
        {
          $match: {
            partnerId,
            paymentStatus: 'paid',
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
            total: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };

    const gpStats = guestPostStats[0] || {
      total: 0,
      pending: 0,
      inReview: 0,
      approved: 0,
      published: 0,
      live: 0,
      rejected: 0,
      revisionRequired: 0,
    };

    // Format monthly spend for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlySpend = monthlySpend.map((m) => ({
      month: months[m._id.month - 1],
      year: m._id.year,
      total: m.total / 100,
      count: m.count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        orders: {
          total: stats.totalOrders,
          pending: stats.pendingOrders,
          processing: stats.processingOrders,
          completed: stats.completedOrders,
          cancelled: stats.cancelledOrders,
        },
        spending: {
          total: stats.totalSpent / 100,
          average: stats.totalOrders > 0 ? stats.totalSpent / stats.totalOrders / 100 : 0,
        },
        guestPosts: {
          total: gpStats.total,
          pending: gpStats.pending,
          inReview: gpStats.inReview,
          approved: gpStats.approved,
          published: gpStats.published,
          live: gpStats.live,
          rejected: gpStats.rejected,
          revisionRequired: gpStats.revisionRequired,
          activeRate: gpStats.total > 0
            ? Math.round(((gpStats.published + gpStats.live) / gpStats.total) * 100)
            : 0,
        },
        recentOrders: recentOrders.map((o) => ({
          id: o._id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          total: o.total / 100,
          createdAt: o.createdAt,
        })),
        monthlySpend: formattedMonthlySpend,
      },
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order statistics' },
      { status: 500 }
    );
  }
}

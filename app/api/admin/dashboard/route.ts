import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models/Website';
import { Content } from '@/models/Content';
import { GuestPost } from '@/models/GuestPost';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      // Website stats
      totalWebsites,
      activeWebsites,
      pendingWebsites,
      websiteMetrics,
      domainsExpiringSoon,
      domainsExpired,
      providerDistribution,

      // Content stats
      totalContent,
      publishedContent,
      draftContent,
      scheduledContent,
      aiGeneratedContent,
      contentThisWeek,
      contentThisMonth,
      contentByType,
      contentMonthly,

      // Guest post stats
      totalGuestPosts,
      publishedGuestPosts,
      pendingGuestPosts,
      expiringGuestPosts,
      expiredGuestPosts,

      // Recent content
      recentContent,

      // Keyword count
      keywordCount,
    ] = await Promise.all([
      // Websites
      Website.countDocuments(),
      Website.countDocuments({ status: 'active' }),
      Website.countDocuments({ status: 'pending' }),
      Website.aggregate([
        { $group: {
          _id: null,
          avgDa: { $avg: '$da' },
          avgDr: { $avg: '$dr' },
          totalTraffic: { $sum: '$traffic' },
          avgTraffic: { $avg: '$traffic' },
          gscConnected: { $sum: { $cond: ['$gscConnected', 1, 0] } },
        }},
      ]),
      Website.countDocuments({
        domainExpiryDate: { $gte: now, $lte: thirtyDaysFromNow },
      }),
      Website.countDocuments({
        domainExpiryDate: { $lt: now, $exists: true, $ne: null },
      }),
      Website.aggregate([
        { $match: { domainProvider: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$domainProvider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),

      // Content
      Content.countDocuments(),
      Content.countDocuments({ status: 'published' }),
      Content.countDocuments({ status: 'draft' }),
      Content.countDocuments({ status: 'scheduled' }),
      Content.countDocuments({ isAiGenerated: true }),
      Content.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Content.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Content.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Content.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          words: { $sum: '$wordCount' },
        }},
        { $sort: { _id: 1 } },
      ]),

      // Guest posts (from Content model type=guest_post)
      Content.countDocuments({ type: 'guest_post' }),
      Content.countDocuments({ type: 'guest_post', status: 'published' }),
      Content.countDocuments({ type: 'guest_post', status: 'draft' }),
      Content.countDocuments({
        type: 'guest_post',
        status: 'published',
        expiresAt: { $gte: now, $lte: threeDaysFromNow },
      }),
      Content.countDocuments({
        type: 'guest_post',
        status: 'published',
        expiresAt: { $lt: now },
      }),

      // Recent content
      Content.find({}, {
        title: 1, status: 1, type: 1, websiteId: 1, createdAt: 1, publishedAt: 1, isAiGenerated: 1,
      })
        .populate('websiteId', 'name domain')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Keywords
      mongoose.models.KeywordMaster
        ? mongoose.models.KeywordMaster.countDocuments()
        : Promise.resolve(0),
    ]);

    // Try to get uptime stats
    let uptimeStats = { avgUptime: 99.9, totalChecks: 0, downCount: 0, avgLatency: 0 };
    try {
      if (mongoose.models.UptimeLog) {
        const uptimeAgg = await mongoose.models.UptimeLog.aggregate([
          { $match: { checkedAt: { $gte: thirtyDaysAgo } } },
          { $group: {
            _id: null,
            totalChecks: { $sum: 1 },
            upChecks: { $sum: { $cond: ['$isUp', 1, 0] } },
            avgLatency: { $avg: '$latencyMs' },
          }},
        ]);
        if (uptimeAgg.length > 0) {
          const u = uptimeAgg[0];
          uptimeStats = {
            avgUptime: u.totalChecks > 0 ? parseFloat(((u.upChecks / u.totalChecks) * 100).toFixed(1)) : 99.9,
            totalChecks: u.totalChecks,
            downCount: u.totalChecks - u.upChecks,
            avgLatency: Math.round(u.avgLatency || 0),
          };
        }
      }
    } catch { /* UptimeLog may not exist yet */ }

    // Try to get order/revenue stats
    let revenueStats = { totalRevenue: 0, pendingOrders: 0, totalOrders: 0, avgOrderValue: 0 };
    try {
      if (mongoose.models.Order) {
        const orderAgg = await mongoose.models.Order.aggregate([
          { $group: {
            _id: null,
            totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
            totalOrders: { $sum: 1 },
            pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          }},
        ]);
        if (orderAgg.length > 0) {
          const o = orderAgg[0];
          revenueStats = {
            totalRevenue: o.totalRevenue || 0,
            pendingOrders: o.pendingOrders || 0,
            totalOrders: o.totalOrders || 0,
            avgOrderValue: o.totalOrders > 0 ? Math.round(o.totalRevenue / o.totalOrders) : 0,
          };
        }
      }
    } catch { /* Order may not exist yet */ }

    // Try partner count
    let partnerCount = 0;
    try {
      if (mongoose.models.Partner) {
        partnerCount = await mongoose.models.Partner.countDocuments({ status: 'active' });
      }
    } catch { /* ignore */ }

    // Alerts
    const alerts: { type: string; severity: string; message: string; link: string }[] = [];

    if (domainsExpired > 0) {
      alerts.push({ type: 'domain', severity: 'critical', message: `${domainsExpired} domain${domainsExpired > 1 ? 's' : ''} expired`, link: '/admin/domains' });
    }
    if (domainsExpiringSoon > 0) {
      alerts.push({ type: 'domain', severity: 'warning', message: `${domainsExpiringSoon} domain${domainsExpiringSoon > 1 ? 's' : ''} expiring within 30 days`, link: '/admin/domains' });
    }
    if (expiringGuestPosts > 0) {
      alerts.push({ type: 'guest_post', severity: 'warning', message: `${expiringGuestPosts} guest post${expiringGuestPosts > 1 ? 's' : ''} expiring within 3 days`, link: '/admin/guest-posts' });
    }
    if (expiredGuestPosts > 0) {
      alerts.push({ type: 'guest_post', severity: 'critical', message: `${expiredGuestPosts} guest post${expiredGuestPosts > 1 ? 's' : ''} expired (still published)`, link: '/admin/guest-posts' });
    }
    if (uptimeStats.downCount > 0) {
      alerts.push({ type: 'uptime', severity: 'critical', message: `${uptimeStats.downCount} downtime incidents in last 30 days`, link: '/admin/seo' });
    }
    if (scheduledContent > 0) {
      alerts.push({ type: 'content', severity: 'info', message: `${scheduledContent} post${scheduledContent > 1 ? 's' : ''} scheduled for publishing`, link: '/admin/posts' });
    }
    if (draftContent > 0) {
      alerts.push({ type: 'content', severity: 'info', message: `${draftContent} draft${draftContent > 1 ? 's' : ''} waiting to be published`, link: '/admin/posts' });
    }

    const metrics = websiteMetrics[0] || { avgDa: 0, avgDr: 0, totalTraffic: 0, avgTraffic: 0, gscConnected: 0 };

    return NextResponse.json({
      success: true,
      data: {
        // Top stats
        websites: { total: totalWebsites, active: activeWebsites, pending: pendingWebsites },
        content: {
          total: totalContent,
          published: publishedContent,
          draft: draftContent,
          scheduled: scheduledContent,
          aiGenerated: aiGeneratedContent,
          manualCount: totalContent - aiGeneratedContent,
          aiRatio: totalContent > 0 ? Math.round((aiGeneratedContent / totalContent) * 100) : 0,
          thisWeek: contentThisWeek,
          thisMonth: contentThisMonth,
          byType: Object.fromEntries(contentByType.map((t) => [t._id, t.count])),
          monthlyTrend: contentMonthly,
        },
        guestPosts: {
          total: totalGuestPosts,
          published: publishedGuestPosts,
          pending: pendingGuestPosts,
          expiring: expiringGuestPosts,
          expired: expiredGuestPosts,
        },
        keywords: { total: keywordCount },
        revenue: revenueStats,
        partners: { active: partnerCount },
        network: {
          avgDa: Math.round(metrics.avgDa || 0),
          avgDr: Math.round(metrics.avgDr || 0),
          totalTraffic: metrics.totalTraffic || 0,
          avgTraffic: Math.round(metrics.avgTraffic || 0),
          gscConnected: metrics.gscConnected || 0,
        },
        uptime: uptimeStats,
        domains: {
          expiringSoon: domainsExpiringSoon,
          expired: domainsExpired,
          providers: providerDistribution.map((p) => ({ name: p._id, count: p.count })),
        },
        alerts,
        recentActivity: recentContent,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

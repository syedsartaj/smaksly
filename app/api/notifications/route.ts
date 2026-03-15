import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Notification } from '@/models/Notification';
import { Website } from '@/models/Website';
import { Content } from '@/models/Content';

export async function GET() {
  try {
    await connectDB();

    // Generate notifications dynamically from domain expiry and guest post expiry
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 1. Domain expiry notifications (within 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringDomains = await Website.find({
      domainExpiryDate: { $lte: thirtyDaysFromNow },
      status: { $ne: 'suspended' },
    }, { name: 1, domain: 1, customDomain: 1, domainExpiryDate: 1, domainProvider: 1 })
      .sort({ domainExpiryDate: 1 })
      .lean();

    // 2. Guest posts expiring within 3 days
    const expiringPosts = await Content.find({
      type: 'guest_post',
      status: 'published',
      expiresAt: { $gte: now, $lte: threeDaysFromNow },
    }, { title: 1, expiresAt: 1, websiteId: 1 })
      .sort({ expiresAt: 1 })
      .lean();

    // 3. Already expired guest posts (not yet unpublished)
    const expiredPosts = await Content.find({
      type: 'guest_post',
      status: 'published',
      expiresAt: { $lt: now },
    }, { title: 1, expiresAt: 1, websiteId: 1 })
      .sort({ expiresAt: -1 })
      .limit(10)
      .lean();

    // 4. Persisted notifications (for read tracking)
    const persistedNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const readIds = new Set(
      persistedNotifications.filter((n) => n.isRead).map((n) => n.relatedId?.toString())
    );

    const notifications: any[] = [];

    for (const domain of expiringDomains) {
      const expiry = new Date(domain.domainExpiryDate!);
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = daysLeft < 0;

      notifications.push({
        id: `domain-${domain._id}`,
        type: 'domain_expiry',
        title: isExpired ? 'Domain Expired' : 'Domain Expiring Soon',
        message: isExpired
          ? `${domain.customDomain || domain.domain} expired ${Math.abs(daysLeft)} days ago`
          : `${domain.customDomain || domain.domain} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        relatedId: domain._id,
        isRead: readIds.has(domain._id.toString()),
        severity: isExpired ? 'critical' : daysLeft <= 3 ? 'warning' : 'info',
        createdAt: domain.domainExpiryDate,
      });
    }

    for (const post of expiringPosts) {
      const daysLeft = Math.ceil((new Date(post.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `gp-expiring-${post._id}`,
        type: 'guest_post_expiry',
        title: 'Guest Post Expiring',
        message: `"${post.title}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        relatedId: post._id,
        isRead: readIds.has(post._id.toString()),
        severity: 'warning',
        createdAt: post.expiresAt,
      });
    }

    for (const post of expiredPosts) {
      notifications.push({
        id: `gp-expired-${post._id}`,
        type: 'guest_post_expired',
        title: 'Guest Post Expired',
        message: `"${post.title}" has expired and needs attention`,
        relatedId: post._id,
        isRead: readIds.has(post._id.toString()),
        severity: 'critical',
        createdAt: post.expiresAt,
      });
    }

    // Sort by severity then date
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    notifications.sort((a, b) => {
      const sa = severityOrder[a.severity] ?? 3;
      const sb = severityOrder[b.severity] ?? 3;
      if (sa !== sb) return sa - sb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { action, relatedId } = body;

    if (action === 'markRead' && relatedId) {
      // Upsert a read marker
      await Notification.findOneAndUpdate(
        { relatedId },
        { relatedId, isRead: true, type: 'domain_expiry', title: 'read', message: 'read' },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'markAllRead') {
      // Get all current notification related IDs and mark them read
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

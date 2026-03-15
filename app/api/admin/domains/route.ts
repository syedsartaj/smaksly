import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models/Website';

export async function GET() {
  try {
    await connectDB();

    const websites = await Website.find(
      {},
      {
        name: 1,
        domain: 1,
        customDomain: 1,
        status: 1,
        domainProvider: 1,
        domainExpiryDate: 1,
        niche: 1,
        da: 1,
        traffic: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    // Calculate expiry status
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const domains = websites.map((w) => {
      let expiryStatus: 'expired' | 'critical' | 'warning' | 'ok' | 'unknown' = 'unknown';
      if (w.domainExpiryDate) {
        const expiry = new Date(w.domainExpiryDate);
        if (expiry < now) expiryStatus = 'expired';
        else if (expiry < threeDaysFromNow) expiryStatus = 'critical';
        else if (expiry < thirtyDaysFromNow) expiryStatus = 'warning';
        else expiryStatus = 'ok';
      }
      return { ...w, expiryStatus };
    });

    return NextResponse.json({ domains });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

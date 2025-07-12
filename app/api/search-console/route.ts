import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  const type = req.nextUrl.searchParams.get('type'); // 'pages' or default
  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 });

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const rawDomain = domain.replace(/^https?:\/\//, ''); // remove https://
    const siteUrl = `sc-domain:${rawDomain}`;

    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        dimensions: type === 'pages' ? ['page'] : ['date'],
        dataState: 'all', // to include freshest data
        rowLimit: 50,
      },
    });

    const data = (res.data.rows || []).map((row) => {
      const keys = row.keys || [];
      return type === 'pages'
        ? {
            page: keys[0],
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          }
        : {
            date: keys[0],
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

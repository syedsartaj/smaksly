import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: NextRequest) {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/spreadsheets'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    const fetchDeployments = await fetch(`${process.env.BASE_URL}/api/fetch-deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'syedsartajahmed01@gmail.com' }),
    });
    const deploymentsData = await fetchDeployments.json();

    const rowsToWrite = [];

    for (const d of deploymentsData.deployments || []) {
      const domain = d.DOMAIN;
      if (!domain) continue;
      const rawDomain = domain.replace(/^https?:\/\//, '');
      const siteUrl = `sc-domain:${rawDomain}`;

      const pageAnalytics = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
          dimensions: ['page'],
          dataState: 'all',
        },
      });

      for (const row of pageAnalytics.data.rows || []) {
        const url = row.keys?.[0] || '';
        if (!url.includes('/blogpage/') || url.includes('vercel')) continue;

        const clicks = row.clicks || 0;
        const impressions = row.impressions || 0;

        if (clicks === 0 && impressions === 0) {
          const keywordSlug = url.split('/blogpage/')[1]?.split('/')[0];
          const keyword = keywordSlug?.replace(/-/g, ' ');
          if (keyword) {
            rowsToWrite.push([keyword, url, domain]);
          }
        }
      }
    }

    if (rowsToWrite.length) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Sheet1',
        valueInputOption: 'RAW',
        requestBody: {
          values: rowsToWrite,
        },
      });
    }

    return NextResponse.json({ message: `${rowsToWrite.length} rows added to the sheet.` });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Failed to fetch and log analytics' }, { status: 500 });
  }
}

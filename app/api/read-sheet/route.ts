import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const spreadsheetId = searchParams.get('spreadsheetId');

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'spreadsheetId is required' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient() as any;
    const sheets = google.sheets({ version: 'v4', auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = res.data.values || [];
    const headers = rows[0] || [];
    const data = rows.slice(1).map(row =>
      headers.reduce((obj, header, index) => {
        obj[header] = row[index] || '';
        return obj;
      }, {} as any)
    );

    return NextResponse.json({ sheet1: data });
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
  }
}
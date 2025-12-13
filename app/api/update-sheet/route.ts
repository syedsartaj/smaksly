import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { spreadsheetId, id, updates } = await req.json();

  if (!spreadsheetId || !id || !updates) {
    return NextResponse.json({ error: 'spreadsheetId, id, and updates are required' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = res.data.values || [];
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'No data found or headers missing in Sheet1' }, { status: 404 });
    }

    const headers = rows[0];
    const rowIndex = rows.findIndex(row => row[0] === String(id)) + 1;
    if (rowIndex <= 1) {
      return NextResponse.json({ error: 'Row with specified ID not found' }, { status: 404 });
    }

    const currentRow = rows[rowIndex - 1];
    const newRow = currentRow.map((cell, idx) => {
      const key = headers[idx];
      if (key === 'id' || key === 'robottxt_publish_date') return cell;
      return updates[key] ?? cell;
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [newRow] },
    });

    const updatedRowObject = headers.reduce((acc, key, i) => {
      acc[key] = newRow[i];
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ updatedRow: updatedRowObject });
  } catch (error: any) {
    console.error('Error updating sheet:', error);
    return NextResponse.json({ error: error.message || 'Failed to update data' }, { status: 500 });
  }
}

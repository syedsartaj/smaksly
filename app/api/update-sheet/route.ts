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

    const client = await auth.getClient() as any;
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Fetch existing data to find the row
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = res.data.values || [];
    if (rows.length < 1) {
      return NextResponse.json({ error: 'No data found in Sheet1' }, { status: 404 });
    }

    const headers = rows[0];
    const rowIndex = rows.findIndex(row => row[0] === id) + 1; // +1 for header row
    if (rowIndex <= 1) {
      return NextResponse.json({ error: 'Row with specified id not found' }, { status: 404 });
    }

    // Prepare the updated row
    const currentRow = rows[rowIndex - 1];
    const newRow = currentRow.map((cell, idx) =>
      idx === 0 ? id : updates[headers[idx]] || cell
    );

    // Update the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [newRow] },
    });

    return NextResponse.json({ updatedRow: newRow });
  } catch (error: any) {
    console.error('Error updating sheet:', error);
    return NextResponse.json({ error: error.message || 'Failed to update data' }, { status: 500 });
  }
}
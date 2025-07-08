// pages/api/delete-sheet.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { spreadsheetId, id } = await req.json();

  if (!spreadsheetId || !id) {
    return NextResponse.json({ error: 'Missing spreadsheetId or id' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1',
    });

    const rows = getRes.data.values || [];
    const header = rows[0];
    const rowIndex = rows.findIndex((row) => row[0] === id); // assuming ID is in column A

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting row:', error);
    return NextResponse.json({ error: 'Failed to delete row' }, { status: 500 });
  }
}

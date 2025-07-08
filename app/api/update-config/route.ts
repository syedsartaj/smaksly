import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value, id } = body;

    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL!;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const SPREADSHEET_ID = id;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient() as any;
    const sheets = google.sheets({ version: 'v4', auth: client });

    // 1. Read the existing row
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet2!A2:Q2',
    });

    let row = readRes.data.values?.[0] || new Array(13).fill('');
    const columns = [
      'Header', 'Hero', 'Heading', 'Subheading', 'ButtonText',
      'Footer', 'companyName', 'companySlogan', 'layoutType',
      'primaryColor', 'secondaryColor', 'fontFamily', 'bloglayout',
      'body_aboutus', 'body_contactus', 'body_privacy_policy','body_privacypolicy','body_privacypolicy',
    ];

    // 2. Update based on value type
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle multiple key-value pairs (config object)
      for (const [configKey, configValue] of Object.entries(value)) {
        const index = columns.indexOf(configKey);
        if (index !== -1) {
          row[index] = configValue;
        } else {
          console.warn(`Ignoring unknown config key: ${configKey}`);
        }
      }
    } else {
      // Handle single key-value pair
      const index = columns.indexOf(key);
      if (index === -1) throw new Error(`Invalid key: ${key}`);
      row[index] = value;
    }

    // 3. Update the row in the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet2!A2:Q2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [row],
      },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error updating sheet config:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
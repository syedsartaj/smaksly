import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    spreadsheetId,
    link, code_template, title, image_url,
    robottxt_headline, robottxt_url, robottxt_auther_name,
    robottxt_auther_url, robottxt_image_url, robottxt_image_width,
    robottxt_image_height, robottxt_publish_date, robottxt_modify_date,
    robottxt_publisher_logo, robottxt_publisher_keyword, category, body: postBody
  } = body;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const sheetName = 'Sheet1';

    // Step 1: Get current last ID from column A
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:A`, // Only column A without header
    });

    const existingRows = res.data.values || [];
    const lastId = existingRows.length > 0 ? parseInt(existingRows[existingRows.length - 1][0], 10) : 0;
    const newId = lastId + 1;

    // Step 2: Append the new row
    const values = [[
      newId, link, code_template, title, image_url,
      robottxt_headline, robottxt_url, robottxt_auther_name,
      robottxt_auther_url, robottxt_image_url, robottxt_image_width,
      robottxt_image_height, robottxt_publish_date, robottxt_modify_date,
      robottxt_publisher_logo, robottxt_publisher_keyword, category, postBody
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    return NextResponse.json({ message: '✅ Row inserted successfully', id: newId });
  } catch (err: any) {
    console.error('Add post error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

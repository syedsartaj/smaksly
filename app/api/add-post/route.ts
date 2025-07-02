import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    spreadsheetId, // 👈 Get spreadsheetId from payload
    id, link, code_template, title, image_url,
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

    const range= 'Sheet1';

    const values = [[
      id, link, code_template, title, image_url,
      robottxt_headline, robottxt_url, robottxt_auther_name,
      robottxt_auther_url, robottxt_image_url, robottxt_image_width,
      robottxt_image_height, robottxt_publish_date, robottxt_modify_date,
      robottxt_publisher_logo, robottxt_publisher_keyword, category, postBody
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId, // 👈 Use dynamic spreadsheet ID
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return NextResponse.json({ message: '✅ Row inserted successfully' });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- route.ts (API) ---
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI!;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const VERCEL_TOKEN = process.env.VERCELTOKEN!;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');

// Connect Mongo
if (!mongoose.connection.readyState) {
  mongoose.connect(MONGO_URI);
}

// Define User Model
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, vercel_id, git_repo, SPREADSHEET_ID } = body;
console.log(email,SPREADSHEET_ID,vercel_id,git_repo);
    if (!email || !vercel_id || !git_repo || !SPREADSHEET_ID) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 1: Delete Vercel project
    await fetch(`https://api.vercel.com/v9/projects/${vercel_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });

    // Step 2: Delete GitHub repo
    const repoName = git_repo.split('/').pop();
    await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Step 3: Delete Google Sheet
    const user = await User.findOne({ email });
    const deployment = user.deployments.find((d: any) => d.SPREADSHEET_ID === SPREADSHEET_ID);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient() as any;
    const drive = google.drive({ version: 'v3', auth: authClient });
    await drive.files.delete({ fileId: SPREADSHEET_ID });

    // Step 4: Remove from DB
    await User.updateOne(
      { email },
      { $pull: { deployments: { SPREADSHEET_ID } } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

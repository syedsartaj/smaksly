import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Client from '@/models/Client';

const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const VERCEL_TOKEN = process.env.VERCELTOKEN!;

export async function DELETE(req: NextRequest) {
  try {
    const { email, vercel_id, git_repo } = await req.json();

    if (!email || !vercel_id)
      return NextResponse.json({ error: 'Missing email or vercel_id' }, { status: 400 });

    // 🔹 Delete Vercel project (vercel_id = project name)
    const vercelRes = await fetch(`https://api.vercel.com/v9/projects/${vercel_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    console.log("🧹 Vercel project delete:", vercelRes.status);

    // 🔹 Delete GitHub repo
    const repoName = git_repo.split('/').pop();
    console.log("Deleting GitHub repo:", repoName);
    const githubRes = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log("🪣 GitHub delete:", githubRes);

    // 🔹 Remove from DB
    await connectDB();
    console.log(email);
    const user = await Client.findOne({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.Deployments = user.Deployments.filter((dep: any) => dep.vercel_id !== vercel_id);
    await user.save();

    return NextResponse.json({ success: true, message: 'Deployment fully deleted' });
  } catch (error: any) {
    console.error('❌ Error deleting deployment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// app/api/fetch-deployments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  try {
    await connectDB();
    const user = await User.findOne({ email });

    if (!user) return NextResponse.json({ deployments: [] }, { status: 404 });

    return NextResponse.json({ deployments: user.deployments || [] });
  } catch (err) {
    console.error("FETCH ERROR", err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

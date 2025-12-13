// app/api/generate-token/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo';
import User from '@/models/Client';
import { generateVerificationToken } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { vercel_id, email } = await req.json();
    console.log('📥 Request received:', { vercel_id, email });

    if (!vercel_id || !email) {
      console.warn('⚠️ Missing email or vercel_id');
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    await connectToDatabase();
    console.log('✅ Connected to DB');

    // First check if token already exists
    const user = await User.findOne({ email, 'deployments.vercel_id': vercel_id }, { 'deployments.$': 1 });
    if (!user || !user.deployments?.length) {
      console.warn('❌ User or deployment not found');
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const existingToken = user.deployments[0].token;
    if (existingToken) {
      console.log('🪪 Returning existing token:', existingToken);
      return NextResponse.json({ token: existingToken });
    }

    const newToken = generateVerificationToken();
    console.log('🔑 Generating new token:', newToken);

    // Update using $ positional operator
    const result = await User.updateOne(
      { email, 'deployments.vercel_id': vercel_id },
      { $set: { 'deployments.$.token': newToken } }
    );

    console.log('📝 DB update result:', result);

    return NextResponse.json({ token: newToken });
  } catch (error) {
    console.error('🔥 Error in /api/generate-token:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

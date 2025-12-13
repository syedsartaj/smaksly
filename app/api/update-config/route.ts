import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Client from '@/models/Client';

export async function POST(req: NextRequest) {
  try {
    const { key, value, id } = await req.json();

    await connectDB();

    // 1. Find the user with the deployment matching the given id
    const user = await Client.findOne({ 'Deployments.vercel_id': id });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Find the deployment
    const deploymentIndex = user.Deployments.findIndex((dep: any) => dep.vercel_id === id);
    if (deploymentIndex === -1) return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });

    const deployment = user.Deployments[deploymentIndex];

    if (!deployment.Data || deployment.Data.length === 0) {
      return NextResponse.json({ error: 'No data found in deployment' }, { status: 404 });
    }

    const layout = deployment.Data[0].Layout || {};

    // 3. Update layout values
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value)) {
        layout[k] = v;
      }
    } else {
      layout[key] = value;
    }

    // 4. Save back
    deployment.Data[0].Layout = layout;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ MongoDB update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

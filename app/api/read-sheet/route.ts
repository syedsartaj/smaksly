import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import Client from '../../../models/Client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('Smaksly_id');
console.log(domain);
  if (!domain) {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 });
  }

  try {
    await connectDB();

    const client = await Client.findOne({ 'Deployments.vercel_id': domain });
    if (!client) {
      return NextResponse.json({ error: `No deployment found for domain: ${domain}` }, { status: 404 });
    }

    const deployment = client.Deployments.find((d: any) => d.vercel_id === domain);
    if (!deployment || !deployment.Data || deployment.Data.length === 0) {
      return NextResponse.json({ blogs: [] });
    }

    const blogs = deployment.Data[0].blogs || [];

    return NextResponse.json({ blogs });
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch blogs' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Client from '@/models/Client';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: '❌ Domain is required' }, { status: 400 });
    }

    const client = await Client.findOne({ 'Deployments.vercel_id': domain });

    if (!client) {
      return NextResponse.json({ error: `❌ No deployment found for domain: ${domain}` }, { status: 404 });
    }

    const deployment = client.Deployments.find((d: any) => d.vercel_id === domain);

    if (!deployment || !deployment.Data || !deployment.Data[0]?.blogs) {
      return NextResponse.json({ error: `❌ No blog data found for domain: ${domain}` }, { status: 404 });
    }
    console.log(deployment.Data[0].blogs);
    return NextResponse.json(deployment.Data[0].blogs);
  } catch (error: any) {
    console.error('Fetch blogs error:', error);
    return NextResponse.json({ error: error.message || '❌ Failed to fetch blogs' }, { status: 500 });
  }
}

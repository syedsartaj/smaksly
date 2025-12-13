import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import Client from '../../../models/Client';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { domain, id } = await req.json();

    if (!domain || !id) {
      return NextResponse.json({ error: '❌ domain and id are required' }, { status: 400 });
    }

    const client = await Client.findOne({ 'Deployments.vercel_id': domain });

    if (!client) {
      return NextResponse.json({ error: `❌ No deployment found for domain: ${domain}` }, { status: 404 });
    }

    const deployment = client.Deployments.find((d: any) => d.vercel_id === domain);

    if (!deployment || !deployment.Data || !deployment.Data[0]?.blogs) {
      return NextResponse.json({ error: `❌ No blogs found for domain: ${domain}` }, { status: 404 });
    }

    const blogIndex = deployment.Data[0].blogs.findIndex((b: any) => b.id === id);

    if (blogIndex === -1) {
      return NextResponse.json({ error: `❌ Blog with id ${id} not found` }, { status: 404 });
    }

    // Remove the blog from array
    deployment.Data[0].blogs.splice(blogIndex, 1);

    await client.save();

    return NextResponse.json({ message: `✅ Blog with id ${id} deleted successfully` });
  } catch (error: any) {
    console.error('Delete blog error:', error);
    return NextResponse.json({ error: error.message || '❌ Failed to delete blog' }, { status: 500 });
  }
}

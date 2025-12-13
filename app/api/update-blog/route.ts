import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import Client from '../../../models/Client';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { domain, id, updates } = await req.json();

    if (!domain || !id || !updates) {
      return NextResponse.json({ error: '❌ domain, id, and updates are required' }, { status: 400 });
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

    // Preserve non-editable fields
    const currentBlog = deployment.Data[0].blogs[blogIndex];
    const updatedBlog = {
      ...currentBlog,
      ...updates,
      id: currentBlog.id,
      robottxt_publish_date: currentBlog.robottxt_publish_date,
      robottxt_modify_date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    // Update the blog in place
    deployment.Data[0].blogs[blogIndex] = updatedBlog;

    await client.save();

    return NextResponse.json({ updatedBlog });
  } catch (error: any) {
    console.error('Update blog error:', error);
    return NextResponse.json({ error: error.message || '❌ Failed to update blog' }, { status: 500 });
  }
}

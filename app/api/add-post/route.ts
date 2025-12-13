// app/api/add-blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import Client from '../../../models/Client';

export async function POST(req: NextRequest) {
  const {
    domain, // previously spreadsheetId
    slug, title, image_url,
    robottxt_publish_date, robottxt_modify_date,
    category, body: postBody,
  } = await req.json();

  try {
    await connectDB();

    // Find user by domain
    const client = await Client.findOne({ 'Deployments.vercel_id': domain });
    if (!client) {
      return NextResponse.json({ error: `No deployment found for domain: ${domain}` }, { status: 404 });
    }

    // Find the deployment index
    const deployment = client.Deployments.find((d :any)=> d.vercel_id === domain);
    if (!deployment) {
      return NextResponse.json({ error: `Deployment not found for domain: ${domain}` }, { status: 404 });
    }

    const blogs = deployment.Data?.[0]?.blogs || [];

    // Check if slug already exists
    const existing = blogs.find((blog :any) => blog.slug === slug);
    if (existing) {
      return NextResponse.json({ error: `Slug "${slug}" already exists.` }, { status: 400 });
    }

    // Determine new ID
    const lastId = blogs.length > 0 ? parseInt(blogs[blogs.length - 1].id) : 0;
    const newId = String(lastId + 1);

    // Create new blog
    const newBlog = {
      id: newId,
      title,
      image_url,
      publish_date: new Date(robottxt_publish_date),
      modify_date: new Date(robottxt_modify_date),
      category,
      body: postBody,
      slug,
    };

    // Push new blog into blogs[]
    deployment.Data[0].blogs.push(newBlog);
    await client.save();

    return NextResponse.json({ message: '✅ Blog inserted successfully', id: newId });
  } catch (err: any) {
    console.error('Add blog error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

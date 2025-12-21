// app/api/add-blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import Client from '../../../models/Client';
import { sanitizeString, sanitizeSlug, sanitizeHTML, isValidUrl, checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`add-post:${ip}`, 20, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();

    // Validate and sanitize inputs
    const domain = sanitizeString(body.domain || '');
    const slug = sanitizeSlug(body.slug || '');
    const title = sanitizeString(body.title || '').substring(0, 500);
    const image_url = body.image_url || '';
    const category = sanitizeString(body.category || '').substring(0, 100);
    const postBody = sanitizeHTML(body.body || '');
    const robottxt_publish_date = body.robottxt_publish_date;
    const robottxt_modify_date = body.robottxt_modify_date;

    // Validate required fields
    if (!domain || !slug || !title) {
      return NextResponse.json({ error: 'Domain, slug, and title are required' }, { status: 400 });
    }

    // Validate image URL if provided
    if (image_url && !isValidUrl(image_url)) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    await connectDB();

    // Find user by domain and get deployment info
    const client = await Client.findOne({ 'Deployments.vercel_id': domain });
    if (!client) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Find the deployment index
    const deploymentIndex = client.Deployments.findIndex((d: any) => d.vercel_id === domain);
    if (deploymentIndex === -1) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const deployment = client.Deployments[deploymentIndex];
    const blogs = deployment.Data?.[0]?.blogs || [];

    // Check if slug already exists
    const existing = blogs.find((blog: any) => blog.slug === slug);
    if (existing) {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 400 });
    }

    // Determine new ID safely
    const maxId = blogs.reduce((max: number, blog: any) => {
      const blogId = parseInt(blog.id) || 0;
      return blogId > max ? blogId : max;
    }, 0);
    const newId = String(maxId + 1);

    // Create new blog with sanitized content
    const newBlog = {
      id: newId,
      title,
      image_url: image_url || '',
      publish_date: new Date(robottxt_publish_date || Date.now()),
      modify_date: new Date(robottxt_modify_date || Date.now()),
      category,
      body: postBody,
      slug,
    };

    // Use findOneAndUpdate with $push to avoid version conflicts
    await Client.findOneAndUpdate(
      { 'Deployments.vercel_id': domain },
      { $push: { [`Deployments.${deploymentIndex}.Data.0.blogs`]: newBlog } },
      { new: true }
    );

    return NextResponse.json({ message: 'Blog created successfully', id: newId });
  } catch (err: any) {
    console.error('Add blog error:', err);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}

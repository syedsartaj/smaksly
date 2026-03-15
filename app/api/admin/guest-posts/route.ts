import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content } from '@/models/Content';
import { Website } from '@/models/Website';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');
    const status = searchParams.get('status');
    const expiring = searchParams.get('expiring'); // 'true' to get posts expiring within 3 days

    const filter: Record<string, any> = { type: 'guest_post' };
    if (websiteId) filter.websiteId = websiteId;
    if (status) filter.status = status;

    if (expiring === 'true') {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      filter.expiresAt = { $gte: now, $lte: threeDaysFromNow };
      filter.status = 'published';
    }

    const posts = await Content.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Fetch website names
    const websiteIds = [...new Set(posts.map((p) => p.websiteId.toString()))];
    const websites = await Website.find({ _id: { $in: websiteIds } }, { name: 1, domain: 1 }).lean();
    const websiteMap = Object.fromEntries(websites.map((w) => [w._id.toString(), w]));

    const enriched = posts.map((p) => ({
      ...p,
      websiteName: websiteMap[p.websiteId.toString()]?.name || 'Unknown',
      websiteDomain: websiteMap[p.websiteId.toString()]?.domain || '',
    }));

    return NextResponse.json({ posts: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      websiteId,
      title,
      body: htmlBody,
      guestEmail,
      expiresAt,
      slug,
      metaTitle,
      metaDescription,
      tags,
      authorName,
    } = body;

    if (!websiteId || !title || !htmlBody || !guestEmail || !expiresAt) {
      return NextResponse.json(
        { error: 'websiteId, title, body, guestEmail, and expiresAt are required' },
        { status: 400 }
      );
    }

    // Generate slug from title if not provided
    const finalSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const content = await Content.create({
      websiteId,
      title,
      slug: finalSlug,
      body: htmlBody,
      type: 'guest_post',
      status: 'published',
      authorName: authorName || guestEmail,
      metaTitle: metaTitle || title.slice(0, 70),
      metaDescription: metaDescription || '',
      tags: tags || [],
      expiresAt: new Date(expiresAt),
      publishedAt: new Date(),
      isAiGenerated: false,
      // Store guest email in schema markup data for reference
      schemaMarkup: {
        type: 'Article',
        data: { guestEmail },
      },
    });

    return NextResponse.json({ post: content }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A post with this slug already exists on this website' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content } from '@/models/Content';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const post = await Content.findById(id).lean();
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      body: htmlBody,
      guestEmail,
      expiresAt,
      status,
      slug,
      metaTitle,
      metaDescription,
      tags,
      authorName,
    } = body;

    const update: Record<string, any> = {};
    if (title !== undefined) update.title = title;
    if (htmlBody !== undefined) update.body = htmlBody;
    if (slug !== undefined) update.slug = slug;
    if (metaTitle !== undefined) update.metaTitle = metaTitle;
    if (metaDescription !== undefined) update.metaDescription = metaDescription;
    if (tags !== undefined) update.tags = tags;
    if (authorName !== undefined) update.authorName = authorName;
    if (status !== undefined) update.status = status;
    if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (guestEmail !== undefined) {
      update['schemaMarkup.data.guestEmail'] = guestEmail;
    }

    const post = await Content.findOneAndUpdate(
      { _id: id, type: 'guest_post' },
      update,
      { new: true }
    );

    if (!post) return NextResponse.json({ error: 'Guest post not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const post = await Content.findOneAndDelete({ _id: id, type: 'guest_post' });
    if (!post) return NextResponse.json({ error: 'Guest post not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

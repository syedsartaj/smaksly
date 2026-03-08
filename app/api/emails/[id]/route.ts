import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Email } from '@/models/Email';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH — update email (mark read/unread, star, move to trash)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid email ID' }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.isRead === 'boolean') updates.isRead = body.isRead;
    if (typeof body.isStarred === 'boolean') updates.isStarred = body.isStarred;
    if (body.folder && ['inbox', 'sent', 'trash'].includes(body.folder)) updates.folder = body.folder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid updates provided' }, { status: 400 });
    }

    const email = await Email.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: email });
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json({ success: false, error: 'Failed to update email' }, { status: 500 });
  }
}

// DELETE — permanently delete an email
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid email ID' }, { status: 400 });
    }

    const email = await Email.findByIdAndDelete(id);
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Email deleted' });
  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete email' }, { status: 500 });
  }
}

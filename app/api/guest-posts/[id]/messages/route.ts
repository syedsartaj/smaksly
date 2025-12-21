import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GuestPost } from '@/models';
import mongoose from 'mongoose';

// GET - Get messages for a guest post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const guestPost = await GuestPost.findById(id)
      .select('messages')
      .populate('messages.senderId', 'name email')
      .lean();

    if (!guestPost) {
      return NextResponse.json(
        { success: false, error: 'Guest post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guestPost.messages || [],
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Add a message to a guest post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { senderId, senderRole, message } = body;

    if (!senderId || !senderRole || !message) {
      return NextResponse.json(
        { success: false, error: 'Sender ID, role, and message are required' },
        { status: 400 }
      );
    }

    const guestPost = await GuestPost.findById(id);
    if (!guestPost) {
      return NextResponse.json(
        { success: false, error: 'Guest post not found' },
        { status: 404 }
      );
    }

    guestPost.messages.push({
      senderId: new mongoose.Types.ObjectId(senderId),
      senderRole,
      message,
      sentAt: new Date(),
      isRead: false,
    });

    await guestPost.save();

    return NextResponse.json({
      success: true,
      data: guestPost.messages[guestPost.messages.length - 1],
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// PUT - Mark messages as read
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { readerRole } = body; // 'admin' or 'partner'

    const guestPost = await GuestPost.findById(id);
    if (!guestPost) {
      return NextResponse.json(
        { success: false, error: 'Guest post not found' },
        { status: 404 }
      );
    }

    // Mark messages from the other party as read
    const oppositeRole = readerRole === 'admin' ? 'partner' : 'admin';
    guestPost.messages.forEach((msg) => {
      if (msg.senderRole === oppositeRole && !msg.isRead) {
        msg.isRead = true;
      }
    });

    await guestPost.save();

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}

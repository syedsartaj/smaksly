import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, GuestPost, Website } from '@/models';
import { getPartnerSession } from '@/lib/partner-auth';
import { sanitizeString, sanitizeHTML } from '@/lib/security';
import mongoose from 'mongoose';

// POST - Submit guest post content for an order item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id: orderId } = await params;
    const body = await req.json();
    const {
      websiteId,
      title,
      content,
      targetUrl,
      anchorText,
    } = body;

    // Validate required fields
    if (!websiteId) {
      return NextResponse.json(
        { success: false, error: 'Website ID is required' },
        { status: 400 }
      );
    }

    if (!title || title.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Title must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!content || content.length < 500) {
      return NextResponse.json(
        { success: false, error: 'Content must be at least 500 characters' },
        { status: 400 }
      );
    }

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      partnerId: new mongoose.Types.ObjectId(session.partnerId),
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check order is paid
    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Order must be paid before submitting content' },
        { status: 400 }
      );
    }

    // Find the order item
    const itemIndex = order.items.findIndex(
      (item) => item.websiteId.toString() === websiteId
    );

    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Website not found in order' },
        { status: 404 }
      );
    }

    const orderItem = order.items[itemIndex];

    // Check item status
    if (orderItem.guestPostId) {
      return NextResponse.json(
        { success: false, error: 'Content has already been submitted for this item' },
        { status: 400 }
      );
    }

    // Get website for validation
    const website = await Website.findById(websiteId);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Validate word count
    const wordCount = content.split(/\s+/).length;
    const minWords = website.minWordCount || 800;
    const maxWords = website.maxWordCount || 2000;

    if (wordCount < minWords) {
      return NextResponse.json(
        { success: false, error: `Content must be at least ${minWords} words. Current: ${wordCount}` },
        { status: 400 }
      );
    }

    if (wordCount > maxWords) {
      return NextResponse.json(
        { success: false, error: `Content cannot exceed ${maxWords} words. Current: ${wordCount}` },
        { status: 400 }
      );
    }

    // Create guest post
    const guestPost = await GuestPost.create({
      websiteId: new mongoose.Types.ObjectId(websiteId),
      partnerId: new mongoose.Types.ObjectId(session.partnerId),
      orderId: new mongoose.Types.ObjectId(orderId),
      title: sanitizeString(title),
      content: sanitizeHTML(content),
      submittedContent: sanitizeHTML(content),
      targetUrl: sanitizeString(targetUrl || ''),
      anchorText: sanitizeString(anchorText || 'click here'),
      isDoFollow: website.doFollow,
      status: 'content_submitted',
      price: orderItem.price,
      contentSubmittedAt: new Date(),
      statusHistory: [
        {
          status: 'content_submitted',
          changedAt: new Date(),
        },
      ],
    });

    // Update order item
    order.items[itemIndex].guestPostId = guestPost._id;
    order.items[itemIndex].status = 'in_progress';

    // Update order status
    const allInProgress = order.items.every(
      (item) => item.status !== 'pending'
    );
    if (allInProgress && order.status === 'paid') {
      order.status = 'processing';
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: 'Content submitted successfully. It will be reviewed shortly.',
      data: {
        guestPostId: guestPost._id,
        status: guestPost.status,
        title: guestPost.title,
        wordCount,
      },
    });
  } catch (error) {
    console.error('Error submitting content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit content' },
      { status: 500 }
    );
  }
}

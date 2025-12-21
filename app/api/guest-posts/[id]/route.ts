import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { GuestPost, Content } from '@/models';
import mongoose from 'mongoose';

// GET - Get single guest post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const guestPost = await GuestPost.findById(id)
      .populate('websiteId', 'name domain da dr guestPostPrice turnaroundDays contentGuidelines')
      .populate('partnerId', 'companyName contactName email')
      .populate('orderId', 'orderNumber totalAmount status')
      .populate('contentId', 'title slug status')
      .lean();

    if (!guestPost) {
      return NextResponse.json(
        { success: false, error: 'Guest post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guestPost,
    });
  } catch (error) {
    console.error('Error fetching guest post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guest post' },
      { status: 500 }
    );
  }
}

// PUT - Update guest post
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const guestPost = await GuestPost.findById(id);
    if (!guestPost) {
      return NextResponse.json(
        { success: false, error: 'Guest post not found' },
        { status: 404 }
      );
    }

    // Handle status change
    if (body.status && body.status !== guestPost.status) {
      // Add to status history
      guestPost.statusHistory.push({
        status: body.status,
        changedAt: new Date(),
        changedBy: body.changedBy,
        reason: body.statusReason,
      });

      guestPost.status = body.status;

      // Update timestamps based on status
      if (body.status === 'content_submitted') {
        guestPost.contentSubmittedAt = new Date();
      } else if (body.status === 'approved') {
        guestPost.approvedAt = new Date();
      } else if (body.status === 'published') {
        guestPost.publishedAt = new Date();

        // Calculate expiry date when published
        if (guestPost.hasExpiry && guestPost.expiryDays) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + guestPost.expiryDays);
          guestPost.expiresAt = expiresAt;
        }
      }
    }

    // Handle content submission
    if (body.submittedContent) {
      guestPost.submittedContent = body.submittedContent;
      guestPost.title = body.title || guestPost.title;
    }

    // Handle revision request
    if (body.status === 'revision_requested') {
      guestPost.revisionCount += 1;
      guestPost.reviewNotes = body.reviewNotes;
    }

    // Handle publishing
    if (body.publishedUrl) {
      guestPost.publishedUrl = body.publishedUrl;
    }

    // Update other fields
    if (body.targetUrl) guestPost.targetUrl = body.targetUrl;
    if (body.anchorText) guestPost.anchorText = body.anchorText;
    if (body.isDoFollow !== undefined) guestPost.isDoFollow = body.isDoFollow;
    if (body.additionalLinks) guestPost.additionalLinks = body.additionalLinks;
    if (body.content) guestPost.content = body.content;

    await guestPost.save();

    const updatedGuestPost = await GuestPost.findById(id)
      .populate('websiteId', 'name domain')
      .populate('partnerId', 'companyName contactName email');

    return NextResponse.json({
      success: true,
      data: updatedGuestPost,
      message: 'Guest post updated successfully',
    });
  } catch (error) {
    console.error('Error updating guest post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update guest post' },
      { status: 500 }
    );
  }
}

// DELETE - Delete guest post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const guestPost = await GuestPost.findById(id);
    if (!guestPost) {
      return NextResponse.json(
        { success: false, error: 'Guest post not found' },
        { status: 404 }
      );
    }

    // Delete associated content if exists
    if (guestPost.contentId) {
      await Content.findByIdAndDelete(guestPost.contentId);
    }

    await GuestPost.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Guest post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting guest post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete guest post' },
      { status: 500 }
    );
  }
}

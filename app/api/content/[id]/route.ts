import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content, Keyword } from '@/models';
import mongoose from 'mongoose';

// GET - Get single content
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const content = await Content.findById(id)
      .populate('websiteId', 'name domain')
      .populate('keywordId', 'keyword volume difficulty')
      .populate('categoryId', 'name slug')
      .lean();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// PUT - Update content
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    // Get current content to check for keyword changes
    const currentContent = await Content.findById(id);
    if (!currentContent) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    // Whitelist allowed update fields
    const allowedFields = [
      'title', 'slug', 'excerpt', 'body', 'type', 'status', 'featuredImage',
      'metaTitle', 'metaDescription', 'focusKeyword', 'secondaryKeywords',
      'tags', 'categoryId', 'authorName', 'authorBio', 'authorAvatar',
      'scheduledAt', 'publishedAt', 'isAiGenerated', 'internalLinks', 'outboundLinks',
    ];
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Set publishedAt when publishing for the first time
    if (body.status === 'published' && !currentContent.publishedAt && !body.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // Update word count and reading time if content changed
    const contentText = body.body || body.content;
    if (contentText) {
      // Strip HTML tags for accurate word count
      const plainText = contentText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      updateData.wordCount = plainText.split(/\s+/).length;
      updateData.readingTime = Math.ceil((updateData.wordCount as number) / 200);
    }

    // Handle keyword assignment changes
    if (body.keywordId !== undefined) {
      // Reset old keyword if exists
      if (currentContent.keywordId?.toString() !== body.keywordId) {
        if (currentContent.keywordId) {
          await Keyword.findByIdAndUpdate(currentContent.keywordId, {
            status: 'new',
            contentId: null,
          });
        }

        // Set new keyword
        if (body.keywordId) {
          await Keyword.findByIdAndUpdate(body.keywordId, {
            status: 'assigned',
            contentId: id,
          });
          updateData.keywordId = new mongoose.Types.ObjectId(body.keywordId);
        } else {
          updateData.keywordId = null;
        }
      }
    }

    const content = await Content.findByIdAndUpdate(id, updateData, { new: true })
      .populate('websiteId', 'name domain')
      .populate('keywordId', 'keyword volume difficulty')
      .populate('categoryId', 'name slug');

    return NextResponse.json({
      success: true,
      data: content,
      message: 'Content updated successfully',
    });
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

// DELETE - Delete content
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const content = await Content.findById(id);
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    // Reset keyword status
    if (content.keywordId) {
      await Keyword.findByIdAndUpdate(content.keywordId, {
        status: 'new',
        contentId: null,
      });
    }

    await Content.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}

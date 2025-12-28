import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderPage } from '@/models';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ pageId: string }>;
}

// GET - Get a single page
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { pageId } = await params;

    if (!mongoose.Types.ObjectId.isValid(pageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid page ID' },
        { status: 400 }
      );
    }

    const page = await BuilderPage.findById(pageId).lean();

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// PUT - Update a page
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { pageId } = await params;

    if (!mongoose.Types.ObjectId.isValid(pageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid page ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      name,
      path,
      type,
      code,
      aiPrompt,
      metaTitle,
      metaDescription,
      ogImage,
      status,
      order,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid page name' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (path !== undefined) {
      // Check for duplicate path (excluding current page)
      const currentPage = await BuilderPage.findById(pageId);
      if (currentPage) {
        const existingPage = await BuilderPage.findOne({
          projectId: currentPage.projectId,
          path: path,
          _id: { $ne: pageId },
        });

        if (existingPage) {
          return NextResponse.json(
            { success: false, error: 'A page with this path already exists' },
            { status: 400 }
          );
        }
      }
      updateData.path = path;
      updateData.isHomePage = path === '/';
    }

    if (type !== undefined) {
      const validTypes = ['static', 'dynamic', 'blog-listing', 'blog-post'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: 'Invalid page type' },
          { status: 400 }
        );
      }
      updateData.type = type;
    }

    if (code !== undefined) {
      updateData.code = code;
      // Update status to edited if code is manually changed
      if (!body.status) {
        updateData.status = 'edited';
      }
    }

    if (aiPrompt !== undefined) {
      updateData.aiPrompt = aiPrompt;
    }

    if (metaTitle !== undefined) {
      updateData.metaTitle = metaTitle?.trim() || '';
    }

    if (metaDescription !== undefined) {
      updateData.metaDescription = metaDescription?.trim() || '';
    }

    if (ogImage !== undefined) {
      updateData.ogImage = ogImage;
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'generated', 'edited', 'published'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (order !== undefined) {
      updateData.order = order;
    }

    const page = await BuilderPage.findByIdAndUpdate(
      pageId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: page,
      message: 'Page updated successfully',
    });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a single page
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { pageId } = await params;

    if (!mongoose.Types.ObjectId.isValid(pageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid page ID' },
        { status: 400 }
      );
    }

    const page = await BuilderPage.findById(pageId);

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting home page
    if (page.isHomePage) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete home page' },
        { status: 400 }
      );
    }

    await BuilderPage.findByIdAndDelete(pageId);

    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}

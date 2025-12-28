import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderPage, BuilderProject } from '@/models';
import mongoose from 'mongoose';

// GET - List pages for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Valid project ID is required' },
        { status: 400 }
      );
    }

    const pages = await BuilderPage.find({
      projectId: new mongoose.Types.ObjectId(projectId),
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: pages,
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST - Create a new page
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { projectId, name, path, type, metaTitle, metaDescription } = body;

    // Validate projectId
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Valid project ID is required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await BuilderProject.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Page name is required' },
        { status: 400 }
      );
    }

    // Validate path
    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Page path is required' },
        { status: 400 }
      );
    }

    // Check for duplicate path in project
    const existingPage = await BuilderPage.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      path: path,
    });

    if (existingPage) {
      return NextResponse.json(
        { success: false, error: 'A page with this path already exists' },
        { status: 400 }
      );
    }

    // Get max order
    const maxOrderPage = await BuilderPage.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
    })
      .sort({ order: -1 })
      .select('order');

    const order = (maxOrderPage?.order ?? -1) + 1;

    // Create page
    const pageData = {
      projectId: new mongoose.Types.ObjectId(projectId),
      name: name.trim(),
      path: path,
      type: type || 'static',
      isHomePage: path === '/',
      code: '',
      aiPrompt: '',
      status: 'draft',
      order,
      metaTitle: metaTitle?.trim() || '',
      metaDescription: metaDescription?.trim() || '',
    };

    const page = await BuilderPage.create(pageData);

    return NextResponse.json({
      success: true,
      data: page,
      message: 'Page created successfully',
    });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create page' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete pages
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { pageIds } = body;

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Page IDs array is required' },
        { status: 400 }
      );
    }

    // Limit bulk delete
    if (pageIds.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete more than 50 pages at once' },
        { status: 400 }
      );
    }

    // Validate all IDs
    const validIds = pageIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== pageIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more invalid page IDs' },
        { status: 400 }
      );
    }

    // Don't allow deleting home pages
    const homePages = await BuilderPage.find({
      _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
      isHomePage: true,
    });

    if (homePages.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete home page' },
        { status: 400 }
      );
    }

    const result = await BuilderPage.deleteMany({
      _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} page(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete pages' },
      { status: 500 }
    );
  }
}

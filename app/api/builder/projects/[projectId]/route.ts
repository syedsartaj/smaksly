import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, BuilderPage, BuilderComponent, BuilderAsset } from '@/models';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET - Get a single project with all its pages and components
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { projectId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await BuilderProject.findById(projectId)
      .populate('website', 'name domain niche')
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch pages and components
    const [pages, components] = await Promise.all([
      BuilderPage.find({ projectId: new mongoose.Types.ObjectId(projectId) })
        .sort({ order: 1, createdAt: 1 })
        .lean(),
      BuilderComponent.find({ projectId: new mongoose.Types.ObjectId(projectId) })
        .sort({ type: 1, name: 1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        pages,
        components,
      },
    });
  } catch (error) {
    console.error('Error fetching builder project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT - Update a project
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { projectId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, description, status, settings, blogConfig } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid project name' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || '';
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'building', 'ready', 'published', 'error'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (settings !== undefined) {
      updateData.settings = settings;
    }

    if (blogConfig !== undefined) {
      updateData.blogConfig = blogConfig;
    }

    const project = await BuilderProject.findByIdAndUpdate(
      projectId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('website', 'name domain')
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating builder project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a project and all its pages, components, and assets
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { projectId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await BuilderProject.findById(projectId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete all related data
    const projectObjectId = new mongoose.Types.ObjectId(projectId);

    await Promise.all([
      BuilderPage.deleteMany({ projectId: projectObjectId }),
      BuilderComponent.deleteMany({ projectId: projectObjectId }),
      BuilderAsset.deleteMany({ projectId: projectObjectId }),
      BuilderProject.findByIdAndDelete(projectId),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Project and all related data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting builder project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

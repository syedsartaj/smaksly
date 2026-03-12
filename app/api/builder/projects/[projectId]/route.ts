import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, BuilderPage, BuilderComponent, BuilderAsset, Content, Website, Domain, SEOMetric, AIFixReport, HealthReport, Issue, KeywordHistory, KeywordGroup, Keyword, UptimeLog, EmailAccount } from '@/models';
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

// DELETE - Delete a project and all its pages, components, assets, blogs, Vercel project, and GitHub repo
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

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    const cleanup: string[] = [];

    // 1. Delete Vercel project
    if (project.vercelProjectId && VERCEL_TOKEN) {
      try {
        const res = await fetch(
          `https://api.vercel.com/v9/projects/${project.vercelProjectId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );
        if (res.ok || res.status === 404) {
          cleanup.push('Vercel project deleted');
        } else {
          console.error('Failed to delete Vercel project:', await res.text());
          cleanup.push('Vercel project deletion failed');
        }
      } catch (e) {
        console.error('Vercel delete error:', e);
        cleanup.push('Vercel project deletion error');
      }
    }

    // 2. Delete GitHub repository
    if (project.gitRepoName && GITHUB_TOKEN && GITHUB_USERNAME) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${project.gitRepoName}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        if (res.ok || res.status === 404) {
          cleanup.push('GitHub repo deleted');
        } else {
          console.error('Failed to delete GitHub repo:', await res.text());
          cleanup.push('GitHub repo deletion failed');
        }
      } catch (e) {
        console.error('GitHub delete error:', e);
        cleanup.push('GitHub repo deletion error');
      }
    }

    // 3. Delete all data scoped to this website
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    if (project.websiteId) {
      const wid = project.websiteId;
      const results = await Promise.all([
        Content.deleteMany({ websiteId: wid }),
        SEOMetric.deleteMany({ websiteId: wid }),
        AIFixReport.deleteMany({ websiteId: wid }),
        HealthReport.deleteMany({ websiteId: wid }),
        Issue.deleteMany({ websiteId: wid }),
        KeywordHistory.deleteMany({ websiteId: wid }),
        KeywordGroup.deleteMany({ websiteId: wid }),
        Keyword.deleteMany({ websiteId: wid }),
        UptimeLog.deleteMany({ websiteId: wid }),
        Domain.deleteMany({ websiteId: wid }),
        EmailAccount.deleteMany({ websiteId: wid }),
        Website.findByIdAndDelete(wid),
      ]);
      const totalDeleted = results.reduce((sum, r) => sum + ((r as any)?.deletedCount || (r ? 1 : 0)), 0);
      cleanup.push(`Website and ${totalDeleted} related records deleted`);
    }

    // 4. Delete all builder data
    await Promise.all([
      BuilderPage.deleteMany({ projectId: projectObjectId }),
      BuilderComponent.deleteMany({ projectId: projectObjectId }),
      BuilderAsset.deleteMany({ projectId: projectObjectId }),
      BuilderProject.findByIdAndDelete(projectId),
    ]);
    cleanup.push('Project data deleted');

    return NextResponse.json({
      success: true,
      message: 'Project fully deleted',
      cleanup,
    });
  } catch (error) {
    console.error('Error deleting builder project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

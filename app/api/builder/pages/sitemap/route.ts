import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderPage, BuilderProject } from '@/models';
import mongoose from 'mongoose';

// GET - Return page paths for sitemap generation (used by published sites)
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

    // Verify project exists
    const project = await BuilderProject.findById(projectId)
      .select('_id')
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch all pages that have code (i.e. are publishable)
    const pages = await BuilderPage.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      code: { $exists: true, $ne: '' },
    })
      .select('path type updatedAt')
      .sort({ order: 1 })
      .lean();

    // Normalize paths to match actual published routes
    const data = pages.map((p) => {
      let normalizedPath = p.path;
      // Blog listing always publishes to /blog (not /blogs or other variants)
      if (p.type === 'blog-listing' && normalizedPath !== '/blog') {
        normalizedPath = '/blog';
      }
      // Blog post template always publishes to /blog/[slug]
      if (p.type === 'blog-post') {
        normalizedPath = '/blog/[slug]';
      }
      return {
        path: normalizedPath,
        type: p.type,
        updatedAt: p.updatedAt?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching sitemap pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sitemap pages' },
      { status: 500 }
    );
  }
}

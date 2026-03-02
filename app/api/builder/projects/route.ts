import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, BuilderPage, Website } from '@/models';
import mongoose from 'mongoose';

// GET - List all builder projects (with optional websiteId filter)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const status = searchParams.get('status');

    // Build query
    const query: Record<string, unknown> = {};

    if (websiteId) {
      if (!mongoose.Types.ObjectId.isValid(websiteId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid website ID' },
          { status: 400 }
        );
      }
      query.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    if (status) {
      query.status = status;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [projects, total] = await Promise.all([
      BuilderProject.find(query)
        .populate('website', 'name domain')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BuilderProject.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + projects.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching builder projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST - Create a new builder project
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, name, description, settings, blogConfig } = body;

    // Validate websiteId
    if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) {
      return NextResponse.json(
        { success: false, error: 'Valid website ID is required' },
        { status: 400 }
      );
    }

    // Check if website exists
    const website = await Website.findById(websiteId);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Create project with default settings
    const projectData = {
      websiteId: new mongoose.Types.ObjectId(websiteId),
      name: name.trim(),
      description: description?.trim() || '',
      status: 'draft',
      framework: 'nextjs',
      settings: {
        primaryColor: settings?.primaryColor || website.themeConfig?.primaryColor || '#10b981',
        secondaryColor: settings?.secondaryColor || website.themeConfig?.secondaryColor || '#06b6d4',
        fontFamily: settings?.fontFamily || website.themeConfig?.fontFamily || 'Inter',
        siteName: settings?.siteName || website.name || 'My Website',
        siteDescription: settings?.siteDescription || website.description || '',
        logo: settings?.logo || '',
        favicon: settings?.favicon || '',
        socialLinks: settings?.socialLinks || {},
        languages: [{ code: 'en', name: 'English', direction: 'ltr', isDefault: true }],
        defaultLanguage: 'en',
      },
      blogConfig: {
        enabled: blogConfig?.enabled ?? true,
        postsPerPage: blogConfig?.postsPerPage || 9,
        layout: blogConfig?.layout || 'grid',
        showCategories: blogConfig?.showCategories ?? true,
        showTags: blogConfig?.showTags ?? true,
        showAuthor: blogConfig?.showAuthor ?? true,
        showDate: blogConfig?.showDate ?? true,
        showReadTime: blogConfig?.showReadTime ?? true,
      },
    };

    const project = await BuilderProject.create(projectData);

    // Create default home page
    await BuilderPage.create({
      projectId: project._id,
      name: 'Home',
      path: '/',
      type: 'static',
      isHomePage: true,
      language: 'en',
      status: 'draft',
      code: '',
      aiPrompt: '',
      order: 0,
    });

    // Populate website data before returning
    const populatedProject = await BuilderProject.findById(project._id)
      .populate('website', 'name domain')
      .lean();

    return NextResponse.json({
      success: true,
      data: populatedProject,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating builder project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

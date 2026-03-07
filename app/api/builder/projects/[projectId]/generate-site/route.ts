import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, BuilderPage, BuilderComponent } from '@/models';
import { generateFullSite } from '@/lib/ai/site-generator';
import mongoose from 'mongoose';

// Allow up to 5 minutes for site generation
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST - Generate entire site from a single prompt
export async function POST(req: NextRequest, { params }: RouteParams) {
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

    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please provide a detailed description (at least 10 characters)' },
        { status: 400 }
      );
    }

    // Generate the full site FIRST (before deleting anything)
    const result = await generateFullSite({
      userPrompt: prompt.trim(),
      siteName: project.settings?.siteName || project.name || 'My Website',
      primaryColor: project.settings?.primaryColor || '#10b981',
      secondaryColor: project.settings?.secondaryColor || '#06b6d4',
      fontFamily: project.settings?.fontFamily || 'Inter',
    });

    // Only delete existing data AFTER successful generation
    await Promise.all([
      BuilderPage.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) }),
      BuilderComponent.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) }),
    ]);

    // Save components to DB
    const savedComponents = [];
    for (const comp of result.components) {
      const component = await BuilderComponent.create({
        projectId: new mongoose.Types.ObjectId(projectId),
        name: comp.name,
        displayName: comp.name,
        description: `Auto-generated ${comp.name} component`,
        type: 'layout',
        scope: 'global',
        code: comp.code,
        exportPath: `components/${comp.name}.tsx`,
        aiPrompt: '',
      });
      savedComponents.push(component);
    }

    // Save pages to DB
    const savedPages = [];
    for (let i = 0; i < result.pages.length; i++) {
      const pageDef = result.pages[i];
      const page = await BuilderPage.create({
        projectId: new mongoose.Types.ObjectId(projectId),
        name: pageDef.name,
        path: pageDef.path,
        type: pageDef.type,
        isHomePage: pageDef.isHomePage,
        language: project.settings?.defaultLanguage || 'en',
        code: pageDef.code,
        aiPrompt: pageDef.description,
        status: pageDef.isValid ? 'generated' : 'draft',
        order: i,
      });
      savedPages.push(page);
    }

    // Update project status
    await BuilderProject.findByIdAndUpdate(projectId, { status: 'building' });

    return NextResponse.json({
      success: true,
      data: {
        plan: result.plan,
        components: savedComponents.map((c) => ({
          _id: c._id,
          name: c.name,
          code: c.code,
        })),
        pages: savedPages.map((p) => ({
          _id: p._id,
          name: p.name,
          path: p.path,
          type: p.type,
          isHomePage: p.isHomePage,
          status: p.status,
          code: p.code,
        })),
        errors: result.errors,
        tokensUsed: result.totalTokensUsed,
      },
      message: `Site generated: ${savedPages.length} pages, ${savedComponents.length} components`,
    });
  } catch (error) {
    console.error('Error generating site:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate site',
      },
      { status: 500 }
    );
  }
}

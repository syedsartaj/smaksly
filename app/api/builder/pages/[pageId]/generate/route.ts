import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderPage, BuilderProject, BuilderComponent } from '@/models';
import { builderAIService } from '@/lib/ai/builder-service';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ pageId: string }>;
}

// POST - Generate page content using AI
export async function POST(req: NextRequest, { params }: RouteParams) {
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
    const { description, mediaReferences } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Page description is required' },
        { status: 400 }
      );
    }

    // Validate media references if provided
    const validMediaRefs = mediaReferences?.filter(
      (m: { url?: string; name?: string }) =>
        m && typeof m.url === 'string' && typeof m.name === 'string'
    ) || [];

    // Get page and project
    const page = await BuilderPage.findById(pageId);
    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    const project = await BuilderProject.findById(page.projectId).lean();
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get existing components
    const components = await BuilderComponent.find({
      projectId: page.projectId,
    }).select('name type');

    const existingComponents = components.map((c) => c.name);

    // Generate page using AI
    const result = await builderAIService.generatePage({
      description: description.trim(),
      pageType: page.type as 'static' | 'dynamic' | 'blog-listing' | 'blog-post',
      pagePath: page.path,
      existingComponents,
      projectSettings: {
        siteName: project.settings?.siteName || 'My Website',
        primaryColor: project.settings?.primaryColor || '#10b981',
        secondaryColor: project.settings?.secondaryColor || '#06b6d4',
        fontFamily: project.settings?.fontFamily || 'Inter',
      },
      mediaReferences: validMediaRefs,
    });

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Generated code has validation errors',
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 400 }
      );
    }

    // Save the previous code to versions before updating
    if (page.code && page.code.trim().length > 0) {
      page.versions.push({
        code: page.code,
        createdAt: new Date(),
        prompt: page.aiPrompt,
        description: 'Before regeneration',
      });

      // Keep only last 10 versions
      if (page.versions.length > 10) {
        page.versions = page.versions.slice(-10);
      }
    }

    // Update page with generated code
    page.code = result.code;
    page.aiPrompt = description.trim();
    page.status = 'generated';
    page.lastGeneratedAt = new Date();

    // Add to conversation
    page.aiConversation.push({
      role: 'user',
      content: description.trim(),
      timestamp: new Date(),
    });
    page.aiConversation.push({
      role: 'assistant',
      content: 'Generated page code successfully.',
      timestamp: new Date(),
    });

    await page.save();

    return NextResponse.json({
      success: true,
      data: {
        code: result.code,
        warnings: result.warnings,
        suggestedComponents: result.suggestedComponents,
      },
      message: 'Page generated successfully',
    });
  } catch (error) {
    console.error('Error generating page:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate page',
      },
      { status: 500 }
    );
  }
}

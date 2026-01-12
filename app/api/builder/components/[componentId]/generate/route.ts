import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderComponent, BuilderProject, BuilderPage } from '@/models';
import { builderAIService } from '@/lib/ai/builder-service';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ componentId: string }>;
}

// POST - Generate component content using AI
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { componentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(componentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid component ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Component description is required' },
        { status: 400 }
      );
    }

    // Get component and project
    const component = await BuilderComponent.findById(componentId);
    if (!component) {
      return NextResponse.json(
        { success: false, error: 'Component not found' },
        { status: 404 }
      );
    }

    const project = await BuilderProject.findById(component.projectId).lean();
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get project pages for navigation links
    const pages = await BuilderPage.find({
      projectId: component.projectId,
    }).select('name path').lean();

    const pageInfo = pages.map((p) => ({
      name: p.name,
      path: p.path,
    }));

    // Generate component using AI
    const result = await builderAIService.generateComponent({
      description: description.trim(),
      componentName: component.name,
      componentType: component.type as 'layout' | 'section' | 'element' | 'widget',
      projectSettings: {
        siteName: project.settings?.siteName || 'My Website',
        primaryColor: project.settings?.primaryColor || '#10b981',
        secondaryColor: project.settings?.secondaryColor || '#06b6d4',
        fontFamily: project.settings?.fontFamily || 'Inter',
      },
      pages: pageInfo,
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

    // Update component with generated code
    component.code = result.code;
    await component.save();

    return NextResponse.json({
      success: true,
      data: {
        code: result.code,
        warnings: result.warnings,
      },
      message: 'Component generated successfully',
    });
  } catch (error) {
    console.error('Error generating component:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate component',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderComponent, BuilderProject, BuilderPage } from '@/models';
import { builderAIService } from '@/lib/ai/builder-service';
import mongoose from 'mongoose';

// GET - List components for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Valid project ID is required' },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {
      projectId: new mongoose.Types.ObjectId(projectId),
    };

    if (type) {
      query.type = type;
    }

    const components = await BuilderComponent.find(query)
      .sort({ type: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: components,
    });
  } catch (error) {
    console.error('Error fetching components:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}

// POST - Create a new component (optionally with AI generation)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      projectId,
      name,
      displayName,
      description,
      type,
      code,
      generateWithAI,
      aiDescription,
    } = body;

    // Validate projectId
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Valid project ID is required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await BuilderProject.findById(projectId).lean();
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Validate name (PascalCase)
    if (!name || typeof name !== 'string' || !/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Component name must be PascalCase (e.g., Header, BlogCard)' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingComponent = await BuilderComponent.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      name: name,
    });

    if (existingComponent) {
      return NextResponse.json(
        { success: false, error: 'A component with this name already exists' },
        { status: 400 }
      );
    }

    let componentCode = code || '';

    // Generate with AI if requested
    if (generateWithAI && aiDescription) {
      // For layout components (header/footer), fetch pages for navigation links
      let pages: Array<{ name: string; path: string }> = [];
      if (type === 'layout') {
        const projectPages = await BuilderPage.find({
          projectId: new mongoose.Types.ObjectId(projectId),
        }).select('name path').lean();
        pages = projectPages.map((p) => ({ name: p.name, path: p.path }));
      }

      const result = await builderAIService.generateComponent({
        description: aiDescription,
        componentName: name,
        componentType: type || 'section',
        projectSettings: {
          siteName: project.settings?.siteName || 'My Website',
          primaryColor: project.settings?.primaryColor || '#10b981',
          secondaryColor: project.settings?.secondaryColor || '#06b6d4',
          fontFamily: project.settings?.fontFamily || 'Inter',
        },
        pages,
      });

      if (!result.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Generated component has validation errors',
            errors: result.errors,
            warnings: result.warnings,
          },
          { status: 400 }
        );
      }

      componentCode = result.code;
    }

    // Create component
    const componentData = {
      projectId: new mongoose.Types.ObjectId(projectId),
      name,
      displayName: displayName?.trim() || name,
      description: description?.trim() || '',
      type: type || 'section',
      scope: 'global',
      code: componentCode,
      exportPath: `components/${name}.tsx`,
      aiPrompt: aiDescription || '',
    };

    const component = await BuilderComponent.create(componentData);

    return NextResponse.json({
      success: true,
      data: component,
      message: 'Component created successfully',
    });
  } catch (error) {
    console.error('Error creating component:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create component' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete components
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { componentIds } = body;

    if (!Array.isArray(componentIds) || componentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Component IDs array is required' },
        { status: 400 }
      );
    }

    // Limit bulk delete
    if (componentIds.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete more than 50 components at once' },
        { status: 400 }
      );
    }

    // Validate all IDs
    const validIds = componentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== componentIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more invalid component IDs' },
        { status: 400 }
      );
    }

    const result = await BuilderComponent.deleteMany({
      _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} component(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting components:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete components' },
      { status: 500 }
    );
  }
}

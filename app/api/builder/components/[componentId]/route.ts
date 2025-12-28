import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderComponent } from '@/models';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ componentId: string }>;
}

// GET - Get a single component
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { componentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(componentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid component ID' },
        { status: 400 }
      );
    }

    const component = await BuilderComponent.findById(componentId).lean();

    if (!component) {
      return NextResponse.json(
        { success: false, error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: component,
    });
  } catch (error) {
    console.error('Error fetching component:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch component' },
      { status: 500 }
    );
  }
}

// PUT - Update a component
export async function PUT(req: NextRequest, { params }: RouteParams) {
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
    const { name, displayName, description, type, code, scope, propsInterface } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        return NextResponse.json(
          { success: false, error: 'Component name must be PascalCase' },
          { status: 400 }
        );
      }

      // Check for duplicate name (excluding current component)
      const currentComponent = await BuilderComponent.findById(componentId);
      if (currentComponent) {
        const existingComponent = await BuilderComponent.findOne({
          projectId: currentComponent.projectId,
          name: name,
          _id: { $ne: componentId },
        });

        if (existingComponent) {
          return NextResponse.json(
            { success: false, error: 'A component with this name already exists' },
            { status: 400 }
          );
        }
      }

      updateData.name = name;
      updateData.exportPath = `components/${name}.tsx`;
    }

    if (displayName !== undefined) {
      updateData.displayName = displayName?.trim() || '';
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || '';
    }

    if (type !== undefined) {
      const validTypes = ['layout', 'section', 'element', 'widget'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: 'Invalid component type' },
          { status: 400 }
        );
      }
      updateData.type = type;
    }

    if (code !== undefined) {
      updateData.code = code;
    }

    if (scope !== undefined) {
      const validScopes = ['global', 'page-specific'];
      if (!validScopes.includes(scope)) {
        return NextResponse.json(
          { success: false, error: 'Invalid scope' },
          { status: 400 }
        );
      }
      updateData.scope = scope;
    }

    if (propsInterface !== undefined) {
      updateData.propsInterface = propsInterface;
    }

    const component = await BuilderComponent.findByIdAndUpdate(
      componentId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!component) {
      return NextResponse.json(
        { success: false, error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: component,
      message: 'Component updated successfully',
    });
  } catch (error) {
    console.error('Error updating component:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update component' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a single component
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { componentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(componentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid component ID' },
        { status: 400 }
      );
    }

    const component = await BuilderComponent.findByIdAndDelete(componentId);

    if (!component) {
      return NextResponse.json(
        { success: false, error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Component deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting component:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete component' },
      { status: 500 }
    );
  }
}

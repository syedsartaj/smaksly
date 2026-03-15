import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Category } from '@/models';
import { slugify } from '@/lib/utils';

// GET - Get single category by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const category = await Category.findById(id)
      .populate('parent', 'name slug')
      .lean();

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get children
    const children = await Category.find({ parentId: id })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        children,
      },
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

// PUT - Update category
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // Find existing category
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // If slug is being changed, check for duplicates
    let newSlug = existingCategory.slug;
    if (body.name && body.name !== existingCategory.name) {
      newSlug = body.slug || slugify(body.name);
      const slugExists = await Category.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Calculate level and path if parent changed
    let level = existingCategory.level;
    let path = existingCategory.path;

    if (body.parentId !== undefined && body.parentId !== existingCategory.parentId?.toString()) {
      if (body.parentId === id) {
        return NextResponse.json(
          { success: false, error: 'Category cannot be its own parent' },
          { status: 400 }
        );
      }

      if (body.parentId) {
        const parent = await Category.findById(body.parentId);
        if (!parent) {
          return NextResponse.json(
            { success: false, error: 'Parent category not found' },
            { status: 400 }
          );
        }

        // Check for circular reference
        if (parent.path.includes(existingCategory.slug)) {
          return NextResponse.json(
            { success: false, error: 'Cannot create circular category reference' },
            { status: 400 }
          );
        }

        level = parent.level + 1;
        path = parent.path ? `${parent.path}/${newSlug}` : newSlug;
      } else {
        level = 0;
        path = newSlug;
      }
    } else if (newSlug !== existingCategory.slug) {
      // Update path if slug changed
      path = path.replace(existingCategory.slug, newSlug);
    }

    const category = await Category.findByIdAndUpdate(
      id,
      {
        $set: {
          name: body.name || existingCategory.name,
          slug: newSlug,
          description: body.description !== undefined ? body.description : existingCategory.description,
          icon: body.icon !== undefined ? body.icon : existingCategory.icon,
          color: body.color !== undefined ? body.color : existingCategory.color,
          parentId: body.parentId !== undefined ? body.parentId || null : existingCategory.parentId,
          level,
          path,
          metaTitle: body.metaTitle !== undefined ? body.metaTitle : existingCategory.metaTitle,
          metaDescription: body.metaDescription !== undefined ? body.metaDescription : existingCategory.metaDescription,
          websiteIds: body.websiteIds !== undefined ? body.websiteIds : (existingCategory as any).websiteIds || [],
          isActive: body.isActive !== undefined ? body.isActive : existingCategory.isActive,
          displayOrder: body.displayOrder !== undefined ? body.displayOrder : existingCategory.displayOrder,
        },
      },
      { new: true, runValidators: true }
    );

    // Update children paths if slug changed
    if (newSlug !== existingCategory.slug) {
      await Category.updateMany(
        { path: { $regex: `^${existingCategory.path}/` } },
        [
          {
            $set: {
              path: {
                $replaceOne: {
                  input: '$path',
                  find: existingCategory.path,
                  replacement: path,
                },
              },
            },
          },
        ]
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE - Delete single category
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Check if category has children
    const hasChildren = await Category.findOne({ parentId: id });
    if (hasChildren) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete category with children. Delete children first.' },
        { status: 400 }
      );
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

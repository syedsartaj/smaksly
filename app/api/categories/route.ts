import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Category } from '@/models';
import { slugify } from '@/lib/utils';

// GET - List all categories (with optional tree structure)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree') === 'true';
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    if (tree) {
      // Return hierarchical tree structure
      const query = activeOnly ? { isActive: true } : {};
      const categories = await Category.find(query)
        .sort({ level: 1, displayOrder: 1, name: 1 })
        .lean();

      // Build tree structure
      type CategoryItem = {
        _id: string;
        name: string;
        slug: string;
        description?: string;
        icon?: string;
        color?: string;
        parentId?: string;
        level: number;
        path: string;
        isActive: boolean;
        displayOrder: number;
        websiteCount: number;
        keywordCount: number;
        contentCount: number;
        children?: CategoryItem[];
      };

      const buildTree = (items: CategoryItem[], parentId: string | null = null): CategoryItem[] => {
        return items
          .filter((item) => {
            if (parentId === null) {
              return !item.parentId;
            }
            return item.parentId?.toString() === parentId;
          })
          .map((item) => ({
            ...item,
            _id: item._id.toString(),
            parentId: item.parentId?.toString(),
            children: buildTree(items, item._id.toString()),
          }));
      };

      const tree = buildTree(categories.map((c) => ({
        ...c,
        _id: c._id.toString(),
        parentId: c.parentId?.toString(),
      })) as CategoryItem[]);

      return NextResponse.json({
        success: true,
        data: tree,
      });
    }

    // Return flat list
    const query = activeOnly ? { isActive: true } : {};
    const categories = await Category.find(query)
      .sort({ level: 1, displayOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const slug = body.slug || slugify(body.name);

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    // If parent is specified, validate it exists
    let level = 0;
    let path = slug;

    if (body.parentId) {
      const parent = await Category.findById(body.parentId);
      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent category not found' },
          { status: 400 }
        );
      }
      level = parent.level + 1;
      path = parent.path ? `${parent.path}/${slug}` : slug;
    }

    const category = await Category.create({
      name: body.name,
      slug,
      description: body.description,
      icon: body.icon,
      color: body.color,
      parentId: body.parentId || null,
      level,
      path,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      isActive: body.isActive !== false,
      displayOrder: body.displayOrder || 0,
    });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete categories
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category IDs are required' },
        { status: 400 }
      );
    }

    // Check if any category has children
    const hasChildren = await Category.findOne({ parentId: { $in: ids } });
    if (hasChildren) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete categories with children. Delete children first.' },
        { status: 400 }
      );
    }

    const result = await Category.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} category(ies) deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete categories' },
      { status: 500 }
    );
  }
}

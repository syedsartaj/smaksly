import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Keyword } from '@/models';

// GET - Get single keyword
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const keyword = await Keyword.findById(id)
      .populate('websiteId', 'name domain')
      .populate('categoryId', 'name slug')
      .lean();

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: keyword,
    });
  } catch (error) {
    console.error('Error fetching keyword:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch keyword' },
      { status: 500 }
    );
  }
}

// PUT - Update keyword
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const keyword = await Keyword.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate('websiteId', 'name domain')
      .populate('categoryId', 'name slug');

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: keyword,
      message: 'Keyword updated successfully',
    });
  } catch (error) {
    console.error('Error updating keyword:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update keyword' },
      { status: 500 }
    );
  }
}

// DELETE - Delete keyword
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const keyword = await Keyword.findByIdAndDelete(id);

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Keyword deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete keyword' },
      { status: 500 }
    );
  }
}

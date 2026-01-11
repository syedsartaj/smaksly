import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderAsset } from '@/models';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

interface RouteParams {
  params: Promise<{ mediaId: string }>;
}

// GET - Get a single media item
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { mediaId } = await params;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    const media = await BuilderAsset.findById(mediaId).lean();

    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

// PUT - Update a media item
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { mediaId } = await params;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, alt, caption, category, tags } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (alt !== undefined) {
      updateData.alt = alt.trim();
    }

    if (caption !== undefined) {
      updateData.caption = caption.trim();
    }

    if (category !== undefined) {
      updateData.category = category.trim();
    }

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : [];
    }

    const media = await BuilderAsset.findByIdAndUpdate(
      mediaId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
      message: 'Media updated successfully',
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update media' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a media item
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { mediaId } = await params;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    const media = await BuilderAsset.findById(mediaId);

    if (!media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary if publicId exists
    if (media.publicId) {
      try {
        await cloudinary.uploader.destroy(media.publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await BuilderAsset.findByIdAndDelete(mediaId);

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}

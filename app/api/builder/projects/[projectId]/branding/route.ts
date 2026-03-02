import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject } from '@/models';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET - Get branding settings for a project
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { projectId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await BuilderProject.findById(projectId)
      .select('settings.branding settings.siteName settings.siteDescription settings.logo settings.favicon settings.seoMetadata')
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        branding: project.settings?.branding || {},
        siteName: project.settings?.siteName || '',
        siteDescription: project.settings?.siteDescription || '',
        logo: project.settings?.logo || '',
        favicon: project.settings?.favicon || '',
        seoMetadata: project.settings?.seoMetadata || {},
      },
    });
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branding settings' },
      { status: 500 }
    );
  }
}

// PUT - Update branding settings for a project
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { projectId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      headerLogo,
      footerLogo,
      websiteIcon,
      indexName,
      logoAltText,
      siteName,
      siteDescription,
      ogImage,
      twitterCard,
      twitterHandle,
      themeColor,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    // Branding fields
    if (headerLogo !== undefined) {
      updateData['settings.branding.headerLogo'] = headerLogo;
    }
    if (footerLogo !== undefined) {
      updateData['settings.branding.footerLogo'] = footerLogo;
    }
    if (websiteIcon !== undefined) {
      updateData['settings.branding.websiteIcon'] = websiteIcon;
      // Also update the main favicon field for compatibility
      updateData['settings.favicon'] = websiteIcon;
    }
    if (indexName !== undefined) {
      updateData['settings.branding.indexName'] = indexName;
    }
    if (logoAltText !== undefined) {
      updateData['settings.branding.logoAltText'] = logoAltText;
    }

    // SEO metadata fields
    if (ogImage !== undefined) {
      updateData['settings.seoMetadata.ogImage'] = ogImage;
    }
    if (twitterCard !== undefined) {
      updateData['settings.seoMetadata.twitterCard'] = twitterCard;
    }
    if (twitterHandle !== undefined) {
      updateData['settings.seoMetadata.twitterHandle'] = twitterHandle;
    }
    if (themeColor !== undefined) {
      updateData['settings.seoMetadata.themeColor'] = themeColor;
    }

    // General settings
    if (siteName !== undefined) {
      updateData['settings.siteName'] = siteName;
    }
    if (siteDescription !== undefined) {
      updateData['settings.siteDescription'] = siteDescription;
    }

    const project = await BuilderProject.findByIdAndUpdate(
      projectId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select('settings.branding settings.siteName settings.siteDescription settings.logo settings.favicon settings.seoMetadata')
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        branding: project.settings?.branding || {},
        siteName: project.settings?.siteName || '',
        siteDescription: project.settings?.siteDescription || '',
        logo: project.settings?.logo || '',
        favicon: project.settings?.favicon || '',
        seoMetadata: project.settings?.seoMetadata || {},
      },
      message: 'Branding settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating branding settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update branding settings' },
      { status: 500 }
    );
  }
}

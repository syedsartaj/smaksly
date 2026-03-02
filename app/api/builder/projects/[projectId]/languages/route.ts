import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, BuilderPage } from '@/models';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET - Return project's configured languages
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
      .select('settings.languages settings.defaultLanguage')
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
        languages: project.settings?.languages || [],
        defaultLanguage: project.settings?.defaultLanguage || 'en',
      },
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch languages' },
      { status: 500 }
    );
  }
}

// POST - Add a language (optionally duplicate default-language pages)
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

    const body = await req.json();
    const { code, name, direction, duplicatePages } = body;

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'Language code and name are required' },
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

    const existingLanguages = project.settings?.languages || [];
    if (existingLanguages.some((l: { code: string }) => l.code === code)) {
      return NextResponse.json(
        { success: false, error: 'Language already exists' },
        { status: 400 }
      );
    }

    const newLang = {
      code,
      name,
      direction: direction || 'ltr',
      isDefault: existingLanguages.length === 0,
    };

    await BuilderProject.findByIdAndUpdate(projectId, {
      $push: { 'settings.languages': newLang },
    });

    // Optionally duplicate default language pages for the new language
    if (duplicatePages) {
      const defaultLang = project.settings?.defaultLanguage || 'en';
      const defaultPages = await BuilderPage.find({
        projectId: new mongoose.Types.ObjectId(projectId),
        language: defaultLang,
      }).lean();

      for (const page of defaultPages) {
        await BuilderPage.create({
          projectId: page.projectId,
          name: page.name,
          path: page.path,
          type: page.type,
          isHomePage: page.isHomePage,
          language: code,
          code: '', // Empty code - needs AI regeneration
          aiPrompt: page.aiPrompt,
          status: 'draft',
          order: page.order,
          metaTitle: '',
          metaDescription: '',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: newLang,
      message: 'Language added successfully',
    });
  } catch (error) {
    console.error('Error adding language:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add language' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a language and its pages
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Language code is required' },
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

    // Don't allow removing the default language
    if (project.settings?.defaultLanguage === code) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the default language' },
        { status: 400 }
      );
    }

    // Remove language from project
    await BuilderProject.findByIdAndUpdate(projectId, {
      $pull: { 'settings.languages': { code } },
    });

    // Delete all pages for this language
    const result = await BuilderPage.deleteMany({
      projectId: new mongoose.Types.ObjectId(projectId),
      language: code,
    });

    return NextResponse.json({
      success: true,
      message: `Language "${code}" removed. ${result.deletedCount} page(s) deleted.`,
    });
  } catch (error) {
    console.error('Error removing language:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove language' },
      { status: 500 }
    );
  }
}

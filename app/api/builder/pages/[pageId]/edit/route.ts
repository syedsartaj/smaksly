import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderPage } from '@/models';
import { builderAIService } from '@/lib/ai/builder-service';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ pageId: string }>;
}

// POST - Edit page code using AI
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
    const { instruction, currentCode, selectedCode, selectionContext, conversationHistory } = body;

    if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Edit instruction is required' },
        { status: 400 }
      );
    }

    // Get page
    const page = await BuilderPage.findById(pageId);
    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Use current editor code (from client) if provided, otherwise fall back to DB
    const codeToEdit = (currentCode && typeof currentCode === 'string' && currentCode.trim().length > 0)
      ? currentCode
      : page.code;

    if (!codeToEdit || codeToEdit.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Page has no code to edit. Generate code first.' },
        { status: 400 }
      );
    }

    let result;

    // Use conversational edit when there's history (follow-up edits)
    const hasConversation = Array.isArray(conversationHistory) && conversationHistory.length > 0;
    const hasSelection = selectedCode && typeof selectedCode === 'string' && selectedCode.trim().length > 0;

    if (hasConversation && !hasSelection) {
      // Conversational mode: AI has context from previous edits
      result = await builderAIService.conversationalEdit(
        codeToEdit,
        conversationHistory,
        instruction.trim()
      );
    } else {
      // Direct edit mode: surgical edit on selection or quick edit on full code
      result = await builderAIService.editCode({
        fullCode: codeToEdit,
        selectedCode: selectedCode || '',
        instruction: instruction.trim(),
        selectionContext: selectionContext,
      });
    }

    if (!result.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Edited code has validation errors',
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 400 }
      );
    }

    // Save the previous code to versions
    if (page.code && page.code.trim().length > 0) {
      page.versions.push({
        code: page.code,
        createdAt: new Date(),
        prompt: instruction.trim(),
        description: hasSelection ? 'Selection edit' : hasConversation ? 'Conversational edit' : 'Full edit',
      });

      // Keep only last 10 versions
      if (page.versions.length > 10) {
        page.versions = page.versions.slice(-10);
      }
    }

    // Update page with edited code
    page.code = result.code;
    page.status = 'edited';

    // Add to conversation
    page.aiConversation.push({
      role: 'user',
      content: instruction.trim(),
      timestamp: new Date(),
    });
    page.aiConversation.push({
      role: 'assistant',
      content: hasSelection
        ? 'Applied changes to selected section.'
        : 'Applied changes to the page.',
      timestamp: new Date(),
    });

    await page.save();

    return NextResponse.json({
      success: true,
      data: {
        code: result.code,
        warnings: result.warnings,
      },
      message: 'Page edited successfully',
    });
  } catch (error) {
    console.error('Error editing page:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to edit page',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AIFixReport } from '@/models';
import { runAnalysis } from '@/services/websiteFixerService';
import mongoose from 'mongoose';

// GET /api/seo/fixer/[websiteId]
// Get the latest AI fix report for a specific website
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    await connectDB();
    const { websiteId } = await params;
    const { searchParams } = new URL(req.url);
    const history = searchParams.get('history') === 'true';
    const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '5'));

    if (!mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid websiteId' }, { status: 400 });
    }

    if (history) {
      // Return last N reports for health score trend
      const reports = await AIFixReport.find({
        websiteId: new mongoose.Types.ObjectId(websiteId),
      })
        .sort({ triggeredAt: -1 })
        .limit(limit)
        .select('healthScore issueCount criticalCount triggeredAt triggeredBy')
        .lean();

      return NextResponse.json({ success: true, data: reports });
    }

    const report = await AIFixReport.findOne({
      websiteId: new mongoose.Types.ObjectId(websiteId),
    })
      .sort({ triggeredAt: -1 })
      .lean();

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'No fix report found. Run analysis first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[API] GET /seo/fixer/[websiteId]:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch report' }, { status: 500 });
  }
}

// POST /api/seo/fixer/[websiteId]
// Re-run analysis for a specific website (bypass cache)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    await connectDB();
    const { websiteId } = await params;

    if (!mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid websiteId' }, { status: 400 });
    }

    const report = await runAnalysis(websiteId, 'manual');

    return NextResponse.json({
      success: true,
      data: report,
      message: `Analysis complete. Health score: ${report.healthScore}/100`,
    });
  } catch (error) {
    console.error('[API] POST /seo/fixer/[websiteId]:', error);
    const message = error instanceof Error ? error.message : 'Failed to run analysis';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/seo/fixer/[websiteId]
// Clear all fix reports for a website
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    await connectDB();
    const { websiteId } = await params;

    if (!mongoose.isValidObjectId(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid websiteId' }, { status: 400 });
    }

    const result = await AIFixReport.deleteMany({
      websiteId: new mongoose.Types.ObjectId(websiteId),
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} fix reports`,
    });
  } catch (error) {
    console.error('[API] DELETE /seo/fixer/[websiteId]:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete reports' }, { status: 500 });
  }
}

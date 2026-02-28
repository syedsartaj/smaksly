import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { runDailyKeywordResearch, getUnassignedKeywords } from '@/services/keywordService';
import { generateAndSaveArticle } from '@/services/contentService';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const results: Record<string, unknown>[] = [];

    // Step 1: Keyword research for all active sites
    console.log('[Cron/Daily] Step 1: Running keyword research...');
    const keywordResults = await runDailyKeywordResearch();
    results.push({ step: 'keyword_research', data: keywordResults });

    // Step 2: Generate content for top unassigned keywords
    console.log('[Cron/Daily] Step 2: Generating content...');
    const websites = await Website.find({ status: 'active' }).lean();
    const contentResults = [];

    for (const website of websites) {
      try {
        const keywords = await getUnassignedKeywords(website._id.toString(), 1);
        if (keywords.length === 0) {
          contentResults.push({ websiteId: website._id.toString(), websiteName: website.name, status: 'no_keywords' });
          continue;
        }

        const keyword = keywords[0];
        const { contentId, article } = await generateAndSaveArticle(website._id.toString(), keyword._id.toString());
        contentResults.push({
          websiteId: website._id.toString(),
          websiteName: website.name,
          status: 'generated',
          contentId,
          title: article.title,
          wordCount: article.wordCount,
        });
      } catch (error) {
        console.error(`[Cron/Daily] Content gen failed for ${website.name}:`, error);
        contentResults.push({
          websiteId: website._id.toString(),
          websiteName: website.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    results.push({ step: 'content_generation', data: contentResults });

    console.log('[Cron/Daily] Completed successfully');
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('[Cron/Daily] Failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

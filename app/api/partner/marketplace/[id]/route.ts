import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website, Content } from '@/models';
import { getPartnerSession } from '@/lib/partner-auth';

// GET - Get single website details for marketplace
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    const website = await Website.findOne({
      _id: id,
      status: 'active',
      acceptsGuestPosts: true,
    }).lean();

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found or not available for guest posting' },
        { status: 404 }
      );
    }

    // Get sample published content
    const sampleContent = await Content.find({
      websiteId: website._id,
      status: 'published',
    })
      .select('title slug excerpt createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Prepare response (hide sensitive internal data)
    const listing = {
      id: website._id,
      name: website.name,
      domain: website.domain,
      niche: website.niche,
      language: website.language || 'English',
      description: website.description,

      // SEO Metrics
      metrics: {
        da: website.da,
        dr: website.dr,
        traffic: website.traffic,
        spamScore: website.spamScore,
      },

      // Guest Post Settings
      pricing: {
        price: (website.guestPostPrice || 0) / 100, // Convert to dollars
        turnaround: website.turnaroundDays || 7,
      },

      // Guidelines
      guidelines: {
        contentGuidelines: website.contentGuidelines,
        minWordCount: website.minWordCount || 800,
        maxWordCount: website.maxWordCount || 2000,
        linkType: website.doFollow ? 'dofollow' : 'nofollow',
        maxLinks: website.maxLinksPerPost || 2,
        prohibitedTopics: website.prohibitedTopics || [],
      },

      // Sample content
      sampleContent: sampleContent.map((c) => ({
        title: c.title,
        slug: c.slug,
        excerpt: c.excerpt,
        url: `https://${website.domain}/blog/${c.slug}`,
        date: c.createdAt,
      })),
    };

    return NextResponse.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error('Error fetching website details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch website details' },
      { status: 500 }
    );
  }
}

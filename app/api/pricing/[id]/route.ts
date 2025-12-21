import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';

// GET - Get single website pricing details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const website = await Website.findById(id)
      .select('name domain niche da dr traffic spamScore acceptsGuestPosts guestPostPrice turnaroundDays doFollow maxLinksPerPost minWordCount maxWordCount contentGuidelines prohibitedTopics status')
      .lean();

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: website._id,
        name: website.name,
        domain: website.domain,
        niche: website.niche,
        metrics: {
          da: website.da,
          dr: website.dr,
          traffic: website.traffic,
          spamScore: website.spamScore,
        },
        guestPost: {
          acceptsGuestPosts: website.acceptsGuestPosts,
          price: (website.guestPostPrice || 0) / 100,
          turnaround: website.turnaroundDays || 7,
          linkType: website.doFollow ? 'dofollow' : 'nofollow',
          maxLinks: website.maxLinksPerPost || 2,
        },
        content: {
          minWordCount: website.minWordCount || 800,
          maxWordCount: website.maxWordCount || 2000,
          guidelines: website.contentGuidelines,
          prohibitedTopics: website.prohibitedTopics || [],
        },
        status: website.status,
      },
    });
  } catch (error) {
    console.error('Error fetching website pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch website pricing' },
      { status: 500 }
    );
  }
}

// PUT - Update single website pricing
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const website = await Website.findById(id);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    // Guest post settings
    if (body.acceptsGuestPosts !== undefined) {
      updates.acceptsGuestPosts = body.acceptsGuestPosts;
    }

    if (body.price !== undefined) {
      updates.guestPostPrice = Math.round(body.price * 100); // Convert to cents
    }

    if (body.turnaround !== undefined) {
      updates.turnaroundDays = body.turnaround;
    }

    if (body.linkType !== undefined) {
      updates.doFollow = body.linkType === 'dofollow';
    }

    if (body.maxLinks !== undefined) {
      updates.maxLinksPerPost = body.maxLinks;
    }

    // Content settings
    if (body.minWordCount !== undefined) {
      updates.minWordCount = body.minWordCount;
    }

    if (body.maxWordCount !== undefined) {
      updates.maxWordCount = body.maxWordCount;
    }

    if (body.contentGuidelines !== undefined) {
      updates.contentGuidelines = body.contentGuidelines;
    }

    if (body.prohibitedTopics !== undefined) {
      updates.prohibitedTopics = body.prohibitedTopics;
    }

    const updatedWebsite = await Website.findByIdAndUpdate(id, updates, { new: true })
      .select('name domain guestPostPrice turnaroundDays doFollow maxLinksPerPost')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedWebsite!._id,
        name: updatedWebsite!.name,
        domain: updatedWebsite!.domain,
        pricing: {
          price: (updatedWebsite!.guestPostPrice || 0) / 100,
          turnaround: updatedWebsite!.turnaroundDays,
          linkType: updatedWebsite!.doFollow ? 'dofollow' : 'nofollow',
          maxLinks: updatedWebsite!.maxLinksPerPost,
        },
      },
      message: 'Pricing updated successfully',
    });
  } catch (error) {
    console.error('Error updating website pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}

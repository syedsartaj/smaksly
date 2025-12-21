import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { syncWebsiteToSearch, removeWebsiteFromSearch } from '@/lib/meilisearch';

// GET - Get single website by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const website = await Website.findById(id)
      .populate('category', 'name slug path')
      .lean();

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: website,
    });
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch website' },
      { status: 500 }
    );
  }
}

// PUT - Update website
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // Find existing website
    const existingWebsite = await Website.findById(id);
    if (!existingWebsite) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // If domain is being changed, check for duplicates
    if (body.domain && body.domain.toLowerCase() !== existingWebsite.domain) {
      const domainExists = await Website.findOne({
        domain: body.domain.toLowerCase(),
        _id: { $ne: id },
      });
      if (domainExists) {
        return NextResponse.json(
          { success: false, error: 'Domain already exists' },
          { status: 400 }
        );
      }
    }

    // Update fields
    const updateFields: Record<string, unknown> = {};
    const allowedFields = [
      'name',
      'domain',
      'customDomain',
      'niche',
      'categoryId',
      'tags',
      'description',
      'status',
      'da',
      'dr',
      'traffic',
      'organicKeywords',
      'referringDomains',
      'spamScore',
      'acceptsGuestPosts',
      'guestPostPrice',
      'featuredPostPrice',
      'doFollow',
      'turnaroundDays',
      'maxLinksPerPost',
      'minWordCount',
      'maxWordCount',
      'contentGuidelines',
      'prohibitedTopics',
      'autoPublish',
      'dailyPostLimit',
      'weeklyPostLimit',
      'requireApproval',
      'vercelId',
      'vercelProjectName',
      'gitRepo',
      'gscPropertyUrl',
      'gscConnected',
      'gaPropertyId',
      'gaConnected',
      'themeConfig',
      'country',
      'language',
      'currency',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = field === 'domain' ? body[field].toLowerCase() : body[field];
      }
    }

    const website = await Website.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Sync to Meilisearch
    try {
      await syncWebsiteToSearch({
        id: website._id.toString(),
        name: website.name,
        domain: website.domain,
        niche: website.niche,
        category: website.niche,
        description: website.description || '',
        da: website.da,
        dr: website.dr,
        traffic: website.traffic,
        country: website.country,
        language: website.language,
        price: website.guestPostPrice,
        currency: website.currency,
        acceptsGuestPosts: website.acceptsGuestPosts,
        doFollow: website.doFollow,
        turnaroundDays: website.turnaroundDays,
        contentGuidelines: website.contentGuidelines || '',
        tags: website.tags,
        createdAt: website.createdAt.getTime(),
        updatedAt: website.updatedAt.getTime(),
      });
    } catch (searchError) {
      console.error('Failed to sync to Meilisearch:', searchError);
    }

    return NextResponse.json({
      success: true,
      data: website,
      message: 'Website updated successfully',
    });
  } catch (error) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update website' },
      { status: 500 }
    );
  }
}

// DELETE - Delete single website
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const website = await Website.findByIdAndDelete(id);

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Remove from Meilisearch
    try {
      await removeWebsiteFromSearch(id);
    } catch (searchError) {
      console.error('Failed to remove from Meilisearch:', searchError);
    }

    return NextResponse.json({
      success: true,
      message: 'Website deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete website' },
      { status: 500 }
    );
  }
}

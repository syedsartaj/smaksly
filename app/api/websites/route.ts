import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { syncWebsiteToSearch, removeWebsiteFromSearch } from '@/lib/meilisearch';
import { isValidDomain, sanitizeString, isValidObjectId, escapeRegex } from '@/lib/security';

// Allowed sort fields to prevent NoSQL injection via sort
const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'domain', 'da', 'dr', 'traffic', 'guestPostPrice'];

// GET - List all websites with pagination and filters
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    // Sanitize and validate pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const niche = searchParams.get('niche') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const acceptsGuestPosts = searchParams.get('acceptsGuestPosts');
    const sortByParam = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate sortBy to prevent injection
    const sortBy = ALLOWED_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'createdAt';

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      // Use regex with escaped special chars instead of $text for safer search
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { domain: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }
    if (niche) {
      query.niche = niche;
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }
    if (acceptsGuestPosts !== null && acceptsGuestPosts !== '') {
      query.acceptsGuestPosts = acceptsGuestPosts === 'true';
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [websites, total] = await Promise.all([
      Website.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .lean(),
      Website.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: websites,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}

// POST - Create a new website
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    // Validate required fields (categoryId is now optional)
    const requiredFields = ['name', 'domain', 'niche'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate domain format
    const domain = body.domain.toLowerCase().trim();
    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Get or create default category if not provided
    let categoryId = body.categoryId;
    if (!categoryId || !isValidObjectId(categoryId)) {
      // Import Category model dynamically to avoid circular dependency
      const { Category } = await import('@/models');

      // Try to find a default "General" category or create one
      let defaultCategory = await Category.findOne({ slug: 'general' });
      if (!defaultCategory) {
        defaultCategory = await Category.create({
          name: 'General',
          slug: 'general',
          description: 'General category for websites',
          level: 0,
          path: 'general',
          isActive: true,
        });
      }
      categoryId = defaultCategory._id.toString();
    }

    // Check if domain already exists
    const existingWebsite = await Website.findOne({ domain });
    if (existingWebsite) {
      return NextResponse.json(
        { success: false, error: 'Domain already exists' },
        { status: 400 }
      );
    }

    // Sanitize text inputs
    const sanitizedName = sanitizeString(body.name).substring(0, 200);
    const sanitizedDescription = sanitizeString(body.description || '').substring(0, 5000);
    const sanitizedNiche = sanitizeString(body.niche).substring(0, 100);

    // Create website
    const website = await Website.create({
      name: sanitizedName,
      domain,
      customDomain: body.customDomain,
      niche: sanitizedNiche,
      categoryId: categoryId,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map((t: string) => sanitizeString(String(t)).substring(0, 50)) : [],
      description: sanitizedDescription,
      status: body.status || 'pending',

      // SEO Metrics
      da: body.da || 0,
      dr: body.dr || 0,
      traffic: body.traffic || 0,
      organicKeywords: body.organicKeywords || 0,
      referringDomains: body.referringDomains || 0,
      spamScore: body.spamScore || 0,

      // Guest Post Settings
      acceptsGuestPosts: body.acceptsGuestPosts || false,
      guestPostPrice: body.guestPostPrice || 0,
      featuredPostPrice: body.featuredPostPrice,
      doFollow: body.doFollow !== false,
      turnaroundDays: body.turnaroundDays || 7,
      maxLinksPerPost: body.maxLinksPerPost || 2,
      minWordCount: body.minWordCount || 500,
      maxWordCount: body.maxWordCount || 2000,
      contentGuidelines: body.contentGuidelines || '',
      prohibitedTopics: body.prohibitedTopics || [],

      // Publishing Settings
      autoPublish: body.autoPublish || false,
      dailyPostLimit: body.dailyPostLimit || 5,
      weeklyPostLimit: body.weeklyPostLimit || 20,
      requireApproval: body.requireApproval !== false,

      // Deployment
      vercelId: body.vercelId,
      vercelProjectName: body.vercelProjectName,
      gitRepo: body.gitRepo,

      // Theme
      themeConfig: body.themeConfig || {
        header: 'Header1',
        hero: 'Hero1',
        footer: 'Footer1',
        primaryColor: '#10b981',
        secondaryColor: '#06b6d4',
        fontFamily: 'Inter',
        blogLayout: 'BlogLayout1',
      },

      // Metadata
      country: body.country || 'US',
      language: body.language || 'en',
      currency: body.currency || 'USD',
    });

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
      message: 'Website created successfully',
    });
  } catch (error) {
    console.error('Error creating website:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create website' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete websites
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Website IDs are required' },
        { status: 400 }
      );
    }

    // Validate all IDs are valid ObjectIds
    const validIds = ids.filter((id: string) => isValidObjectId(id));
    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid website IDs provided' },
        { status: 400 }
      );
    }

    // Limit bulk delete to prevent abuse
    if (validIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete more than 100 websites at once' },
        { status: 400 }
      );
    }

    // Delete from database
    const result = await Website.deleteMany({ _id: { $in: validIds } });

    // Remove from Meilisearch
    try {
      await Promise.all(ids.map((id: string) => removeWebsiteFromSearch(id)));
    } catch (searchError) {
      console.error('Failed to remove from Meilisearch:', searchError);
    }

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} website(s) deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting websites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete websites' },
      { status: 500 }
    );
  }
}

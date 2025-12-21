import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';
import { syncWebsiteToSearch } from '@/lib/meilisearch';

// POST - Bulk update websites
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { ids, action, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Website IDs are required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    let result;
    let message = '';

    switch (action) {
      case 'updateStatus':
        if (!data?.status) {
          return NextResponse.json(
            { success: false, error: 'Status is required for updateStatus action' },
            { status: 400 }
          );
        }
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { status: data.status } }
        );
        message = `Updated status to "${data.status}" for ${result.modifiedCount} website(s)`;
        break;

      case 'enableGuestPosts':
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { acceptsGuestPosts: true } }
        );
        message = `Enabled guest posts for ${result.modifiedCount} website(s)`;
        break;

      case 'disableGuestPosts':
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { acceptsGuestPosts: false } }
        );
        message = `Disabled guest posts for ${result.modifiedCount} website(s)`;
        break;

      case 'updatePrice':
        if (data?.guestPostPrice === undefined) {
          return NextResponse.json(
            { success: false, error: 'Guest post price is required' },
            { status: 400 }
          );
        }
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { guestPostPrice: data.guestPostPrice } }
        );
        message = `Updated price for ${result.modifiedCount} website(s)`;
        break;

      case 'updateCategory':
        if (!data?.categoryId) {
          return NextResponse.json(
            { success: false, error: 'Category ID is required' },
            { status: 400 }
          );
        }
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { categoryId: data.categoryId } }
        );
        message = `Updated category for ${result.modifiedCount} website(s)`;
        break;

      case 'updateNiche':
        if (!data?.niche) {
          return NextResponse.json(
            { success: false, error: 'Niche is required' },
            { status: 400 }
          );
        }
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { niche: data.niche } }
        );
        message = `Updated niche for ${result.modifiedCount} website(s)`;
        break;

      case 'updateDoFollow':
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { doFollow: data?.doFollow !== false } }
        );
        message = `Updated link type for ${result.modifiedCount} website(s)`;
        break;

      case 'updateTurnaround':
        if (!data?.turnaroundDays) {
          return NextResponse.json(
            { success: false, error: 'Turnaround days is required' },
            { status: 400 }
          );
        }
        result = await Website.updateMany(
          { _id: { $in: ids } },
          { $set: { turnaroundDays: data.turnaroundDays } }
        );
        message = `Updated turnaround time for ${result.modifiedCount} website(s)`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Sync updated websites to Meilisearch
    try {
      const updatedWebsites = await Website.find({ _id: { $in: ids } }).lean();
      await Promise.all(
        updatedWebsites.map((website) =>
          syncWebsiteToSearch({
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
            createdAt: new Date(website.createdAt).getTime(),
            updatedAt: new Date(website.updatedAt).getTime(),
          })
        )
      );
    } catch (searchError) {
      console.error('Failed to sync to Meilisearch:', searchError);
    }

    return NextResponse.json({
      success: true,
      message,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

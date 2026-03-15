import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content } from '@/models/Content';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const websiteId = searchParams.get('websiteId');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const filter: Record<string, any> = {
      $or: [
        { publishedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { scheduledAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          publishedAt: { $exists: false },
          scheduledAt: { $exists: false },
        },
      ],
    };

    if (websiteId) {
      filter.websiteId = new mongoose.Types.ObjectId(websiteId);
    }

    const posts = await Content.find(filter, {
      title: 1,
      slug: 1,
      status: 1,
      type: 1,
      websiteId: 1,
      categoryId: 1,
      publishedAt: 1,
      scheduledAt: 1,
      createdAt: 1,
      isAiGenerated: 1,
      wordCount: 1,
    })
      .populate('websiteId', 'name domain')
      .populate('categoryId', 'name color')
      .sort({ publishedAt: -1, scheduledAt: -1, createdAt: -1 })
      .lean();

    // Group by date
    const calendarData: Record<string, any[]> = {};
    for (const post of posts) {
      const date = post.publishedAt || post.scheduledAt || post.createdAt;
      const key = new Date(date).toISOString().split('T')[0];
      if (!calendarData[key]) calendarData[key] = [];
      calendarData[key].push(post);
    }

    return NextResponse.json({ calendar: calendarData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

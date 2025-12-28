import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content, BuilderProject } from '@/models';
import mongoose from 'mongoose';

// GET - Fetch blogs for a builder project (used by preview and generated sites)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const websiteId = searchParams.get('websiteId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 50);
    const slug = searchParams.get('slug');

    let targetWebsiteId: string | null = websiteId;

    // If projectId provided, get websiteId from project
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      const project = await BuilderProject.findById(projectId).lean();
      if (project?.websiteId) {
        targetWebsiteId = project.websiteId.toString();
      }
    }

    if (!targetWebsiteId || !mongoose.Types.ObjectId.isValid(targetWebsiteId)) {
      return NextResponse.json(
        { success: false, error: 'Valid project or website ID is required' },
        { status: 400 }
      );
    }

    // Build query
    const query: Record<string, unknown> = {
      websiteId: new mongoose.Types.ObjectId(targetWebsiteId),
      status: 'published',
    };

    // If slug provided, get single blog post
    if (slug) {
      const blog = await Content.findOne({ ...query, slug })
        .select(
          'title slug excerpt body featuredImage publishedAt authorName authorBio authorAvatar readingTime tags categoryId metaTitle metaDescription'
        )
        .populate('categoryId', 'name slug')
        .lean();

      if (!blog) {
        return NextResponse.json(
          { success: false, error: 'Blog post not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          _id: blog._id.toString(),
          title: blog.title,
          slug: blog.slug,
          excerpt: blog.excerpt || '',
          body: blog.body,
          featuredImage: blog.featuredImage || '/placeholder.svg',
          publishedAt: blog.publishedAt?.toISOString() || new Date().toISOString(),
          authorName: blog.authorName || 'Admin',
          authorBio: blog.authorBio || '',
          authorAvatar: blog.authorAvatar || '',
          readingTime: blog.readingTime || 5,
          tags: blog.tags || [],
          category: blog.categoryId,
          metaTitle: blog.metaTitle || blog.title,
          metaDescription: blog.metaDescription || blog.excerpt || '',
        },
      });
    }

    // Get paginated blog list
    const skip = (page - 1) * limit;
    const [blogs, total] = await Promise.all([
      Content.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title slug excerpt featuredImage publishedAt authorName readingTime tags categoryId')
        .populate('categoryId', 'name slug')
        .lean(),
      Content.countDocuments(query),
    ]);

    const formattedBlogs = blogs.map((blog) => ({
      _id: blog._id.toString(),
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || '',
      featuredImage: blog.featuredImage || '/placeholder.svg',
      publishedAt: blog.publishedAt?.toISOString() || new Date().toISOString(),
      authorName: blog.authorName || 'Admin',
      readingTime: blog.readingTime || 5,
      tags: blog.tags || [],
      category: blog.categoryId,
    }));

    return NextResponse.json({
      success: true,
      data: formattedBlogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + blogs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

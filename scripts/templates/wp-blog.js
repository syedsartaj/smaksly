/**
 * WordPress-style blog templates for generated sites.
 * Exports two functions that return TSX strings.
 */

function generateBlogListingPage(site) {
  const { name, tw, niche } = site;

  return `'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  publishedAt: string;
  authorName: string;
  readingTime: number;
  tags: string[];
  category?: { name: string; slug: string };
}

interface BlogListingProps {
  blogs: BlogPost[];
  blogBasePath?: string;
}

export default function Blogs({ blogs = [], blogBasePath = '/blog' }: BlogListingProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlogs = blogs.filter((blog) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      blog.title.toLowerCase().includes(q) ||
      blog.excerpt.toLowerCase().includes(q) ||
      blog.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-2">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-${tw}-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Blog</span>
        </nav>
      </div>

      {/* Page Header */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
          ${name} Blog
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Insights, guides, and the latest updates from the world of ${niche.toLowerCase()}.
        </p>
      </section>

      {/* Search Bar */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-${tw}-500 focus:border-transparent transition-shadow"
          />
        </div>
      </section>

      {/* Blog Grid */}
      {filteredBlogs.length > 0 ? (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <article
                key={blog._id}
                className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                {/* Featured Image */}
                <Link href={\`\${blogBasePath}/\${blog.slug}\`} className="block">
                  <div className="relative w-full aspect-[16/10] bg-gray-100 overflow-hidden">
                    {blog.featuredImage ? (
                      <Image
                        src={blog.featuredImage}
                        alt={blog.title}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <svg
                          className="h-12 w-12 text-gray-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Card Body */}
                <div className="p-5">
                  {/* Category Badge */}
                  {blog.category && (
                    <span className="inline-block text-xs font-semibold uppercase tracking-wide text-${tw}-700 bg-${tw}-50 px-2.5 py-1 rounded-full mb-3">
                      {blog.category.name}
                    </span>
                  )}

                  {/* Title */}
                  <Link href={\`\${blogBasePath}/\${blog.slug}\`} className="block">
                    <h2 className="font-serif text-xl font-bold text-gray-900 leading-snug mb-2 group-hover:text-${tw}-700 transition-colors line-clamp-2">
                      {blog.title}
                    </h2>
                  </Link>

                  {/* Excerpt */}
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                    {blog.excerpt}
                  </p>

                  {/* Meta Row */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {/* Author Avatar Placeholder */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-${tw}-100 flex items-center justify-center text-${tw}-700 font-semibold text-xs">
                        {blog.authorName?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                      <span className="font-medium text-gray-700">{blog.authorName}</span>
                    </div>

                    <span className="text-gray-300">|</span>

                    <time dateTime={blog.publishedAt}>{formatDate(blog.publishedAt)}</time>

                    <span className="text-gray-300">|</span>

                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {blog.readingTime} min read
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              className="h-24 w-24 text-gray-200 mb-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={0.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
              />
            </svg>
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No matching posts' : 'No posts yet'}
            </h2>
            <p className="text-gray-500 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search terms or browse all posts.'
                : 'Check back soon for fresh articles and insights.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-sm text-${tw}-600 hover:text-${tw}-800 font-medium transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
`;
}

function generateBlogPostPage(site) {
  const { name, tw } = site;

  return `'use client';

import Image from 'next/image';
import Link from 'next/link';

interface BlogPostData {
  _id?: string;
  title?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  featuredImage?: string;
  publishedAt?: string;
  authorName?: string;
  authorBio?: string;
  readingTime?: number;
  tags?: string[];
  category?: { name: string; slug: string };
}

interface BlogPostProps {
  blog: BlogPostData | null;
  blogBasePath?: string;
}

export default function BlogPost({ blog, blogBasePath = '/blog' }: BlogPostProps) {
  if (!blog || !blog._id) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <svg
            className="h-16 w-16 text-gray-200 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={0.75}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="font-serif text-xl text-gray-900 font-semibold mb-1">Post not found</p>
          <p className="text-gray-500 text-sm mb-6">The article you are looking for does not exist or has been removed.</p>
          <Link
            href={blogBasePath}
            className="inline-flex items-center gap-2 text-sm font-medium text-${tw}-600 hover:text-${tw}-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Blog
          </Link>
        </div>
      </main>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          <Link href="/" className="hover:text-${tw}-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href={blogBasePath} className="hover:text-${tw}-600 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-xs">
            {blog.title}
          </span>
        </nav>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        {/* Category Badge */}
        {blog.category && (
          <div className="mb-4">
            <Link
              href={\`\${blogBasePath}?category=\${blog.category.slug}\`}
              className="inline-block text-xs font-semibold uppercase tracking-wide text-${tw}-700 bg-${tw}-50 px-3 py-1.5 rounded-full hover:bg-${tw}-100 transition-colors"
            >
              {blog.category.name}
            </Link>
          </div>
        )}

        {/* Title */}
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
          {blog.title}
        </h1>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-${tw}-100 flex items-center justify-center text-${tw}-700 font-bold text-sm">
              {blog.authorName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{blog.authorName || 'Anonymous'}</p>
              <p className="text-xs text-gray-400">Author</p>
            </div>
          </div>

          <span className="hidden sm:inline text-gray-200">|</span>

          {/* Date */}
          {blog.publishedAt && (
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <time dateTime={blog.publishedAt}>{formatDate(blog.publishedAt)}</time>
            </div>
          )}

          {/* Reading Time */}
          {blog.readingTime && (
            <>
              <span className="hidden sm:inline text-gray-200">|</span>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{blog.readingTime} min read</span>
              </div>
            </>
          )}
        </div>

        {/* Featured Image */}
        {blog.featuredImage && (
          <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-10 bg-gray-100">
            <Image
              src={blog.featuredImage}
              alt={blog.title || ''}
              fill
              unoptimized
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Article Body */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-${tw}-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-blockquote:border-${tw}-500 prose-blockquote:text-gray-700 prose-strong:text-gray-900 prose-code:text-${tw}-700 prose-code:bg-${tw}-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-li:text-gray-700"
          dangerouslySetInnerHTML={{ __html: blog.body || '' }}
        />

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h3 className="font-serif text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-block text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors cursor-default"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio Box */}
        {blog.authorName && (
          <div className="mt-12 p-6 sm:p-8 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-${tw}-100 flex-shrink-0 flex items-center justify-center text-${tw}-700 font-bold text-xl">
                {blog.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Written by</p>
                <h4 className="font-serif text-lg font-bold text-gray-900 mb-2">
                  {blog.authorName}
                </h4>
                {blog.authorBio ? (
                  <p className="text-gray-600 text-sm leading-relaxed">{blog.authorBio}</p>
                ) : (
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Contributing writer at ${name}.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <Link
            href={blogBasePath}
            className="inline-flex items-center gap-2 text-sm font-medium text-${tw}-600 hover:text-${tw}-800 transition-colors group"
          >
            <svg
              className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Blog
          </Link>
        </div>
      </article>
    </main>
  );
}
`;
}

module.exports = { generateBlogListingPage, generateBlogPostPage };

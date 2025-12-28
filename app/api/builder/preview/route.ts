import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content, BuilderProject } from '@/models';
import * as babel from '@babel/core';
import mongoose from 'mongoose';

// POST - Generate preview HTML for a page
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, projectId, pageType, projectSettings } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    // Transpile TSX to JavaScript
    let transpiledCode: string;
    try {
      const result = babel.transformSync(code, {
        presets: [
          ['@babel/preset-react', { runtime: 'classic' }],
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        ],
        filename: 'page.tsx',
      });

      if (!result?.code) {
        throw new Error('Transpilation returned no code');
      }

      transpiledCode = result.code;
    } catch (babelError) {
      console.error('Babel transpilation error:', babelError);
      return NextResponse.json(
        {
          success: false,
          error: 'Code transpilation failed',
          details: babelError instanceof Error ? babelError.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    // Fetch blog data if needed
    let blogData: unknown[] = [];
    if (
      projectId &&
      mongoose.Types.ObjectId.isValid(projectId) &&
      (pageType === 'blog-listing' || pageType === 'blog-post')
    ) {
      await connectDB();

      // Get project to find the websiteId
      const project = await BuilderProject.findById(projectId).lean();
      if (project?.websiteId) {
        const blogs = await Content.find({
          websiteId: project.websiteId,
          status: 'published',
        })
          .sort({ publishedAt: -1 })
          .limit(12)
          .select('title slug excerpt featuredImage publishedAt authorName readingTime tags')
          .lean();

        blogData = blogs.map((blog) => ({
          _id: blog._id.toString(),
          title: blog.title,
          slug: blog.slug,
          excerpt: blog.excerpt || '',
          featuredImage: blog.featuredImage || '/placeholder.svg',
          publishedAt: blog.publishedAt?.toISOString() || new Date().toISOString(),
          authorName: blog.authorName || 'Admin',
          readingTime: blog.readingTime || 5,
          tags: blog.tags || [],
        }));
      }
    }

    // Generate preview HTML
    const previewHtml = generatePreviewHTML(transpiledCode, blogData, projectSettings);

    return NextResponse.json({
      success: true,
      data: {
        html: previewHtml,
        blogCount: blogData.length,
      },
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview',
      },
      { status: 500 }
    );
  }
}

function generatePreviewHTML(
  jsCode: string,
  blogData: unknown[],
  projectSettings?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    siteName?: string;
  }
): string {
  // Remove import statements as they won't work in browser
  const cleanedCode = jsCode
    .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '')
    .replace(/import\s+['"][^'"]+['"];?\n?/g, '')
    .replace(/export\s+default\s+/g, 'const Page = ')
    .replace(/export\s+/g, 'const ');

  const settings = {
    primaryColor: projectSettings?.primaryColor || '#10b981',
    secondaryColor: projectSettings?.secondaryColor || '#06b6d4',
    fontFamily: projectSettings?.fontFamily || 'Inter',
    siteName: projectSettings?.siteName || 'My Website',
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - ${settings.siteName}</title>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '${settings.primaryColor}',
            secondary: '${settings.secondaryColor}',
          },
          fontFamily: {
            sans: ['${settings.fontFamily}', 'system-ui', 'sans-serif'],
          },
        },
      },
    };
  </script>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(
    / /g,
    '+'
  )}:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- React -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

  <style>
    body {
      font-family: '${settings.fontFamily}', system-ui, sans-serif;
      margin: 0;
      padding: 0;
    }
    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
    }
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    ::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
    // Mock next/image component
    const Image = ({ src, alt, width, height, className, fill, ...props }) => {
      const style = fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } : {};
      return React.createElement('img', {
        src: src || '/placeholder.svg',
        alt: alt || '',
        width: width,
        height: height,
        className: className,
        style: { ...style, ...(props.style || {}) },
        loading: 'lazy',
      });
    };

    // Mock next/link component
    const Link = ({ href, children, className, ...props }) => {
      return React.createElement('a', { href: href || '#', className: className, ...props }, children);
    };

    // Mock lucide-react icons (basic placeholders)
    const createIcon = (name) => ({ className, size = 24, ...props }) => {
      return React.createElement('svg', {
        className: className,
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ...props
      }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }));
    };

    // Common Lucide icons
    const Menu = createIcon('Menu');
    const X = createIcon('X');
    const ChevronDown = createIcon('ChevronDown');
    const ChevronRight = createIcon('ChevronRight');
    const ArrowRight = createIcon('ArrowRight');
    const Mail = createIcon('Mail');
    const Phone = createIcon('Phone');
    const MapPin = createIcon('MapPin');
    const Clock = createIcon('Clock');
    const Calendar = createIcon('Calendar');
    const User = createIcon('User');
    const Search = createIcon('Search');
    const Facebook = createIcon('Facebook');
    const Twitter = createIcon('Twitter');
    const Instagram = createIcon('Instagram');
    const Linkedin = createIcon('Linkedin');
    const Github = createIcon('Github');
    const Youtube = createIcon('Youtube');
    const Star = createIcon('Star');
    const Heart = createIcon('Heart');
    const Check = createIcon('Check');
    const Plus = createIcon('Plus');
    const Minus = createIcon('Minus');

    // Blog data
    const blogs = ${JSON.stringify(blogData)};

    // Placeholder for useState hook (for client components)
    const { useState, useEffect, useCallback, useMemo, useRef } = React;

    try {
      ${cleanedCode}

      // Render the component
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(typeof Page !== 'undefined' ? Page : (() => React.createElement('div', { className: 'p-4' }, 'No component found')), { blogs: blogs }));
    } catch (error) {
      console.error('Preview render error:', error);
      document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red; font-family: monospace;"><h2>Preview Error</h2><pre>' + error.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
}

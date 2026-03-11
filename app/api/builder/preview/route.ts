import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content, BuilderProject, BuilderComponent } from '@/models';
import * as babel from '@babel/core';
import mongoose from 'mongoose';

// POST - Generate preview HTML for a page
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, projectId, pageType, includeLayout, projectSettings, language, direction } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    // Pre-process: fix patterns that Babel's preset-typescript can't handle.
    let preprocessedCode = code
      // Remove markdown code fences the AI sometimes leaves in
      .replace(/^```(?:tsx?|jsx?|typescript|javascript)?\s*\n?/gm, '')
      .replace(/^```\s*$/gm, '')
      // Fix malformed type annotations like "any BlogPost[]" -> "any[]"
      .replace(/:\s*any\s+\w+\[\]/g, ': any[]')
      // Fix "as const" assertions that can trip up older Babel configs
      .replace(/\]\s+as\s+const/g, '] as any')
      // Fix satisfies keyword (TS 4.9+, not supported by Babel preset-typescript)
      .replace(/\bsatisfies\s+\w+/g, '')
      // Remove "use server" directives (not valid in client preview)
      .replace(/['"]use server['"]\s*;?\s*\n?/g, '')
      // Convert const enums to plain objects (Babel can't handle enums in isolatedModules mode)
      .replace(/(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g, (_, name, body) => {
        const entries = body.split(',').filter((e: string) => e.trim()).map((e: string) => {
          const [key, val] = e.split('=').map((s: string) => s.trim());
          return `  ${key}: ${val || `'${key}'`}`;
        });
        return `const ${name} = {\n${entries.join(',\n')}\n}`;
      });

    // Repair truncated AI code (hit max_tokens) by closing open braces/tags
    preprocessedCode = repairTruncatedCode(preprocessedCode);

    // Transpile TSX to JavaScript
    let transpiledCode: string;
    try {
      const result = babel.transformSync(preprocessedCode, {
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
      console.error('Code (last 200 chars):', preprocessedCode.slice(-200));
      const errorMsg = babelError instanceof Error ? babelError.message : 'Unknown error';
      return NextResponse.json(
        {
          success: false,
          error: `Code transpilation failed: ${errorMsg}`,
        },
        { status: 400 }
      );
    }

    // Fetch blog data if needed
    let blogData: unknown[] = [];
    let singleBlog: unknown = null;
    if (
      projectId &&
      mongoose.Types.ObjectId.isValid(projectId) &&
      (pageType === 'blog-listing' || pageType === 'blog-post')
    ) {
      await connectDB();

      // Get project to find the websiteId
      const project = await BuilderProject.findById(projectId).lean();
      if (project?.websiteId) {
        if (pageType === 'blog-post') {
          // Fetch a single blog post with full content for blog-post preview
          const blog = await Content.findOne({
            websiteId: project.websiteId,
            status: 'published',
          })
            .sort({ publishedAt: -1 })
            .select('title slug body excerpt featuredImage publishedAt authorName authorBio readingTime tags')
            .lean();

          if (blog) {
            singleBlog = {
              _id: blog._id.toString(),
              title: blog.title,
              slug: blog.slug,
              body: blog.body || '<p>No content available</p>',
              excerpt: blog.excerpt || '',
              featuredImage: blog.featuredImage || '/placeholder.svg',
              publishedAt: blog.publishedAt?.toISOString() || new Date().toISOString(),
              authorName: blog.authorName || 'Admin',
              authorBio: blog.authorBio || '',
              readingTime: blog.readingTime || 5,
              tags: blog.tags || [],
            };
          }
        } else {
          // Fetch blog list for blog-listing preview
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
    }

    // Fetch and transpile Header/Footer components for page preview
    let headerJs = '';
    let footerJs = '';
    let headerRawCode = '';
    let footerRawCode = '';
    if (includeLayout && projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      try {
        await connectDB();
        const layoutComponents = await BuilderComponent.find({
          projectId: new mongoose.Types.ObjectId(projectId),
        }).select('name code').lean();

        const headerComp = layoutComponents.find(
          (c: Record<string, unknown>) =>
            (c.name as string)?.toLowerCase().includes('header') ||
            (c.name as string)?.toLowerCase().includes('nav')
        );
        const footerComp = layoutComponents.find(
          (c: Record<string, unknown>) => (c.name as string)?.toLowerCase().includes('footer')
        );

        const transpileComponent = (code: string, varName: string): string => {
          try {
            let preprocessed = code
              .replace(/^```(?:tsx?|jsx?|typescript|javascript)?\s*\n?/gm, '')
              .replace(/^```\s*$/gm, '')
              .replace(/:\s*any\s+\w+\[\]/g, ': any[]')
              .replace(/\bsatisfies\s+\w+/g, '')
              .replace(/(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g, (_, name, body) => {
                const entries = body.split(',').filter((e: string) => e.trim()).map((e: string) => {
                  const [key, val] = e.split('=').map((s: string) => s.trim());
                  return `  ${key}: ${val || `'${key}'`}`;
                });
                return `const ${name} = {\n${entries.join(',\n')}\n}`;
              });

            const result = babel.transformSync(preprocessed, {
              presets: [
                ['@babel/preset-react', { runtime: 'classic' }],
                ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
              ],
              filename: `${varName}.tsx`,
            });

            if (!result?.code) return '';

            return result.code
              .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '')
              .replace(/import\s+['"][^'"]+['"];?\n?/g, '')
              .replace(/export\s+default\s+/g, `const ${varName} = `)
              .replace(/export\s+/g, 'const ');
          } catch (e) {
            console.error(`Failed to transpile ${varName}:`, e);
            return '';
          }
        };

        if (headerComp?.code) {
          headerRawCode = headerComp.code as string;
          headerJs = transpileComponent(headerRawCode, 'Header');
        }
        if (footerComp?.code) {
          footerRawCode = footerComp.code as string;
          footerJs = transpileComponent(footerRawCode, 'Footer');
        }
      } catch (layoutError) {
        console.error('Failed to load layout components for preview:', layoutError);
      }
    }

    // Extract icon names from lucide-react imports in all raw source code (before transpilation strips imports)
    const allRawCode = [code, headerRawCode, footerRawCode].join('\n');
    const lucideImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
    const extractedIcons = new Set<string>();
    let lucideMatch;
    while ((lucideMatch = lucideImportRegex.exec(allRawCode)) !== null) {
      lucideMatch[1].split(',').forEach((name: string) => {
        const trimmed = name.trim();
        if (trimmed && /^[A-Z]/.test(trimmed)) {
          extractedIcons.add(trimmed);
        }
      });
    }

    // Generate preview HTML
    const previewHtml = generatePreviewHTML(transpiledCode, blogData, singleBlog, projectSettings, language, direction, headerJs, footerJs, extractedIcons, pageType);

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
  singleBlog: unknown,
  projectSettings?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    siteName?: string;
    siteDescription?: string;
    logo?: string;
    favicon?: string;
    branding?: {
      headerLogo?: string;
      footerLogo?: string;
      websiteIcon?: string;
      indexName?: string;
      logoAltText?: string;
    };
  },
  language?: string,
  direction?: string,
  headerJs?: string,
  footerJs?: string,
  extractedIcons?: Set<string>,
  pageType?: string
): string {
  // Remove import statements as they won't work in browser
  const cleanedCode = jsCode
    .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '')
    .replace(/import\s+['"][^'"]+['"];?\n?/g, '')
    .replace(/export\s+default\s+/g, 'const Page = ')
    .replace(/export\s+/g, 'const ')
    // Remove Header/Footer usage from page code (they're rendered by the preview wrapper)
    .replace(/<Header\s*\/?\s*>/g, '{/* Header */}')
    .replace(/<\/Header>/g, '')
    .replace(/<Footer\s*\/?\s*>/g, '{/* Footer */}')
    .replace(/<\/Footer>/g, '')
    // Only remove hardcoded blogs array for blog pages where we inject real data
    .replace(
      pageType === 'blog-listing' || pageType === 'blog-post'
        ? /const\s+blogs\s*=\s*\[[\s\S]*?\];\s*/g
        : /(?!)/,  // never match for non-blog pages
      '// blogs injected from database\n'
    );

  const settings = {
    primaryColor: projectSettings?.primaryColor || '#10b981',
    secondaryColor: projectSettings?.secondaryColor || '#06b6d4',
    fontFamily: projectSettings?.fontFamily || 'Inter',
    siteName: projectSettings?.siteName || 'My Website',
  };

  // Extract branding settings
  const branding = {
    headerLogo: projectSettings?.branding?.headerLogo || projectSettings?.logo || '',
    footerLogo: projectSettings?.branding?.footerLogo || projectSettings?.branding?.headerLogo || projectSettings?.logo || '',
    websiteIcon: projectSettings?.branding?.websiteIcon || projectSettings?.favicon || '',
    siteName: projectSettings?.siteName || 'My Website',
    siteDescription: projectSettings?.siteDescription || '',
    logoAltText: projectSettings?.branding?.logoAltText || projectSettings?.siteName || 'Logo',
    indexName: projectSettings?.branding?.indexName || projectSettings?.siteName || 'Home',
  };

  const htmlLang = language || 'en';
  const htmlDir = direction || 'ltr';

  return `<!DOCTYPE html>
<html lang="${htmlLang}" dir="${htmlDir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branding.indexName} - ${settings.siteName}</title>
  <meta name="description" content="${branding.siteDescription}">
  ${branding.websiteIcon ? `<link rel="icon" href="${branding.websiteIcon}" type="image/x-icon">` : ''}

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
    // Site branding data - available globally
    window.__SITE_BRANDING__ = ${JSON.stringify(branding)};

    // SiteLogo component - renders the appropriate logo
    const SiteLogo = ({ type = 'header', className = '', width, height, ...props }) => {
      const branding = window.__SITE_BRANDING__;
      const src = type === 'footer' ? branding.footerLogo : branding.headerLogo;
      if (!src) return null;
      return React.createElement('img', {
        src,
        alt: branding.logoAltText || branding.siteName,
        className,
        width,
        height,
        style: props.style || {},
      });
    };

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

    // Mock next/link component - prevent actual navigation in preview
    const Link = ({ href, children, className, ...props }) => {
      const handleClick = (e) => {
        e.preventDefault();
        // Show a toast notification instead of navigating
        showPreviewToast('Navigation: ' + (href || '/'));
      };
      return React.createElement('a', {
        href: href || '#',
        className: className,
        onClick: handleClick,
        style: { cursor: 'pointer' },
        ...props
      }, children);
    };

    // Toast notification for preview
    let toastTimeout;
    function showPreviewToast(message) {
      let toast = document.getElementById('preview-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'preview-toast';
        toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; font-size: 14px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s; display: flex; align-items: center; gap: 8px;';
        document.body.appendChild(toast);
      }
      toast.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>' + message;
      toast.style.opacity = '1';
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
      }, 2000);
    }

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

    // Register icon mocks extracted from lucide-react imports (server-side parsed)
    ${JSON.stringify([...(extractedIcons || [])])}.forEach(function(name) {
      if (!window[name]) window[name] = createIcon(name);
    });

    // Blog data - for blog-listing pages (array of blogs)
    const blogs = ${JSON.stringify(blogData)};
    // Single blog data - for blog-post pages (single blog object)
    const blog = ${JSON.stringify(singleBlog)};

    // Placeholder for useState hook (for client components)
    const { useState, useEffect, useCallback, useMemo, useRef } = React;

    // React Error Boundary for graceful component failure
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: { padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', margin: '8px', color: '#991b1b', fontFamily: 'monospace', fontSize: '13px' }
          },
            React.createElement('strong', null, 'Component Error: '),
            this.state.error?.message || 'Unknown error'
          );
        }
        return this.props.children;
      }
    }

    try {
      // Layout components (wrapped in IIFE to avoid variable name collisions)
      ${headerJs ? `var Header = (function() { ${headerJs}; return typeof Header !== 'undefined' ? Header : null; })();` : 'var Header = function() { return null; };'}
      ${footerJs ? `var Footer = (function() { ${footerJs}; return typeof Footer !== 'undefined' ? Footer : null; })();` : 'var Footer = function() { return null; };'}

      // Page component (wrapped in IIFE to isolate scope)
      var Page = (function() { ${cleanedCode}; return typeof Page !== 'undefined' ? Page : null; })();

      // Render with layout wrapping (Header + Page + Footer) — each wrapped in ErrorBoundary
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const _PageComp = Page || (() => React.createElement('div', { className: 'p-4' }, 'No component found'));
      const pageElement = React.createElement(ErrorBoundary, null, React.createElement(_PageComp, { blogs: blogs, blog: blog }));
      const _siteName = '${settings.siteName.replace(/'/g, "\\'")}';
      if (Header || Footer) {
        root.render(
          React.createElement('div', null,
            Header ? React.createElement(ErrorBoundary, null, React.createElement(Header, { siteName: _siteName })) : null,
            pageElement,
            Footer ? React.createElement(ErrorBoundary, null, React.createElement(Footer, { siteName: _siteName })) : null
          )
        );
      } else {
        root.render(pageElement);
      }
    } catch (error) {
      console.error('Preview render error:', error);
      document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red; font-family: monospace;"><h2>Preview Error</h2><pre>' + error.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
}

/**
 * Repair AI-generated code that was truncated (hit max_tokens).
 * Finds the last complete closing tag and rebuilds from there.
 */
function repairTruncatedCode(code: string): string {
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;

  if (openBraces === closeBraces && openParens === closeParens) {
    return code; // Looks balanced, no repair needed
  }

  // Truncated — find the last line that ends with a complete closing tag or statement
  const lines = code.split('\n');

  // Walk backwards to find the last line ending with a proper closing tag like </div>, </section>, etc.
  let cutLine = lines.length - 1;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
    const trimmed = lines[i].trim();
    if (trimmed && /<\/\w+>$/.test(trimmed)) {
      cutLine = i;
      break;
    }
  }

  let repaired = lines.slice(0, cutLine + 1).join('\n');

  // Count remaining imbalances after cut
  const ob = (repaired.match(/\{/g) || []).length;
  const cb = (repaired.match(/\}/g) || []).length;
  const op = (repaired.match(/\(/g) || []).length;
  const cp = (repaired.match(/\)/g) || []).length;

  // Build closing sequence: close open JSX divs, then parens, then braces
  let closing = '\n';

  // Track unclosed JSX tags by scanning for open/close tags
  const openTags: string[] = [];
  const tagOpenRegex = /<([A-Za-z][A-Za-z0-9.]*)[^>]*(?<!\/)>/g;
  const tagCloseRegex = /<\/([A-Za-z][A-Za-z0-9.]*)>/g;
  const selfClosingRegex = /<[A-Za-z][A-Za-z0-9.]*[^>]*\/>/g;

  // Remove self-closing tags and strings/comments for counting
  const forCounting = repaired
    .replace(selfClosingRegex, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/'[^']*'/g, '""')
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '""');

  let m;
  while ((m = tagOpenRegex.exec(forCounting)) !== null) openTags.push(m[1]);
  while ((m = tagCloseRegex.exec(forCounting)) !== null) {
    const idx = openTags.lastIndexOf(m[1]);
    if (idx !== -1) openTags.splice(idx, 1);
  }

  // Close unclosed tags in reverse order
  for (let i = openTags.length - 1; i >= 0; i--) {
    closing += `</${openTags[i]}>\n`;
  }

  // Close remaining parens and braces
  const missingParens = op - cp - (closing.match(/\)/g) || []).length;
  const missingBraces = ob - cb - (closing.match(/\}/g) || []).length;

  for (let i = 0; i < Math.max(0, missingParens); i++) closing += ')';
  if (missingParens > 0) closing += ';\n';
  for (let i = 0; i < Math.max(0, missingBraces); i++) closing += '}\n';

  return repaired + closing;
}

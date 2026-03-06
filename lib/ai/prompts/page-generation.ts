export const PAGE_GENERATION_SYSTEM_PROMPT = `You are an expert Next.js/React developer creating production-ready website pages.

CRITICAL RULES:
1. Generate ONLY valid TypeScript/TSX React components
2. Use Tailwind CSS for ALL styling - no inline styles or CSS modules
3. Use semantic HTML5 elements (main, section, article, aside, etc.)
4. Components must be fully self-contained and functional
5. All images should use next/image with placeholder dimensions
6. Include proper TypeScript types/interfaces
7. Mobile-first responsive design (sm, md, lg, xl breakpoints)
8. Accessibility: aria-labels, semantic HTML, proper heading hierarchy
9. DO NOT use any external libraries other than those specified
10. Keep the code clean, readable, and production-ready
11. DO NOT include Header or Footer in pages - they are in the shared Layout component
12. Pages should only contain the main body content wrapped in <main> tag

COMPONENT STRUCTURE:
- Export default function component
- Props interface if needed
- Use 'use client' directive ONLY when using hooks (useState, useEffect, etc.)
- Server Components by default for better performance
- Include basic loading states where appropriate

AVAILABLE IMPORTS:
- next/image for images
- next/link for navigation
- lucide-react for icons (import specific icons like: import { Menu, X, ChevronDown } from 'lucide-react')
- React hooks (useState, useEffect, etc.) - only for Client Components

NEXT.JS 14+ API RULES (CRITICAL - DO NOT USE OLD APIs):
- next/link: <Link> renders its own <a> tag. NEVER nest <a> inside <Link>.
  WRONG: <Link href="/about"><a>About</a></Link>
  CORRECT: <Link href="/about">About</Link>
  CORRECT: <Link href="/about" className="text-blue-500">About</Link>
- next/image: DO NOT use layout="responsive" or layout="fill" — these are removed.
  WRONG: <Image src={img} layout="responsive" width={600} height={400} />
  CORRECT: <Image src={img} width={600} height={400} className="w-full h-auto" alt="..." />
  For fill mode: <div className="relative w-full h-64"><Image src={img} fill className="object-cover" alt="..." /></div>
- Always add alt text to Image components
- Always add unoptimized prop when using external image URLs

STYLING GUIDELINES:
- Use Tailwind CSS classes exclusively
- Follow mobile-first approach: base styles, then sm:, md:, lg:, xl:
- Use consistent spacing (p-4, p-6, p-8 for padding, space-y-4, gap-6 for gaps)
- Use CSS Grid and Flexbox for layouts
- Apply hover and focus states for interactive elements
- Use proper color contrast for accessibility

RTL/BIDIRECTIONAL RULES (when generating for RTL languages like Arabic, Hebrew, etc.):
- Use logical Tailwind utilities instead of physical ones: ms- (margin-start) instead of ml-, me- (margin-end) instead of mr-, ps- (padding-start) instead of pl-, pe- (padding-end) instead of pr-
- Use text-start and text-end instead of text-left and text-right
- Use start-0/end-0 instead of left-0/right-0
- Add space-x-reverse to horizontal flex containers that use space-x
- Use flex-row-reverse for RTL flex layouts when needed
- Wrap content in a div with dir="rtl" when generating RTL pages
- Content text should be in the target language

MODULAR COMPONENT TYPES:
When generating specific component types, follow these guidelines:

NAVIGATION/HEADER:
- Include logo area, navigation links, mobile menu
- Use 'use client' for mobile menu toggle
- Sticky header with backdrop blur recommended
- Include social links if provided
- Support dark/light mode toggle placeholder

FOOTER:
- Multi-column layout on desktop, stacked on mobile
- Include: company info, quick links, contact info, social links
- Copyright notice with dynamic year
- Newsletter signup placeholder
- Legal links (Privacy, Terms)

HOME PAGE:
- Hero section with CTA
- Features/services grid
- Testimonials section
- About preview section
- Blog preview (latest posts)
- CTA section before footer
NOTE: Do NOT include Header or Footer - they are in the Layout component

CONTACT PAGE:
- Contact form with validation
- Contact information cards (email, phone, address)
- Map placeholder
- FAQ section optional
- Business hours if applicable
NOTE: Do NOT include Header or Footer - they are in the Layout component

BLOG LISTING:
- Grid/list of blog posts with pagination
- Category/tag filters
- Search functionality placeholder
- Featured post highlight
NOTE: Do NOT include Header or Footer - they are in the Layout component

BLOG POST DETAIL:
- Article content with proper typography
- Author bio section
- Related posts
- Social share buttons
- Table of contents for long posts
- Comments section placeholder
NOTE: Do NOT include Header or Footer - they are in the Layout component

BLOG DATA FOR PAGES:
For BLOG LISTING pages, the component receives a 'blogs' prop with data from the database.
DO NOT create hardcoded const blogs = [...] arrays with mock data.
Use proper TypeScript types for the blog data.

Blog listing page structure (use this EXACT format):
\`\`\`tsx
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
  return (
    <main>
      {blogs.map((blog) => (
        <article key={blog._id}>
          <Link href={\`\${blogBasePath}/\${blog.slug}\`} className="block">
            <Image src={blog.featuredImage} width={600} height={400} className="w-full h-48 object-cover" alt={blog.title} unoptimized />
            <h2>{blog.title}</h2>
            <p>{blog.excerpt}</p>
          </Link>
        </article>
      ))}
    </main>
  );
}
\`\`\`

For blog post detail pages:
\`\`\`tsx
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
}

interface BlogPostProps {
  blog: BlogPostData | null;
  blogBasePath?: string;
}

export default function BlogPost({ blog, blogBasePath = '/blog' }: BlogPostProps) {
  if (!blog || !blog._id) {
    return <main className="p-8 text-center">Blog post not found</main>;
  }

  return (
    <main>
      <h1>{blog.title}</h1>
      <p>By {blog.authorName} | {blog.readingTime} min read</p>
      <img src={blog.featuredImage} alt={blog.title || ''} />
      <div dangerouslySetInnerHTML={{ __html: blog.body || '' }} />
    </main>
  );
}
\`\`\`
The blog prop contains: _id, title, slug, body, excerpt, featuredImage, publishedAt, authorName, authorBio, readingTime, tags

OUTPUT FORMAT:
Return ONLY the component code. No explanations, no markdown code blocks, just the raw TSX code.
Start directly with 'use client' (if needed) or import statements.`;

export const createPageGenerationPrompt = (params: {
  description: string;
  pageType: string;
  existingComponents: string[];
  projectSettings: {
    siteName: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  pagePath: string;
  language?: string;
  direction?: 'ltr' | 'rtl';
  languageName?: string;
}): string => {
  const { description, pageType, existingComponents, projectSettings, pagePath, language, direction, languageName } = params;

  let pageTypeInstructions = '';

  switch (pageType) {
    case 'blog-listing':
      pageTypeInstructions = `
This is a BLOG LISTING page. Requirements:
- Display a grid/list of blog posts
- Each post should show: title, excerpt, featured image, date, author, reading time
- Include pagination or "load more" functionality placeholder
- Add category/tag filters if appropriate
- Make blog cards clickable (link to /blog/[slug])

CRITICAL - Define TypeScript interfaces and use this function signature:
\`\`\`tsx
interface BlogPost {
  _id: string; title: string; slug: string; excerpt: string;
  featuredImage: string; publishedAt: string; authorName: string;
  readingTime: number; tags: string[]; category?: { name: string; slug: string };
}
interface BlogListingProps { blogs: BlogPost[]; blogBasePath?: string; }
export default function Blogs({ blogs = [], blogBasePath = '/blog' }: BlogListingProps) {
\`\`\`
- DO NOT create hardcoded const blogs = [...] with mock data
- Map over the blogs prop to render posts
- Use the blogBasePath prop for blog card links: <Link href={\\\`\\\${blogBasePath}/\\\${blog.slug}\\\`}>
  This ensures correct links in both single-language and multi-language sites.
- NEVER nest <a> inside <Link> — Link renders its own <a> in Next.js 14+
- Use next/image with width/height props (NOT layout="responsive")
- Add unoptimized prop to Image for external URLs`;
      break;

    case 'blog-post':
      pageTypeInstructions = `
This is a BLOG POST detail page for dynamic route /blog/[slug]. Requirements:
- Display: title, featured image, author info, publish date, reading time
- Render the blog content from blog.body (HTML content)
- Include social share buttons placeholder
- Add related posts section placeholder
- Include author bio section

CRITICAL - Define TypeScript interfaces and use this function signature:
\`\`\`tsx
interface BlogPostData {
  _id?: string; title?: string; slug?: string; body?: string;
  excerpt?: string; featuredImage?: string; publishedAt?: string;
  authorName?: string; authorBio?: string; readingTime?: number; tags?: string[];
}
interface BlogPostProps { blog: BlogPostData | null; blogBasePath?: string; }
export default function BlogPost({ blog, blogBasePath = '/blog' }: BlogPostProps) {
\`\`\`
- Use dangerouslySetInnerHTML to render blog.body HTML content
- Show a "Blog post not found" message if !blog || !blog._id
- Use next/image for the featured image
- Use next/link for navigation links (e.g., back to blog: <Link href={blogBasePath}>Back to Blog</Link>)`;
      break;

    case 'static':
      pageTypeInstructions = `
This is a STATIC page. Requirements:
- Create a complete, standalone page
- Include appropriate sections based on the page purpose
- No dynamic data fetching needed`;
      break;

    case 'dynamic':
      pageTypeInstructions = `
This is a DYNAMIC page. Requirements:
- May include data that changes over time
- Include loading states if needed
- Consider using 'use client' if interactivity is needed`;
      break;
  }

  return `Create a ${pageType} page for the route "${pagePath}" with these requirements:

USER DESCRIPTION:
${description}

PAGE TYPE INSTRUCTIONS:
${pageTypeInstructions}

SITE CONTEXT:
- Site Name: ${projectSettings.siteName}
- Primary Color: ${projectSettings.primaryColor} (use this for buttons, links, accents)
- Secondary Color: ${projectSettings.secondaryColor}
- Font Family: ${projectSettings.fontFamily}
- Use Tailwind's color utilities where possible, or use inline style for exact brand colors

EXISTING COMPONENTS TO REFERENCE:
${existingComponents.length > 0
  ? `These components already exist in the project: ${existingComponents.join(', ')}\nYou can import them from '@/components/ComponentName'`
  : 'No shared components yet. Create sections inline for now.'}

IMPORTANT:
- Create a complete, production-ready page
- Include all necessary sections to fulfill the user's description
- Use placeholder images from /placeholder.svg or next/image with unoptimized for external URLs
- Make sure all interactive elements have proper hover/focus states
- Include proper spacing and visual hierarchy
- DO NOT include Header or Footer - they are handled by the Layout component
- Wrap your page content in a <main> tag
${language && language !== 'en' ? `
LANGUAGE & DIRECTION:
- Language: ${languageName || language} (${language})
- Direction: ${direction || 'ltr'}
- All visible text content should be written in ${languageName || language}
${direction === 'rtl' ? `- This is an RTL language. Use logical Tailwind properties (ms-, me-, ps-, pe-, text-start, text-end)
- Add dir="rtl" to the <main> wrapper element
- Use space-x-reverse on horizontal flex containers` : ''}` : ''}

Generate the complete page component now:`;
};

export interface PageInfo {
  name: string;
  path: string;
}

export const createComponentGenerationPrompt = (params: {
  description: string;
  componentName: string;
  componentType: string;
  projectSettings: {
    siteName: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  pages?: PageInfo[];
  language?: string;
  direction?: 'ltr' | 'rtl';
  languageName?: string;
}): string => {
  const { description, componentName, componentType, projectSettings, pages = [], language, direction, languageName } = params;

  // Determine if this is a navigation or footer component
  const isNavigation = componentName.toLowerCase().includes('nav') ||
                       componentName.toLowerCase().includes('header') ||
                       description.toLowerCase().includes('navigation') ||
                       description.toLowerCase().includes('header');

  const isFooter = componentName.toLowerCase().includes('footer') ||
                   description.toLowerCase().includes('footer');

  let specialInstructions = '';

  if (isNavigation) {
    const navLinks = pages.length > 0
      ? pages.map(p => `{ name: "${p.name}", href: "${p.path}" }`).join(', ')
      : '{ name: "Home", href: "/" }, { name: "About", href: "/about" }, { name: "Blog", href: "/blog" }, { name: "Contact", href: "/contact" }';

    specialInstructions = `
NAVIGATION/HEADER SPECIFIC REQUIREMENTS:
- Use 'use client' for mobile menu toggle state
- LOGO: Use the SiteLogo component for branding (automatically reads from site settings):
  <SiteLogo type="header" className="h-8 w-auto" />
  If logo is not available, show siteName text as fallback:
  {typeof SiteLogo !== 'undefined' ? <SiteLogo type="header" className="h-8 w-auto" /> : <span className="text-xl font-bold">{siteName}</span>}
- Use next/link for navigation links - CRITICAL for proper routing
- Mobile hamburger menu with slide-in or dropdown
- Sticky header with blur backdrop (fixed top-0 w-full)
- Desktop: horizontal nav items with hover states
- Mobile: collapsible menu with smooth transition
- Include call-to-action button in header (e.g., "Get Started", "Contact Us")
- Use the primary color for accents and hover states

PROPS INTERFACE (REQUIRED):
interface HeaderProps {
  siteName?: string;
}
- The siteName prop MUST be optional with a default value: siteName = '${projectSettings.siteName}'
- Example: export default function Header({ siteName = '${projectSettings.siteName}' }: HeaderProps)

NAVIGATION LINKS TO INCLUDE:
${navLinks}

Use Link from next/link for all navigation:
import Link from 'next/link';
<Link href="/about" className="hover:text-primary">About</Link>

- Example structure:
  <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
    <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
      {/* Logo using SiteLogo */}
      <Link href="/">
        {typeof SiteLogo !== 'undefined' ? <SiteLogo type="header" className="h-8 w-auto" /> : <span className="text-xl font-bold">{siteName}</span>}
      </Link>
      {/* Desktop Nav */} {/* Mobile Menu Button */}
    </nav>
    {/* Mobile Menu Overlay */}
  </header>
`;
  } else if (isFooter) {
    const footerLinks = pages.length > 0
      ? pages.map(p => `{ name: "${p.name}", href: "${p.path}" }`).join(', ')
      : '{ name: "Home", href: "/" }, { name: "About", href: "/about" }, { name: "Blog", href: "/blog" }, { name: "Contact", href: "/contact" }';

    specialInstructions = `
FOOTER SPECIFIC REQUIREMENTS:
- Multi-column grid layout (4 columns on lg, 2 on md, 1 on mobile)
- Column 1: Company info with logo and brief description
  LOGO: Use the SiteLogo component for branding (automatically reads from site settings):
  <SiteLogo type="footer" className="h-8 w-auto" />
  If logo is not available, show siteName text as fallback:
  {typeof SiteLogo !== 'undefined' ? <SiteLogo type="footer" className="h-8 w-auto" /> : <span className="text-xl font-bold">{siteName}</span>}
- Column 2: Quick Links - USE THESE EXACT LINKS:
  ${footerLinks}
- Column 3: Contact Info (address, phone, email with icons)
- Column 4: Newsletter signup form
- Bottom bar: Copyright with dynamic year, Privacy Policy, Terms links
- Social media icons row (Facebook, Twitter, LinkedIn, Instagram)
- Use neutral dark background (zinc-900) with light text
- USE next/link for all navigation links:
  import Link from 'next/link';
  <Link href="/about">About</Link>

PROPS INTERFACE (REQUIRED):
interface FooterProps {
  siteName?: string;
}
- The siteName prop MUST be optional with a default value: siteName = '${projectSettings.siteName}'
- Example: export default function Footer({ siteName = '${projectSettings.siteName}' }: FooterProps)

- Example structure:
  <footer className="bg-zinc-900 text-white">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Column 1 - Logo */}
        <div>
          {typeof SiteLogo !== 'undefined' ? <SiteLogo type="footer" className="h-8 w-auto mb-4" /> : <span className="text-xl font-bold">{siteName}</span>}
          <p className="text-zinc-400">Company description...</p>
        </div>
        {/* More columns */}
      </div>
    </div>
    <div className="border-t border-zinc-800 py-6">
      {/* Bottom bar */}
    </div>
  </footer>
`;
  }

  return `Create a reusable React component named "${componentName}" of type "${componentType}".

DESCRIPTION:
${description}

SITE CONTEXT:
- Site Name: ${projectSettings.siteName}
- Primary Color: ${projectSettings.primaryColor}
- Secondary Color: ${projectSettings.secondaryColor}
- Font Family: ${projectSettings.fontFamily}

${specialInstructions}

REQUIREMENTS:
1. Create a reusable, prop-driven component
2. Define a clear Props interface
3. Use Tailwind CSS for styling
4. Make it responsive (mobile-first)
5. Include proper TypeScript types
6. Add accessibility attributes
7. Export as default
${language && language !== 'en' ? `
LANGUAGE & DIRECTION:
- Language: ${languageName || language} (${language})
- Direction: ${direction || 'ltr'}
${direction === 'rtl' ? `- Use logical Tailwind properties (ms-, me-, ps-, pe-, text-start, text-end) for RTL support` : ''}` : ''}

COMPONENT TYPE GUIDELINES:
${componentType === 'layout' ? '- This is a layout component (Header, Footer, Navigation)\n- Should be consistent across pages\n- Include navigation links and branding' : ''}
${componentType === 'section' ? '- This is a page section component\n- Should be self-contained\n- Accept content via props' : ''}
${componentType === 'element' ? '- This is a small, reusable UI element\n- Keep it simple and focused\n- Highly configurable via props' : ''}
${componentType === 'widget' ? '- This is an interactive widget\n- May need client-side state\n- Include loading/error states if applicable' : ''}

Generate the complete component code now:`;
};

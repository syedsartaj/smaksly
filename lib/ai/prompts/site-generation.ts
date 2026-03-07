/**
 * Prompts for full-site generation using Claude Opus 4.6
 * Option B: Orchestrated multi-call approach
 */

// ─── STEP 1: Site Plan ───

export const SITE_PLAN_SYSTEM_PROMPT = `You are a senior web architect. Given a user's website description, create a detailed site plan as JSON.

You must respond ONLY with valid JSON — no markdown, no explanation, no code fences.

The JSON schema:
{
  "siteName": "string — the website name",
  "description": "string — one-line site description",
  "designSystem": {
    "style": "modern | minimal | bold | elegant | playful",
    "colorScheme": "light | dark | mixed",
    "mood": "string — e.g. professional, friendly, creative"
  },
  "pages": [
    {
      "name": "string — display name (e.g. Home)",
      "path": "string — URL path (e.g. /)",
      "type": "static | blog-listing | blog-post",
      "isHomePage": true/false,
      "sections": ["string — section names, e.g. Hero, Features, Testimonials"],
      "description": "string — what this page should contain"
    }
  ],
  "components": [
    {
      "name": "Header",
      "description": "string — what the header should look like",
      "navLinks": [{ "label": "string", "path": "string" }]
    },
    {
      "name": "Footer",
      "description": "string — what the footer should contain"
    }
  ],
  "blogEnabled": true/false
}

Rules:
- Always include Home page with path "/"
- Always include Header and Footer components
- If user mentions blog, include blog-listing (path: /blogs) and blog-post (path: /blog/[slug]) pages and set blogEnabled: true
- Keep pages between 3-7 for a typical site
- Each page should have 3-6 sections
- Infer reasonable pages from context (e.g. "restaurant" → Home, Menu, About, Contact, Blog)
- navLinks in Header should match the pages list`;

export function createSitePlanPrompt(params: {
  userPrompt: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
}): string {
  return `Create a site plan for this website:

Site Name: ${params.siteName}
Primary Color: ${params.primaryColor}
Secondary Color: ${params.secondaryColor}

User Request:
${params.userPrompt}

Respond with the JSON site plan only.`;
}

// ─── STEP 2: Header & Footer ───

export const COMPONENT_SYSTEM_PROMPT = `You are an expert Next.js/React developer. Generate a production-ready component.

CRITICAL RULES:
1. Output ONLY the raw TSX code — no markdown, no code fences, no explanation
2. Start with 'use client'; if using hooks (useState, useEffect, etc.)
3. Use Tailwind CSS exclusively — no inline styles
4. Use next/link for navigation: <Link href="/path">Text</Link> — NEVER nest <a> inside <Link>
5. Use next/image for images: <Image src={...} width={...} height={...} alt="..." /> — NEVER use layout="responsive" or layout="fill"
6. For fill mode images: <div className="relative w-full h-64"><Image src={...} fill className="object-cover" alt="..." /></div>
7. Import icons from lucide-react only
8. Mobile-first responsive design
9. Component must have export default function ComponentName()
10. Semantic HTML, accessibility (aria-labels), proper heading hierarchy`;

export function createHeaderPrompt(params: {
  description: string;
  navLinks: Array<{ label: string; path: string }>;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  designStyle: string;
  colorScheme: string;
}): string {
  const navLinksStr = params.navLinks.map((l) => `- "${l.label}" → ${l.path}`).join('\n');

  return `Generate a Header component for "${params.siteName}".

DESIGN:
- Style: ${params.designStyle}
- Color scheme: ${params.colorScheme}
- Primary color: ${params.primaryColor}
- Secondary color: ${params.secondaryColor}
- Font: ${params.fontFamily}

DESCRIPTION:
${params.description}

NAVIGATION LINKS:
${navLinksStr}

REQUIREMENTS:
- Sticky header with backdrop blur
- Logo area on the left (use site name "${params.siteName}" as text logo)
- Navigation links from the list above
- Mobile hamburger menu with useState toggle (needs 'use client')
- CTA button on the right (optional, use last nav link or "Contact")
- Clean, professional look matching the ${params.designStyle} style

Generate the Header component code now:`;
}

export function createFooterPrompt(params: {
  description: string;
  navLinks: Array<{ label: string; path: string }>;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  designStyle: string;
  colorScheme: string;
}): string {
  const navLinksStr = params.navLinks.map((l) => `- "${l.label}" → ${l.path}`).join('\n');

  return `Generate a Footer component for "${params.siteName}".

DESIGN:
- Style: ${params.designStyle}
- Color scheme: ${params.colorScheme}
- Primary color: ${params.primaryColor}
- Secondary color: ${params.secondaryColor}
- Font: ${params.fontFamily}

DESCRIPTION:
${params.description}

NAVIGATION LINKS:
${navLinksStr}

REQUIREMENTS:
- Multi-column layout on desktop (grid), stacked on mobile
- Company info column with site name and brief description
- Quick links column with navigation links
- Contact info column (placeholder email, phone, address)
- Social media icons row (placeholder links)
- Copyright with dynamic year: {new Date().getFullYear()}
- Dark or matching background based on ${params.colorScheme} scheme
- Do NOT use 'use client' — this is a server component

Generate the Footer component code now:`;
}

// ─── STEP 3: Page Generation ───

export const PAGE_SYSTEM_PROMPT = `You are an expert Next.js/React developer generating a production-ready page component.

CRITICAL RULES:
1. Output ONLY the raw TSX code — no markdown, no code fences, no explanation
2. Start with 'use client'; ONLY if using hooks
3. Use Tailwind CSS exclusively
4. Use next/link: <Link href="/path">Text</Link> — NEVER nest <a> inside <Link>
5. Use next/image: <Image src="/placeholder.svg" width={600} height={400} alt="..." /> — NEVER use layout prop
6. Import icons from lucide-react only
7. DO NOT include Header or Footer — they are in the shared layout
8. Wrap page content in <main> tag
9. Mobile-first responsive design (sm:, md:, lg:, xl:)
10. Semantic HTML, aria-labels, proper heading hierarchy
11. Add {/* Section Name */} comments before each major section for section detection
12. Export default function PageName()
13. Each section should use <section> tags
14. Use consistent spacing between sections (py-16 md:py-24)
15. Use the exact color values provided in the design system`;

export function createPagePrompt(params: {
  pageName: string;
  pagePath: string;
  pageType: string;
  sections: string[];
  description: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  designStyle: string;
  colorScheme: string;
  allPages: Array<{ name: string; path: string }>;
}): string {
  const sectionsStr = params.sections.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const pagesStr = params.allPages.map((p) => `- ${p.name}: ${p.path}`).join('\n');

  return `Generate the "${params.pageName}" page (${params.pagePath}) for "${params.siteName}".

DESIGN SYSTEM:
- Style: ${params.designStyle}
- Color scheme: ${params.colorScheme}
- Primary color: ${params.primaryColor}
- Secondary color: ${params.secondaryColor}
- Font: ${params.fontFamily}

PAGE DESCRIPTION:
${params.description}

SECTIONS TO INCLUDE:
${sectionsStr}

SITE PAGES (for internal links):
${pagesStr}

REQUIREMENTS:
- Generate each section listed above in order
- Add {/* Section Name */} comment before each section
- Use <section> tags for each major section
- Consistent spacing: py-16 md:py-24 between sections
- Use primary color (${params.primaryColor}) for CTAs, buttons, accents
- Use secondary color (${params.secondaryColor}) for secondary elements
- placeholder images: use "/placeholder.svg" with width/height props
- Internal links should use <Link> to the correct page paths
- Hero section (if present) should be visually impactful
- Make it look professional and complete — not placeholder-y

Generate the page component code now:`;
}

// ─── Blog Pages (special handling) ───

export function createBlogListingPrompt(params: {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  designStyle: string;
  colorScheme: string;
  description: string;
}): string {
  return `Generate a blog listing page client component for "${params.siteName}".

DESIGN SYSTEM:
- Style: ${params.designStyle}
- Color scheme: ${params.colorScheme}
- Primary color: ${params.primaryColor}
- Secondary color: ${params.secondaryColor}
- Font: ${params.fontFamily}

DESCRIPTION:
${params.description}

THIS IS A CLIENT COMPONENT that receives blog data as props.

COMPONENT SIGNATURE — you MUST use this exact signature:
\`\`\`
'use client';

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

export default function BlogListingPage({ blogs = [], blogBasePath = '/blog' }: { blogs: BlogPost[]; blogBasePath?: string }) {
\`\`\`

REQUIREMENTS:
- Use the EXACT props interface above
- Map over \`blogs\` array to render blog cards
- Each card links to \`\${blogBasePath}/\${blog.slug}\` using <Link>
- Show: featured image (next/image), title, excerpt, date, author, reading time
- Grid layout: 1 col mobile, 2 cols md, 3 cols lg
- Handle empty state: show "No posts yet" message when blogs is empty
- Add {/* Blog Listing */} comment at the top section
- Use the design system colors

Generate the blog listing client component code now:`;
}

export function createBlogPostPrompt(params: {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  designStyle: string;
  colorScheme: string;
  description: string;
}): string {
  return `Generate a blog post detail page client component for "${params.siteName}".

DESIGN SYSTEM:
- Style: ${params.designStyle}
- Color scheme: ${params.colorScheme}
- Primary color: ${params.primaryColor}
- Secondary color: ${params.secondaryColor}
- Font: ${params.fontFamily}

DESCRIPTION:
${params.description}

THIS IS A CLIENT COMPONENT that receives a single blog post as prop.

COMPONENT SIGNATURE — you MUST use this exact signature:
\`\`\`
'use client';

interface BlogPostData {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImage: string;
  publishedAt: string;
  authorName: string;
  authorBio?: string;
  authorAvatar?: string;
  readingTime: number;
  tags: string[];
  category?: { name: string; slug: string };
}

export default function BlogPost({ blog, blogBasePath = '/blog' }: { blog: BlogPostData | null; blogBasePath?: string }) {
\`\`\`

REQUIREMENTS:
- Use the EXACT props interface above
- First check: if (!blog || !blog._id) return "Post not found" UI with link back to blogBasePath
- Featured image hero at top (next/image, unoptimized, fill mode)
- Title, date, author info, reading time, category
- Render blog.body as HTML using dangerouslySetInnerHTML={{ __html: blog.body }}
- Tags display
- Back to blog link using <Link href={blogBasePath}>
- Clean article typography (prose-like styling with Tailwind)
- Add {/* Blog Post */} comment at the top

Generate the blog post client component code now:`;
}

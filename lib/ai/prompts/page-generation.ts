export const PAGE_GENERATION_SYSTEM_PROMPT = `You are an expert Next.js/React developer creating production-ready website pages.

CRITICAL RULES:
1. Generate ONLY valid TypeScript/TSX React components
2. Use Tailwind CSS for ALL styling - no inline styles or CSS modules
3. Use semantic HTML5 elements (header, nav, main, section, article, footer)
4. Components must be fully self-contained and functional
5. All images should use next/image with placeholder dimensions
6. Include proper TypeScript types/interfaces
7. Mobile-first responsive design (sm, md, lg, xl breakpoints)
8. Accessibility: aria-labels, semantic HTML, proper heading hierarchy
9. DO NOT use any external libraries other than those specified
10. Keep the code clean, readable, and production-ready

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

STYLING GUIDELINES:
- Use Tailwind CSS classes exclusively
- Follow mobile-first approach: base styles, then sm:, md:, lg:, xl:
- Use consistent spacing (p-4, p-6, p-8 for padding, space-y-4, gap-6 for gaps)
- Use CSS Grid and Flexbox for layouts
- Apply hover and focus states for interactive elements
- Use proper color contrast for accessibility

BLOG DATA FETCHING (for blog pages):
When creating blog-related pages, the component will receive blogs as a prop:
\`\`\`typescript
interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  publishedAt: string;
  authorName: string;
  readingTime: number;
  tags: string[];
}

interface Props {
  blogs: BlogPost[];
}
\`\`\`

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
}): string => {
  const { description, pageType, existingComponents, projectSettings, pagePath } = params;

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
- The component receives 'blogs' prop with BlogPost[] data`;
      break;

    case 'blog-post':
      pageTypeInstructions = `
This is a BLOG POST template page. Requirements:
- This is a dynamic route page for /blog/[slug]
- Display: title, featured image, author info, publish date, reading time
- Render the blog content (assume HTML content in 'body' prop)
- Include social share buttons
- Add related posts section placeholder
- Include author bio section
- The component receives the full blog post data as props`;
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

Generate the complete page component now:`;
};

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
}): string => {
  const { description, componentName, componentType, projectSettings } = params;

  return `Create a reusable React component named "${componentName}" of type "${componentType}".

DESCRIPTION:
${description}

SITE CONTEXT:
- Site Name: ${projectSettings.siteName}
- Primary Color: ${projectSettings.primaryColor}
- Secondary Color: ${projectSettings.secondaryColor}
- Font Family: ${projectSettings.fontFamily}

REQUIREMENTS:
1. Create a reusable, prop-driven component
2. Define a clear Props interface
3. Use Tailwind CSS for styling
4. Make it responsive (mobile-first)
5. Include proper TypeScript types
6. Add accessibility attributes
7. Export as default

COMPONENT TYPE GUIDELINES:
${componentType === 'layout' ? '- This is a layout component (Header, Footer, Navigation)\n- Should be consistent across pages\n- Include navigation links and branding' : ''}
${componentType === 'section' ? '- This is a page section component\n- Should be self-contained\n- Accept content via props' : ''}
${componentType === 'element' ? '- This is a small, reusable UI element\n- Keep it simple and focused\n- Highly configurable via props' : ''}
${componentType === 'widget' ? '- This is an interactive widget\n- May need client-side state\n- Include loading/error states if applicable' : ''}

Generate the complete component code now:`;
};

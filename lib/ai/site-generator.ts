/**
 * Full-Site Generator using Claude Opus 4.6
 * Option B: Orchestrated multi-call approach
 *
 * Flow:
 * 1. Generate site plan (pages, sections, design system)
 * 2. Generate Header + Footer components
 * 3. Generate each page in parallel
 */

import { getAnthropic, CLAUDE_SONNET } from './claude-client';
import {
  SITE_PLAN_SYSTEM_PROMPT,
  createSitePlanPrompt,
  COMPONENT_SYSTEM_PROMPT,
  createHeaderPrompt,
  createFooterPrompt,
  PAGE_SYSTEM_PROMPT,
  createPagePrompt,
  createBlogListingPrompt,
  createBlogPostPrompt,
} from './prompts/site-generation';
import { processGeneratedCode } from './code-sanitizer';

// ─── Types ───

export interface SitePlan {
  siteName: string;
  description: string;
  designSystem: {
    style: string;
    colorScheme: string;
    mood: string;
  };
  pages: Array<{
    name: string;
    path: string;
    type: 'static' | 'blog-listing' | 'blog-post';
    isHomePage: boolean;
    sections: string[];
    description: string;
  }>;
  components: Array<{
    name: string;
    description: string;
    navLinks?: Array<{ label: string; path: string }>;
  }>;
  blogEnabled: boolean;
}

export interface GeneratedComponent {
  name: string;
  code: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface GeneratedPage {
  name: string;
  path: string;
  type: string;
  isHomePage: boolean;
  code: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  sections: string[];
  description: string;
}

export interface SiteGenerationResult {
  plan: SitePlan;
  components: GeneratedComponent[];
  pages: GeneratedPage[];
  totalTokensUsed: number;
  errors: string[];
}

export type ProgressCallback = (step: string, detail: string, progress: number) => void;

// ─── Main Generator ───

export async function generateFullSite(params: {
  userPrompt: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  onProgress?: ProgressCallback;
}): Promise<SiteGenerationResult> {
  const { userPrompt, siteName, primaryColor, secondaryColor, fontFamily, onProgress } = params;
  const errors: string[] = [];
  let totalTokens = 0;

  const progress = onProgress || (() => {});

  // ── STEP 1: Generate Site Plan ──
  progress('planning', 'Creating site plan...', 5);

  const plan = await generateSitePlan({
    userPrompt,
    siteName,
    primaryColor,
    secondaryColor,
  });

  totalTokens += plan.tokensUsed;
  progress('planning', `Site plan ready: ${plan.data.pages.length} pages`, 15);

  // ── STEP 2: Generate Header & Footer ──
  progress('components', 'Generating Header...', 20);

  const headerDef = plan.data.components.find((c) => c.name === 'Header');
  const footerDef = plan.data.components.find((c) => c.name === 'Footer');
  const navLinks = headerDef?.navLinks || plan.data.pages
    .filter((p) => !p.path.includes('[') && p.type !== 'blog-post')
    .map((p) => ({ label: p.name, path: p.path }));

  const designCtx = {
    siteName: plan.data.siteName,
    primaryColor,
    secondaryColor,
    fontFamily,
    designStyle: plan.data.designSystem.style,
    colorScheme: plan.data.designSystem.colorScheme,
  };

  // Generate header and footer in parallel to save time
  const [headerResult, footerResult] = await Promise.all([
    generateComponent(
      createHeaderPrompt({
        ...designCtx,
        description: headerDef?.description || 'Modern sticky header with navigation',
        navLinks,
      }),
      'Header'
    ),
    generateComponent(
      createFooterPrompt({
        ...designCtx,
        description: footerDef?.description || 'Professional footer with links and contact info',
        navLinks,
      }),
      'Footer'
    ),
  ]);

  totalTokens += headerResult.tokensUsed + footerResult.tokensUsed;
  const components: GeneratedComponent[] = [headerResult.component, footerResult.component];

  progress('components', 'Header & Footer ready', 35);

  // ── STEP 3: Generate Pages (parallel, batched) ──
  const pages: GeneratedPage[] = [];
  const totalPages = plan.data.pages.length;
  const allPageInfo = plan.data.pages.map((p) => ({ name: p.name, path: p.path }));

  // Generate pages in parallel batches of 2 for speed
  const BATCH_SIZE = 2;
  for (let i = 0; i < plan.data.pages.length; i += BATCH_SIZE) {
    const batch = plan.data.pages.slice(i, i + BATCH_SIZE);
    const progressPct = 35 + ((i + batch.length) / totalPages) * 55;
    progress('pages', `Generating ${batch.map((p) => p.name).join(' & ')} (${Math.min(i + BATCH_SIZE, totalPages)}/${totalPages})...`, Math.round(progressPct));

    // Small delay between batches (skip for first batch)
    if (i > 0) await new Promise((r) => setTimeout(r, 2000));

    const batchResults = await Promise.all(
      batch.map((pageDef) => {
        let prompt: string;

        if (pageDef.type === 'blog-listing') {
          prompt = createBlogListingPrompt({
            ...designCtx,
            description: pageDef.description,
          });
        } else if (pageDef.type === 'blog-post') {
          prompt = createBlogPostPrompt({
            ...designCtx,
            description: pageDef.description,
          });
        } else {
          prompt = createPagePrompt({
            ...designCtx,
            pageName: pageDef.name,
            pagePath: pageDef.path,
            pageType: pageDef.type,
            sections: pageDef.sections,
            description: pageDef.description,
            allPages: allPageInfo,
          });
        }

        return generatePageCode(prompt, pageDef.name).then((result) => ({
          pageDef,
          result,
        }));
      })
    );

    for (const { pageDef, result } of batchResults) {
      totalTokens += result.tokensUsed;
      pages.push({
        name: pageDef.name,
        path: pageDef.path,
        type: pageDef.type,
        isHomePage: pageDef.isHomePage,
        code: result.code,
        isValid: result.isValid,
        warnings: result.warnings,
        errors: result.errors,
        sections: pageDef.sections,
        description: pageDef.description,
      });
    }
  }

  // Collect errors
  for (const comp of components) {
    if (!comp.isValid) errors.push(`Component "${comp.name}" has errors: ${comp.errors.join(', ')}`);
  }
  for (const page of pages) {
    if (!page.isValid) errors.push(`Page "${page.name}" has errors: ${page.errors.join(', ')}`);
  }

  progress('complete', 'Site generation complete!', 100);

  return {
    plan: plan.data,
    components,
    pages,
    totalTokensUsed: totalTokens,
    errors,
  };
}

// ─── Step Implementations ───

async function generateSitePlan(params: {
  userPrompt: string;
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
}): Promise<{ data: SitePlan; tokensUsed: number }> {
  const response = await withRetry(async () => {
    const client = getAnthropic();
    return client.messages.create({
      model: CLAUDE_SONNET,
      max_tokens: 4000,
      system: SITE_PLAN_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: createSitePlanPrompt(params) },
      ],
    });
  });

  const rawText = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  if (!rawText) throw new Error('Empty response from AI for site plan');

  // Parse JSON (handle possible markdown wrapping)
  let jsonStr = rawText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const plan = JSON.parse(jsonStr) as SitePlan;

    // Validate and fix plan
    if (!plan.pages || plan.pages.length === 0) {
      plan.pages = [
        { name: 'Home', path: '/', type: 'static', isHomePage: true, sections: ['Hero', 'Features', 'CTA'], description: 'Landing page' },
      ];
    }

    // Ensure home page exists
    if (!plan.pages.some((p) => p.isHomePage)) {
      plan.pages[0].isHomePage = true;
    }

    // Ensure home page has path /
    const homePage = plan.pages.find((p) => p.isHomePage);
    if (homePage) homePage.path = '/';

    // Ensure Header and Footer components
    if (!plan.components) plan.components = [];
    if (!plan.components.find((c) => c.name === 'Header')) {
      plan.components.push({ name: 'Header', description: 'Site header with navigation' });
    }
    if (!plan.components.find((c) => c.name === 'Footer')) {
      plan.components.push({ name: 'Footer', description: 'Site footer' });
    }

    return { data: plan, tokensUsed };
  } catch (e) {
    console.error('Failed to parse site plan JSON:', rawText);
    // Return a sensible default
    return {
      data: {
        siteName: params.siteName,
        description: params.userPrompt,
        designSystem: { style: 'modern', colorScheme: 'light', mood: 'professional' },
        pages: [
          { name: 'Home', path: '/', type: 'static', isHomePage: true, sections: ['Hero', 'Features', 'Testimonials', 'CTA'], description: 'Homepage with hero, features, and call to action' },
          { name: 'About', path: '/about', type: 'static', isHomePage: false, sections: ['About Hero', 'Our Story', 'Team', 'Values'], description: 'About page with team and company info' },
          { name: 'Contact', path: '/contact', type: 'static', isHomePage: false, sections: ['Contact Hero', 'Contact Form', 'Map', 'Info'], description: 'Contact page with form' },
        ],
        components: [
          { name: 'Header', description: 'Modern header with navigation' },
          { name: 'Footer', description: 'Footer with links' },
        ],
        blogEnabled: false,
      },
      tokensUsed,
    };
  }
}

// Retry helper for rate limits — respects retry-after header timing
async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = errMsg.includes('rate_limit') || errMsg.includes('429');
      if (isRateLimit && i < retries - 1) {
        // Try to extract retry-after from error, default to escalating waits
        const retryMatch = errMsg.match(/retry.after.*?(\d+)/i);
        const suggestedWait = retryMatch ? parseInt(retryMatch[1]) * 1000 : 0;
        const delay = Math.max(suggestedWait, (i + 1) * 10000); // At least 10s, 20s, 30s
        console.log(`Rate limited, waiting ${Math.round(delay / 1000)}s before retry ${i + 2}/${retries}...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

async function generateComponent(
  prompt: string,
  name: string
): Promise<{ component: GeneratedComponent; tokensUsed: number }> {
  return withRetry(async () => {
    const client = getAnthropic();

    const response = await client.messages.create({
      model: CLAUDE_SONNET,
      max_tokens: 8000,
      system: COMPONENT_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const rawText = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    if (!rawText) throw new Error(`Empty response from AI for component: ${name}`);

    const sanitized = processGeneratedCode(rawText);

    return {
      component: {
        name,
        code: sanitized.code,
        isValid: sanitized.isValid,
        warnings: sanitized.warnings,
        errors: sanitized.errors,
      },
      tokensUsed,
    };
  });
}

async function generatePageCode(
  prompt: string,
  pageName: string
): Promise<{
  code: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  tokensUsed: number;
}> {
  return withRetry(async () => {
    const client = getAnthropic();

    const response = await client.messages.create({
      model: CLAUDE_SONNET,
      max_tokens: 8000,
      system: PAGE_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const rawText = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    if (!rawText) throw new Error(`Empty response from AI for page: ${pageName}`);

    const sanitized = processGeneratedCode(rawText);

    return {
      code: sanitized.code,
      isValid: sanitized.isValid,
      warnings: sanitized.warnings,
      errors: sanitized.errors,
      tokensUsed,
    };
  });
}

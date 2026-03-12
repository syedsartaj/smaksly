import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content, Website, Category } from '@/models';
import { getAnthropic, CLAUDE_SONNET } from '@/lib/ai/claude-client';
import OpenAI from 'openai';
import mongoose from 'mongoose';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function usesClaude(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const BLOG_SYSTEM_PROMPT = `You are an expert SEO blog writer. You write engaging, well-structured, SEO-optimized blog posts.

RULES:
1. Write in clean HTML (h2, h3, p, ul, ol, li, strong, em, blockquote, a tags)
2. Do NOT use h1 — the title is rendered separately
3. Use short paragraphs (2-3 sentences max) for readability
4. Include relevant subheadings (h2/h3) every 200-300 words
5. Use bullet points and numbered lists where appropriate
6. Write naturally — avoid keyword stuffing
7. Include a compelling introduction and strong conclusion with CTA
8. Add internal link placeholders as: <a href="/blog/SUGGESTED_SLUG">anchor text</a>
9. Target the specified word count closely
10. If asked to include image placeholders, add them as: <figure><img src="IMAGE_PLACEHOLDER_N" alt="descriptive alt text" /><figcaption>Caption text</figcaption></figure> where N is 1,2,3...

Return ONLY valid JSON with this structure:
{
  "title": "SEO-optimized title (50-60 chars ideal)",
  "slug": "url-friendly-slug",
  "excerpt": "Compelling excerpt (150-160 chars)",
  "body": "Full HTML content",
  "metaTitle": "Meta title (max 60 chars)",
  "metaDescription": "Meta description (max 160 chars)",
  "focusKeyword": "Primary keyword",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestedCategory": "Best fitting category name",
  "estimatedReadingTime": 5,
  "imagePrompts": ["Prompt for featured image", "Prompt for in-article image 1", ...]
}`;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      websiteId,
      topic,
      keywords,
      tone = 'professional',
      wordCount = 1500,
      language = 'English',
      includeImages = true,
      imageCount = 2,
      additionalInstructions = '',
      autoSave = false,
    } = body;

    if (!websiteId) {
      return NextResponse.json({ success: false, error: 'Website ID is required' }, { status: 400 });
    }
    if (!topic || topic.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'Topic must be at least 5 characters' }, { status: 400 });
    }

    const website = await Website.findById(websiteId).lean();
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    // Get existing posts for internal linking context
    const existingPosts = await Content.find({
      websiteId: new mongoose.Types.ObjectId(websiteId),
      status: 'published',
      type: 'blog_post',
    })
      .select('title slug')
      .limit(20)
      .lean();

    const existingContext = existingPosts.length > 0
      ? `\nExisting published posts (use for internal linking where natural):\n${existingPosts.map((p) => `- "${p.title}" (/blog/${p.slug})`).join('\n')}`
      : '';

    // Get categories for suggestion
    const categories = await Category.find({ isActive: true }).select('name').lean();
    const categoryNames = categories.map((c) => c.name);

    const userPrompt = `Write a blog post for the website "${(website as Record<string, unknown>).name}" (${(website as Record<string, unknown>).domain}).
Niche: ${(website as Record<string, unknown>).niche || 'General'}

Topic: ${topic}
${keywords ? `Target Keywords: ${keywords}` : ''}
Tone: ${tone}
Language: ${language}
Target Word Count: ${wordCount} words
${includeImages ? `Include ${imageCount} image placeholders with descriptive alt text and generate prompts for AI image generation.` : 'No image placeholders needed.'}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}
${existingContext}
${categoryNames.length > 0 ? `\nAvailable categories: ${categoryNames.join(', ')}` : ''}

Generate a comprehensive, engaging, SEO-optimized blog post. Return ONLY the JSON object.`;

    let rawResponse: string;

    if (usesClaude()) {
      const client = getAnthropic();
      const response = await client.messages.create({
        model: CLAUDE_SONNET,
        max_tokens: 8000,
        system: BLOG_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      rawResponse = response.content[0].type === 'text' ? response.content[0].text : '';
    } else {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: BLOG_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      });
      rawResponse = completion.choices[0]?.message?.content || '';
    }

    // Parse JSON response
    let parsed;
    try {
      let jsonStr = rawResponse.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI blog response:', rawResponse.substring(0, 500));
      return NextResponse.json({ success: false, error: 'Failed to parse generated content. Please try again.' }, { status: 500 });
    }

    // Auto-save if requested
    let savedId = null;
    if (autoSave) {
      const existingSlug = await Content.findOne({
        websiteId: new mongoose.Types.ObjectId(websiteId),
        slug: parsed.slug,
      });
      const finalSlug = existingSlug ? `${parsed.slug}-${Date.now()}` : parsed.slug;

      // Find matching category
      let categoryId = undefined;
      if (parsed.suggestedCategory) {
        // Use case-insensitive exact match without regex to avoid injection
        const cat = await Category.findOne({
          name: { $regex: new RegExp(`^${parsed.suggestedCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          isActive: true,
        });
        if (cat) categoryId = cat._id;
      }

      const saved = await Content.create({
        websiteId: new mongoose.Types.ObjectId(websiteId),
        title: parsed.title,
        slug: finalSlug,
        type: 'blog_post',
        status: 'draft',
        excerpt: parsed.excerpt,
        body: parsed.body,
        metaTitle: (parsed.metaTitle || '').slice(0, 70) || undefined,
        metaDescription: (parsed.metaDescription || '').slice(0, 160) || undefined,
        focusKeyword: parsed.focusKeyword,
        secondaryKeywords: parsed.secondaryKeywords || [],
        tags: parsed.tags || [],
        categoryId,
        authorName: 'Admin',
        isAiGenerated: true,
        wordCount: (parsed.body || '').split(/\s+/).length,
        readingTime: parsed.estimatedReadingTime || Math.ceil((parsed.body || '').split(/\s+/).length / 200),
      });
      savedId = saved._id;
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      savedId,
    });
  } catch (error) {
    console.error('Error generating blog:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate blog' },
      { status: 500 }
    );
  }
}

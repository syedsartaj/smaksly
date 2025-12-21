import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Content, Website, Keyword } from '@/models';
import OpenAI from 'openai';
import mongoose from 'mongoose';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedContent {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    focusKeyword: string;
  };
  headings: string[];
  internalLinkSuggestions: string[];
}

// POST - Generate AI content
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      websiteId,
      keywordId,
      keyword,
      topic,
      type = 'blog',
      tone = 'professional',
      wordCount = 1500,
      includeSchema = true,
      includeInternalLinks = true,
      autoSave = false,
    } = body;

    if (!websiteId) {
      return NextResponse.json(
        { success: false, error: 'Website ID is required' },
        { status: 400 }
      );
    }

    if (!keyword && !keywordId && !topic) {
      return NextResponse.json(
        { success: false, error: 'Keyword, keyword ID, or topic is required' },
        { status: 400 }
      );
    }

    // Get website for context
    const website = await Website.findById(websiteId);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    // Get keyword if ID provided
    let targetKeyword = keyword;
    let keywordData = null;
    if (keywordId) {
      keywordData = await Keyword.findById(keywordId);
      if (keywordData) {
        targetKeyword = keywordData.keyword;
      }
    }

    // Get existing content for internal linking
    let existingContent: string[] = [];
    if (includeInternalLinks) {
      const recentContent = await Content.find({
        websiteId: new mongoose.Types.ObjectId(websiteId),
        status: 'published',
      })
        .select('title slug')
        .limit(20)
        .lean();

      existingContent = recentContent.map((c) => `${c.title} (/blog/${c.slug})`);
    }

    const prompt = `You are an expert SEO content writer. Generate a comprehensive, engaging ${type} article with the following requirements:

Website: ${website.name} (${website.domain})
Niche: ${website.niche || 'General'}
Target Keyword: "${targetKeyword || topic}"
${keywordData ? `Search Volume: ${keywordData.volume}, Difficulty: ${keywordData.difficulty}` : ''}
Tone: ${tone}
Target Word Count: ${wordCount} words

${existingContent.length > 0 ? `
Existing content to potentially link to (use naturally where relevant):
${existingContent.join('\n')}
` : ''}

Requirements:
1. SEO-optimized title that includes the target keyword naturally
2. Compelling meta description (150-160 characters)
3. Clear introduction with hook
4. Well-structured content with H2 and H3 headings
5. Include the target keyword naturally (1-2% density)
6. Include related LSI keywords
7. Actionable, valuable content
8. Strong conclusion with CTA
9. Internal link suggestions based on provided content

${includeSchema ? 'Include FAQ schema content (3-5 Q&As related to the topic).' : ''}

Format your response as JSON with this structure:
{
  "title": "SEO optimized title",
  "slug": "url-friendly-slug",
  "excerpt": "Brief excerpt (2-3 sentences)",
  "content": "Full HTML formatted content with proper heading tags (h2, h3), paragraphs, lists, etc.",
  "seo": {
    "metaTitle": "Meta title (max 60 chars)",
    "metaDescription": "Meta description (max 160 chars)",
    "focusKeyword": "Target keyword"
  },
  "headings": ["H2 headings used in content"],
  "internalLinkSuggestions": ["Title (URL) - suggested anchor text"]
  ${includeSchema ? ',"faqSchema": [{"question": "Q", "answer": "A"}]' : ''}
}

Return ONLY the JSON object, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert SEO content writer. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';

    let generatedContent: GeneratedContent;
    try {
      const cleanContent = responseContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      generatedContent = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI response:', responseContent);
      return NextResponse.json(
        { success: false, error: 'Failed to parse generated content' },
        { status: 500 }
      );
    }

    // Auto-save to database if requested
    let savedContent = null;
    if (autoSave) {
      // Check for duplicate slug
      const existingSlug = await Content.findOne({
        websiteId: new mongoose.Types.ObjectId(websiteId),
        slug: generatedContent.slug,
      });

      const finalSlug = existingSlug
        ? `${generatedContent.slug}-${Date.now()}`
        : generatedContent.slug;

      savedContent = await Content.create({
        websiteId: new mongoose.Types.ObjectId(websiteId),
        title: generatedContent.title,
        slug: finalSlug,
        type: type === 'blog' ? 'blog_post' : type,
        status: 'draft',
        excerpt: generatedContent.excerpt,
        body: generatedContent.content,
        metaTitle: generatedContent.seo?.metaTitle,
        metaDescription: generatedContent.seo?.metaDescription,
        focusKeyword: generatedContent.seo?.focusKeyword,
        keywordId: keywordId
          ? new mongoose.Types.ObjectId(keywordId)
          : undefined,
        wordCount: generatedContent.content.split(/\s+/).length,
        readingTime: Math.ceil(
          generatedContent.content.split(/\s+/).length / 200
        ),
        isAiGenerated: true,
      });

      // Update keyword status
      if (keywordId) {
        await Keyword.findByIdAndUpdate(keywordId, {
          status: 'assigned',
          contentId: savedContent._id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: generatedContent,
      saved: autoSave,
      contentId: savedContent?._id,
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

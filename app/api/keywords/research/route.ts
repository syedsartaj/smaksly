import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Keyword } from '@/models';
import OpenAI from 'openai';
import mongoose from 'mongoose';

// Lazy-load OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface KeywordSuggestion {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: 'informational' | 'navigational' | 'commercial' | 'transactional';
  topic: string;
}

// POST - Generate keyword suggestions using AI
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      seedKeyword,
      niche,
      websiteId,
      categoryId,
      count = 50,
      intent = 'all',
      autoSave = false,
    } = body;

    if (!seedKeyword && !niche) {
      return NextResponse.json(
        { success: false, error: 'Seed keyword or niche is required' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert SEO keyword researcher. Generate ${count} highly relevant keyword suggestions for the following:

${seedKeyword ? `Seed Keyword: "${seedKeyword}"` : ''}
${niche ? `Niche/Industry: "${niche}"` : ''}
${intent !== 'all' ? `Intent Filter: "${intent}" intent keywords only` : ''}

For each keyword, provide:
1. The keyword phrase (focus on long-tail, high-intent keywords)
2. Estimated monthly search volume (realistic estimates based on niche)
3. Keyword difficulty score (0-100)
4. Estimated CPC in USD
5. Search intent (informational, navigational, commercial, or transactional)
6. Topic/Category

Format your response as a JSON array with objects containing: keyword, volume, difficulty, cpc, intent, topic

Focus on:
- Long-tail keywords (3-6 words)
- Mix of high-volume and low-competition keywords
- Buyer intent keywords for commercial niches
- Question-based keywords
- Comparison keywords
- "Best", "Top", "How to" variations

Return ONLY the JSON array, no additional text.`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert. Return only valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || '[]';

    // Parse JSON response
    let suggestions: KeywordSuggestion[];
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      suggestions = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { success: false, error: 'Failed to parse keyword suggestions' },
        { status: 500 }
      );
    }

    // Auto-save to database if requested
    if (autoSave && suggestions.length > 0) {
      const keywordsToInsert = suggestions.map((kw) => ({
        keyword: kw.keyword,
        volume: kw.volume,
        difficulty: kw.difficulty,
        cpc: Math.round(kw.cpc * 100), // Store in cents
        intent: kw.intent,
        topic: kw.topic,
        websiteId: websiteId ? new mongoose.Types.ObjectId(websiteId) : undefined,
        categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
        status: 'new',
        priority: kw.difficulty < 30 ? 'high' : kw.difficulty < 60 ? 'medium' : 'low',
        source: 'ai-research',
      }));

      await Keyword.insertMany(keywordsToInsert, { ordered: false }).catch((error) => {
        if (error.code !== 11000) throw error;
      });
    }

    return NextResponse.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
      saved: autoSave,
    });
  } catch (error) {
    console.error('Error generating keywords:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate keyword suggestions' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAnthropic, CLAUDE_SONNET } from '@/lib/ai/claude-client';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function usesClaude(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const EDIT_SYSTEM_PROMPT = `You are an expert blog editor. The user will provide their current blog post content (HTML) and an editing instruction. Apply the requested changes precisely.

RULES:
1. Preserve the existing HTML structure and formatting
2. Only modify what the user asks — do not rewrite the entire post unless asked
3. Keep SEO optimization intact
4. If adding images, use: <figure><img src="IMAGE_PLACEHOLDER_N" alt="descriptive alt text" /><figcaption>Caption</figcaption></figure>
5. If the user asks to improve SEO, adjust headings, keyword density, and meta tags
6. Return the complete updated content, not just the changed parts

Return ONLY valid JSON:
{
  "body": "Updated full HTML content",
  "title": "Updated title (only if changed, otherwise same)",
  "excerpt": "Updated excerpt (only if changed)",
  "metaTitle": "Updated meta title (only if changed)",
  "metaDescription": "Updated meta description (only if changed)",
  "changesSummary": "Brief description of what was changed",
  "newImagePrompts": ["Prompt for any new images added"]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentContent, instruction, title, excerpt, metaTitle, metaDescription } = body;

    if (!currentContent || !instruction) {
      return NextResponse.json(
        { success: false, error: 'Current content and instruction are required' },
        { status: 400 }
      );
    }

    const userPrompt = `Current blog post:
Title: ${title || 'Untitled'}
Excerpt: ${excerpt || 'None'}
Meta Title: ${metaTitle || 'None'}
Meta Description: ${metaDescription || 'None'}

Content (HTML):
${currentContent}

---

Editing instruction: ${instruction}

Apply the requested changes and return the updated JSON.`;

    let rawResponse: string;

    if (usesClaude()) {
      const client = getAnthropic();
      const response = await client.messages.create({
        model: CLAUDE_SONNET,
        max_tokens: 8000,
        system: EDIT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      rawResponse = response.content[0].type === 'text' ? response.content[0].text : '';
    } else {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: EDIT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 8000,
      });
      rawResponse = completion.choices[0]?.message?.content || '';
    }

    let parsed;
    try {
      let jsonStr = rawResponse.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Error editing blog:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to edit blog' },
      { status: 500 }
    );
  }
}

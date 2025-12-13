import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// 🔍 Utility to fetch a Pexels image by keyword
async function getImageFromPexels(keyword: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY!,
        },
      }
    );
    const data = await res.json();
    const photo = data.photos?.[0];
    return photo?.src?.large || 'https://via.placeholder.com/1600x900?text=Image+Not+Found';
  } catch (err) {
    console.error('❌ Failed to fetch Pexels image:', err);
    return 'https://via.placeholder.com/1600x900?text=Error+Loading+Image';
  }
}

export async function POST(req: Request) {
  const { keyword } = await req.json();
  const pexelsImageUrl = await getImageFromPexels(keyword);

  const prompt = `
You are a professional SEO content writer and JSON generator. Your job is to create a high-quality, long-form blog article in JSON format using the structure defined below.

❗IMPORTANT INSTRUCTIONS:
- use american slang
- DO NOT return anything except the JSON object.
- DO NOT wrap the JSON in backticks or markdown.
- DO NOT include comments or explanations.
- The JSON MUST strictly match the format provided.

✅ ARTICLE REQUIREMENTS:
- Length: At least 2000 words.
- Format: Use Tailwind CSS-friendly HTML (e.g., <div class='prose max-w-none text-black'>...</div>) with perfect spacing and line breaks after every paragraph.
- Structure: Write 7 to 8 well-organized and informative paragraphs.
- Add key highlights with bullet points along with a brief intro if needed.
- Use multiple <h2> tags that match keyword-related headings. Make the tags bold and styled appropriately.
- Make the content rich, professional, and SEO-optimized.
- Cross-check and avoid broken links.
- Ensure links are placed naturally inside the paragraphs.
- Add 3–5 frequently asked questions based on web search relevance.
- Remove ** symbols from the entire article body.

🔗 IMAGE REQUIREMENT:
- Use this Pexels image URL for the article: ${pexelsImageUrl}
- Do NOT leave the image_url field blank.

📌 KEYWORD:
"${keyword}"

📤 RETURN THIS EXACT JSON STRUCTURE:
{
  "title": "...",
  "image_url": "${pexelsImageUrl}",
  "robottxt_headline": "...",
  "robottxt_auther_name": "John Doe",
  "robottxt_publish_date": "2025-07-11",
  "category": "Tech",
  "body": "<div class='prose max-w-none text-black'>...</div>"
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    let raw = completion.choices[0].message.content?.trim() || '';

    if (raw.startsWith('```json') || raw.startsWith('```')) {
      raw = raw.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error('❌ JSON parse error:', err);
      return NextResponse.json(
        { error: 'Failed to parse response. Model returned invalid JSON.', raw },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('❌ API call failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error occurred.' },
      { status: 500 }
    );
  }
}

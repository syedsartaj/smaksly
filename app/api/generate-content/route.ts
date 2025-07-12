import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { keyword } = await req.json();

const prompt = `
You are a professional SEO content writer and JSON generator. Your job is to create a high-quality, long-form blog article in JSON format using the structure defined below.

❗IMPORTANT INSTRUCTIONS:
- DO NOT return anything except the JSON object.
- DO NOT wrap the JSON in backticks or markdown.
- DO NOT include comments or explanations.
- The JSON MUST strictly match the format provided.

✅ ARTICLE REQUIREMENTS:
- Length: At least 2000 words.
- Format: Use Tailwind CSS-friendly HTML (e.g., <div class='prose max-w-none text-black'>...</div>) add the perfect spacing and line breaks after every paragphs .
- Structure: Write 7 to 8 well-organized and informative paragraphs.
- add key highlights with bullet points along with breif intro if needed
- Use multiple <h2> tags that match keyword-related headings make the tags  bold and use the respective fonts.
- Make the content rich, professional, and SEO-optimized.
- Add <a href="...">...</a> tags with styled clickable links pointing to high-authority external websites (e.g., Wikipedia, Google Developers, MDN) make the stylish and clickable.
- cross check and avoid broken links.
- Ensure that links are placed naturally inside the paragraphs.
- asearch on web add 3 - 5 frequently asked questions which is more relatable
- remove ** symbols from the entire article body

🔗 IMAGE REQUIREMENT:
- Include a keyword-related, high-quality image using Unsplash.
- Format: \`https://source.unsplash.com/1600x900/?<keyword>\`
- Do NOT leave the image_url field blank.

🔍 USE CASE EXAMPLES (FOR CONTEXT):
- Analyze top-ranking SERP pages to generate article content.
- Include relevant content outlines based on competitor analysis.
- Integrate Google Search Console keywords if applicable.
- Mention tools like GPT-3, AI content generators, WordPress plugins.

📌 KEYWORD:
"${keyword}"

📤 RETURN THIS EXACT JSON STRUCTURE:
{
  "title": "...",
  "image_url": "https://source.unsplash.com/1600x900/?${encodeURIComponent(keyword)}",
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

    // ✅ Strip Markdown-style code block if it exists
    if (raw.startsWith('```json') || raw.startsWith('```')) {
      raw = raw.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON parse error:", err);
      return NextResponse.json(
        { error: 'Failed to parse response. Model returned invalid JSON.', raw },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("❌ API call failed:", error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error occurred.' },
      { status: 500 }
    );
  }
}

import mongoose from 'mongoose';
import OpenAI from 'openai';
import { connectDB } from '@/lib/db';
import { Content, Website, Keyword } from '@/models';
import type { SEOArticle, ContentGenerationOptions, FAQ, InternalLink, ArticleMeta } from '@/types/content';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export async function generateSEOArticle(options: ContentGenerationOptions): Promise<SEOArticle> {
  await connectDB();
  const { websiteId, keywordId, keyword: rawKeyword, tone = 'professional', wordCount = 1800, includeInternalLinks = true } = options;

  const website = await Website.findById(websiteId);
  if (!website) throw new Error(`Website not found: ${websiteId}`);

  let targetKeyword = rawKeyword || '';
  let keywordData = null;
  if (keywordId) {
    keywordData = await Keyword.findById(keywordId);
    if (keywordData) targetKeyword = keywordData.keyword;
  }
  if (!targetKeyword) throw new Error('No keyword provided');

  let existingContent: { title: string; slug: string; id: string }[] = [];
  if (includeInternalLinks) {
    existingContent = await Content.find({ websiteId: new mongoose.Types.ObjectId(websiteId), status: 'published' })
      .select('title slug _id').limit(30).lean()
      .then((docs) => docs.map((d) => ({ title: d.title, slug: d.slug, id: d._id.toString() })));
  }

  const internalLinksContext = existingContent.length > 0
    ? `\nExisting published articles to link to naturally:\n${existingContent.map((c) => `- "${c.title}" → /blog/${c.slug}`).join('\n')}\n` : '';

  const prompt = `You are an expert SEO content writer. Generate a comprehensive, ${tone} article.

Website: ${website.name} (${website.domain})
Niche: ${website.niche || 'General'}
Target Keyword: "${targetKeyword}"
${keywordData ? `Search Volume: ${keywordData.volume}, Difficulty: ${keywordData.difficulty}` : ''}
Target Word Count: ${wordCount}+ words
${internalLinksContext}
REQUIREMENTS:
1. SEO-optimized title with target keyword
2. Compelling introduction with hook (first 100 words must include keyword)
3. Well-structured H2 and H3 headings (minimum 5 H2s)
4. Target keyword density: 1-2%
5. Include LSI keywords naturally
6. Actionable, valuable content
7. Strong conclusion with CTA
8. 3-5 FAQ items related to the topic
9. Meta title (max 60 chars) and meta description (max 155 chars)
10. Generate a URL-friendly slug
${includeInternalLinks && existingContent.length > 0 ? '11. Naturally weave in 2-4 internal links from the provided list' : ''}

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "title": "Article Title",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence excerpt",
  "markdown": "Full article in Markdown format with ## and ### headings",
  "headings": ["H2 heading 1", "H2 heading 2"],
  "faqs": [{"question": "Q?", "answer": "A."}],
  "internalLinks": [{"anchorText": "text", "url": "/blog/slug"}],
  "meta": {
    "metaTitle": "Title | Site",
    "metaDescription": "Description under 155 chars",
    "focusKeyword": "${targetKeyword}",
    "secondaryKeywords": ["kw1", "kw2", "kw3"]
  },
  "tags": ["tag1", "tag2", "tag3"],
  "category": "${website.niche || 'General'}"
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert SEO content writer. Return only valid JSON. No markdown fencing.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 12000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error('Failed to parse AI-generated content'); }

  const markdown = parsed.markdown as string || '';
  const wordCountActual = markdown.split(/\s+/).filter(Boolean).length;

  return {
    title: parsed.title as string || targetKeyword,
    slug: parsed.slug as string || targetKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    excerpt: parsed.excerpt as string || '',
    markdown,
    frontmatter: {
      title: parsed.title as string || targetKeyword,
      date: new Date().toISOString(),
      description: (parsed.meta as Record<string, string>)?.metaDescription || '',
      author: 'Smaksly AI',
      category: parsed.category as string || website.niche || 'General',
      tags: (parsed.tags as string[]) || [],
      featuredImage: '',
      focusKeyword: targetKeyword,
      draft: false,
    },
    headings: (parsed.headings as string[]) || [],
    faqs: (parsed.faqs as FAQ[]) || [],
    internalLinks: (parsed.internalLinks as InternalLink[]) || [],
    meta: (parsed.meta as ArticleMeta) || { metaTitle: parsed.title as string, metaDescription: '', focusKeyword: targetKeyword, secondaryKeywords: [] },
    wordCount: wordCountActual,
    readingTime: Math.ceil(wordCountActual / 200),
  };
}

export function buildMarkdownWithFrontmatter(article: SEOArticle): string {
  const fm = article.frontmatter;
  const frontmatter = [
    '---', `title: "${fm.title.replace(/"/g, '\\"')}"`, `date: "${fm.date}"`,
    `description: "${fm.description.replace(/"/g, '\\"')}"`, `author: "${fm.author}"`,
    `category: "${fm.category}"`, `tags: [${fm.tags.map((t) => `"${t}"`).join(', ')}]`,
    `focusKeyword: "${fm.focusKeyword}"`, `readingTime: ${article.readingTime}`,
    `wordCount: ${article.wordCount}`, `draft: ${fm.draft}`, '---', '',
  ].join('\n');

  let content = article.markdown;
  if (article.faqs.length > 0 && !content.includes('## FAQ') && !content.includes('## Frequently Asked')) {
    content += '\n\n## Frequently Asked Questions\n\n';
    for (const faq of article.faqs) content += `### ${faq.question}\n\n${faq.answer}\n\n`;
  }
  return frontmatter + content;
}

export async function saveArticleToDB(websiteId: string, article: SEOArticle, keywordId?: string): Promise<string> {
  await connectDB();
  const existing = await Content.findOne({ websiteId: new mongoose.Types.ObjectId(websiteId), slug: article.slug });
  const finalSlug = existing ? `${article.slug}-${Date.now()}` : article.slug;

  const htmlBody = markdownToBasicHTML(article.markdown);
  const website = await Website.findById(websiteId);

  const content = await Content.create({
    websiteId: new mongoose.Types.ObjectId(websiteId),
    keywordId: keywordId ? new mongoose.Types.ObjectId(keywordId) : undefined,
    title: article.title, slug: finalSlug, excerpt: article.excerpt, body: htmlBody,
    type: 'blog_post', intent: 'informational', categoryId: website?.categoryId,
    status: 'draft', metaTitle: article.meta.metaTitle, metaDescription: article.meta.metaDescription,
    focusKeyword: article.meta.focusKeyword, secondaryKeywords: article.meta.secondaryKeywords,
    tags: article.frontmatter.tags, wordCount: article.wordCount, readingTime: article.readingTime,
    isAiGenerated: true, aiModel: 'gpt-4o',
    internalLinks: article.internalLinks.map((l) => ({ anchorText: l.anchorText, url: l.url })),
    schemaMarkup: article.faqs.length > 0
      ? { type: 'FAQPage', data: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: article.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) } }
      : { type: 'Article', data: {} },
  });

  if (keywordId) await Keyword.findByIdAndUpdate(keywordId, { status: 'content_created', contentId: content._id });
  return content._id.toString();
}

function markdownToBasicHTML(md: string): string {
  let html = md;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  const lines = html.split('\n');
  return lines.map((line) => {
    const t = line.trim();
    if (!t) return '';
    if (t.startsWith('<')) return t;
    return `<p>${t}</p>`;
  }).filter(Boolean).join('\n');
}

export async function generateAndSaveArticle(websiteId: string, keywordId: string) {
  const article = await generateSEOArticle({ websiteId, keywordId, autoSave: false });
  const markdown = buildMarkdownWithFrontmatter(article);
  const contentId = await saveArticleToDB(websiteId, article, keywordId);
  return { contentId, markdown, article };
}

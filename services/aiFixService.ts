import mongoose from 'mongoose';
import OpenAI from 'openai';
import { connectDB } from '@/lib/db';
import { Issue, Content, Website } from '@/models';
import type { IIssue } from '@/models/Issue';
import type { FixResult } from '@/types/issue';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export async function analyzeIssue(issueId: string): Promise<{ suggestion: string; autoFixable: boolean; fixType: string }> {
  await connectDB();
  const issue = await Issue.findById(issueId);
  if (!issue) throw new Error(`Issue not found: ${issueId}`);

  switch (issue.type) {
    case 'content_issue':
      return { suggestion: 'Regenerate or expand the article content with AI to meet minimum word count.', autoFixable: true, fixType: 'regenerate_article' };
    case 'seo_issue':
      if (issue.title.includes('Missing')) return { suggestion: 'Generate missing meta tags using AI.', autoFixable: true, fixType: 'update_meta' };
      if (issue.title.includes('Duplicate')) return { suggestion: 'Generate unique title variants for duplicate pages.', autoFixable: true, fixType: 'update_meta' };
      if (issue.title.includes('Orphan')) return { suggestion: 'Add internal links from related articles.', autoFixable: true, fixType: 'add_internal_links' };
      return { suggestion: issue.suggestion, autoFixable: false, fixType: 'manual' };
    case 'broken_link':
      return { suggestion: 'Remove or replace the broken link.', autoFixable: true, fixType: 'fix_broken_link' };
    case 'indexing_issue':
      return { suggestion: 'Resubmit URLs to Google Indexing API.', autoFixable: true, fixType: 'resubmit_indexing' };
    case 'speed_issue':
      return { suggestion: 'Performance optimization requires manual intervention.', autoFixable: false, fixType: 'manual' };
    case 'ranking_drop':
      return { suggestion: 'Analyze ranking changes and review content quality.', autoFixable: false, fixType: 'manual' };
    default:
      return { suggestion: issue.suggestion, autoFixable: false, fixType: 'manual' };
  }
}

export async function applyAutoFix(issueId: string): Promise<FixResult> {
  await connectDB();
  const issue = await Issue.findById(issueId);
  if (!issue) throw new Error(`Issue not found: ${issueId}`);
  if (!issue.autoFixable) return { success: false, message: 'Issue is not auto-fixable' };

  await Issue.findByIdAndUpdate(issueId, { status: 'fixing' });

  try {
    let result: FixResult;

    switch (issue.type) {
      case 'content_issue':
        result = await fixThinContent(issue);
        break;
      case 'seo_issue':
        if (issue.title.includes('Missing')) result = await fixMissingMeta(issue);
        else if (issue.title.includes('Orphan')) result = await fixOrphanPages(issue);
        else result = { success: false, message: 'No auto-fix available for this SEO issue type' };
        break;
      case 'broken_link':
        result = await fixBrokenLink(issue);
        break;
      case 'indexing_issue':
        result = await fixIndexingIssue(issue);
        break;
      default:
        result = { success: false, message: `No auto-fix handler for issue type: ${issue.type}` };
    }

    await Issue.findByIdAndUpdate(issueId, {
      status: result.success ? 'fixed' : 'open',
      fixAppliedAt: result.success ? new Date() : undefined,
      resolvedAt: result.success ? new Date() : undefined,
      fixResult: result,
      fixType: issue.type === 'content_issue' ? 'regenerate_article' : issue.type === 'broken_link' ? 'fix_broken_link' : issue.type === 'indexing_issue' ? 'resubmit_indexing' : 'update_meta',
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during auto-fix';
    await Issue.findByIdAndUpdate(issueId, { status: 'open', fixResult: { success: false, message } });
    return { success: false, message };
  }
}

async function fixThinContent(issue: IIssue): Promise<FixResult> {
  const contentId = issue.details?.contentId as string || issue.contentId?.toString();
  if (!contentId) return { success: false, message: 'No content ID associated with this issue' };

  const content = await Content.findById(contentId);
  if (!content) return { success: false, message: `Content not found: ${contentId}` };

  const website = await Website.findById(content.websiteId);
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert SEO content writer. Expand the given article to at least 1200 words while maintaining quality, adding valuable information, examples, and actionable advice. Return only the expanded HTML content.' },
      { role: 'user', content: `Website: ${website?.name || 'Unknown'}\nNiche: ${website?.niche || 'General'}\nCurrent Title: ${content.title}\nFocus Keyword: ${content.focusKeyword || ''}\nCurrent Word Count: ${content.wordCount}\nCurrent Content:\n${content.body.slice(0, 8000)}` },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  const expandedBody = completion.choices[0]?.message?.content || '';
  if (!expandedBody) return { success: false, message: 'AI returned empty content' };

  const newWordCount = expandedBody.split(/\s+/).filter(Boolean).length;
  await Content.findByIdAndUpdate(contentId, {
    body: expandedBody,
    wordCount: newWordCount,
    readingTime: Math.ceil(newWordCount / 200),
  });

  return {
    success: true,
    message: `Content expanded from ${content.wordCount} to ${newWordCount} words`,
    changes: { oldWordCount: content.wordCount, newWordCount },
  };
}

async function fixMissingMeta(issue: IIssue): Promise<FixResult> {
  const url = issue.details?.url as string;
  if (!url) return { success: false, message: 'No URL in issue details' };

  const slug = url.split('/blog/').pop()?.replace(/\/$/, '');
  if (!slug) return { success: false, message: 'Could not extract slug from URL' };

  const content = await Content.findOne({
    websiteId: issue.websiteId,
    slug,
  });
  if (!content) return { success: false, message: `Content not found for slug: ${slug}` };

  const openai = getOpenAI();
  const updates: Record<string, string> = {};
  const missingTitle = issue.details?.missingTitle as boolean;
  const missingDescription = issue.details?.missingDescription as boolean;
  const missingCanonical = issue.details?.missingCanonical as boolean;

  if (missingTitle || missingDescription) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Generate SEO meta tags. Return JSON only: {"metaTitle": "max 60 chars", "metaDescription": "max 155 chars"}' },
        { role: 'user', content: `Title: ${content.title}\nKeyword: ${content.focusKeyword || ''}\nExcerpt: ${content.excerpt || ''}` },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    try {
      const raw = completion.choices[0]?.message?.content || '{}';
      const meta = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      if (missingTitle && meta.metaTitle) updates.metaTitle = meta.metaTitle;
      if (missingDescription && meta.metaDescription) updates.metaDescription = meta.metaDescription;
    } catch {
      return { success: false, message: 'Failed to parse AI-generated meta tags' };
    }
  }

  const website = await Website.findById(issue.websiteId);
  if (missingCanonical && website) {
    const domain = website.customDomain || website.domain;
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    updates.canonicalUrl = `${baseUrl}/blog/${slug}`;
  }

  if (Object.keys(updates).length === 0) return { success: false, message: 'No meta updates generated' };

  await Content.findByIdAndUpdate(content._id, { $set: updates });
  return {
    success: true,
    message: `Updated ${Object.keys(updates).join(', ')} for "${content.title}"`,
    changes: updates,
  };
}

async function fixBrokenLink(issue: IIssue): Promise<FixResult> {
  const sourceUrl = issue.details?.sourceUrl as string;
  const targetUrl = issue.details?.targetUrl as string;
  if (!sourceUrl || !targetUrl) return { success: false, message: 'Missing source or target URL in issue details' };

  const slug = sourceUrl.split('/blog/').pop()?.replace(/\/$/, '');
  if (!slug) return { success: false, message: 'Could not extract slug' };

  const content = await Content.findOne({ websiteId: issue.websiteId, slug });
  if (!content) return { success: false, message: `Content not found for slug: ${slug}` };

  const updatedBody = content.body.replace(
    new RegExp(`href=["']${targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
    'href="#" data-broken-link-removed="true"'
  );

  const outboundLinks = (content.outboundLinks || []).filter(
    (l: { url: string }) => l.url !== targetUrl
  );

  await Content.findByIdAndUpdate(content._id, { body: updatedBody, outboundLinks });

  return {
    success: true,
    message: `Removed broken link to "${targetUrl}" from "${content.title}"`,
    changes: { removedUrl: targetUrl, sourceSlug: slug },
  };
}

async function fixIndexingIssue(issue: IIssue): Promise<FixResult> {
  const website = await Website.findById(issue.websiteId);
  if (!website) return { success: false, message: 'Website not found' };
  if (!website.gscConnected) return { success: false, message: 'GSC not connected for this website' };

  const unindexedContent = await Content.find({
    websiteId: issue.websiteId,
    status: 'published',
  }).select('slug').limit(20).lean();

  const domain = website.customDomain || website.domain;
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const urls = unindexedContent.map((c) => `${baseUrl}/blog/${c.slug}`);

  return {
    success: true,
    message: `Prepared ${urls.length} URLs for indexing resubmission. Use the Indexing API endpoint to submit them.`,
    changes: { urls, count: urls.length },
  };
}

async function fixOrphanPages(issue: IIssue): Promise<FixResult> {
  const orphanSlug = issue.details?.slug as string;
  if (!orphanSlug) return { success: false, message: 'No slug in issue details' };

  const orphanContent = await Content.findOne({ websiteId: issue.websiteId, slug: orphanSlug });
  if (!orphanContent) return { success: false, message: `Content not found for slug: ${orphanSlug}` };

  const relatedContent = await Content.find({
    websiteId: issue.websiteId,
    status: 'published',
    slug: { $ne: orphanSlug },
  }).select('title slug body').limit(5).lean();

  if (relatedContent.length === 0) return { success: false, message: 'No related content available to add internal links' };

  let linksAdded = 0;
  for (const related of relatedContent.slice(0, 2)) {
    const linkHtml = ` <a href="/blog/${orphanSlug}">${orphanContent.title}</a>`;
    const bodyLines = related.body.split('</p>');
    if (bodyLines.length > 2) {
      const insertAt = Math.floor(bodyLines.length / 2);
      bodyLines[insertAt] = bodyLines[insertAt] + ` Also check out:${linkHtml}.`;
      await Content.findByIdAndUpdate(related._id, {
        body: bodyLines.join('</p>'),
        $push: { internalLinks: { anchorText: orphanContent.title, url: `/blog/${orphanSlug}` } },
      });
      linksAdded++;
    }
  }

  return {
    success: linksAdded > 0,
    message: linksAdded > 0 ? `Added ${linksAdded} internal links pointing to "${orphanSlug}"` : 'Could not find suitable positions to add links',
    changes: { orphanSlug, linksAdded },
  };
}

export async function autoFixAllForSite(siteId: string): Promise<{ fixed: number; failed: number; skipped: number }> {
  await connectDB();
  const openIssues = await Issue.find({
    websiteId: new mongoose.Types.ObjectId(siteId),
    status: 'open',
    autoFixable: true,
  }).sort({ severity: -1 }).limit(20);

  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const issue of openIssues) {
    try {
      const result = await applyAutoFix(issue._id.toString());
      if (result.success) fixed++;
      else failed++;
    } catch (error) {
      console.error(`[AIFixService] Failed to fix issue ${issue._id}:`, error);
      failed++;
    }
  }

  console.log(`[AIFixService] Site ${siteId}: fixed=${fixed}, failed=${failed}, skipped=${skipped}`);
  return { fixed, failed, skipped };
}

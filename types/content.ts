export interface SEOArticle {
  title: string;
  slug: string;
  excerpt: string;
  markdown: string;
  frontmatter: ArticleFrontmatter;
  headings: string[];
  faqs: FAQ[];
  internalLinks: InternalLink[];
  meta: ArticleMeta;
  wordCount: number;
  readingTime: number;
}

export interface ArticleFrontmatter {
  title: string;
  date: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  featuredImage: string;
  focusKeyword: string;
  draft: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface InternalLink {
  anchorText: string;
  url: string;
  contentId?: string;
}

export interface ArticleMeta {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  ogImage?: string;
}

export interface ContentGenerationOptions {
  websiteId: string;
  keywordId?: string;
  keyword?: string;
  tone?: 'professional' | 'casual' | 'authoritative' | 'friendly';
  wordCount?: number;
  includeSchema?: boolean;
  includeInternalLinks?: boolean;
  autoSave?: boolean;
  autoPublish?: boolean;
}

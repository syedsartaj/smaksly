import { MeiliSearch, Index, SearchParams, SearchResponse } from 'meilisearch';

// Meilisearch client
export const meilisearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
});

// Index names
export const INDEX_NAMES = {
  WEBSITES: 'websites',
  KEYWORDS: 'keywords',
  CONTENT: 'content',
  PARTNERS: 'partners',
} as const;

// Website document type for search
export interface WebsiteSearchDocument {
  id: string;
  name: string;
  domain: string;
  niche: string;
  category: string;
  description: string;
  da: number; // Domain Authority
  dr: number; // Domain Rating
  traffic: number; // Monthly traffic
  country: string;
  language: string;
  price: number;
  currency: string;
  acceptsGuestPosts: boolean;
  doFollow: boolean;
  turnaroundDays: number;
  contentGuidelines: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown; // Index signature for compatibility
}

// Keyword document type for search
export interface KeywordSearchDocument {
  id: string;
  keyword: string;
  websiteId: string;
  category: string;
  volume: number;
  difficulty: number;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  cpc: number;
  assignedToWebsite: boolean;
  status: 'pending' | 'assigned' | 'published';
  createdAt: number;
  [key: string]: unknown; // Index signature for compatibility
}

// Content document type for search
export interface ContentSearchDocument {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  websiteId: string;
  websiteName: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  publishedAt: number;
  createdAt: number;
  [key: string]: unknown; // Index signature for compatibility
}

// Initialize indexes with settings
export const initializeIndexes = async (): Promise<void> => {
  // Websites index
  const websitesIndex = meilisearch.index(INDEX_NAMES.WEBSITES);
  await websitesIndex.updateSettings({
    searchableAttributes: ['name', 'domain', 'niche', 'category', 'description', 'tags'],
    filterableAttributes: [
      'niche',
      'category',
      'country',
      'language',
      'da',
      'dr',
      'traffic',
      'price',
      'acceptsGuestPosts',
      'doFollow',
      'turnaroundDays',
    ],
    sortableAttributes: ['da', 'dr', 'traffic', 'price', 'createdAt', 'updatedAt'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });

  // Keywords index
  const keywordsIndex = meilisearch.index(INDEX_NAMES.KEYWORDS);
  await keywordsIndex.updateSettings({
    searchableAttributes: ['keyword', 'category'],
    filterableAttributes: ['websiteId', 'category', 'intent', 'status', 'volume', 'difficulty'],
    sortableAttributes: ['volume', 'difficulty', 'cpc', 'createdAt'],
  });

  // Content index
  const contentIndex = meilisearch.index(INDEX_NAMES.CONTENT);
  await contentIndex.updateSettings({
    searchableAttributes: ['title', 'excerpt', 'tags', 'category'],
    filterableAttributes: ['websiteId', 'category', 'status', 'tags'],
    sortableAttributes: ['publishedAt', 'createdAt'],
  });
};

// Generic search function
export const search = async <T extends Record<string, unknown>>(
  indexName: string,
  query: string,
  options?: SearchParams
): Promise<SearchResponse<T>> => {
  const index = meilisearch.index(indexName);
  return index.search<T>(query, options);
};

// Website-specific search for partner portal
export const searchWebsites = async (
  query: string,
  filters?: {
    niche?: string;
    category?: string;
    country?: string;
    language?: string;
    minDa?: number;
    maxDa?: number;
    minDr?: number;
    maxDr?: number;
    minTraffic?: number;
    maxTraffic?: number;
    minPrice?: number;
    maxPrice?: number;
    doFollowOnly?: boolean;
    turnaroundDays?: number;
  },
  sort?: string[],
  page = 1,
  limit = 20
): Promise<SearchResponse<WebsiteSearchDocument>> => {
  const filterParts: string[] = ['acceptsGuestPosts = true'];

  if (filters) {
    if (filters.niche) filterParts.push(`niche = "${filters.niche}"`);
    if (filters.category) filterParts.push(`category = "${filters.category}"`);
    if (filters.country) filterParts.push(`country = "${filters.country}"`);
    if (filters.language) filterParts.push(`language = "${filters.language}"`);
    if (filters.minDa !== undefined) filterParts.push(`da >= ${filters.minDa}`);
    if (filters.maxDa !== undefined) filterParts.push(`da <= ${filters.maxDa}`);
    if (filters.minDr !== undefined) filterParts.push(`dr >= ${filters.minDr}`);
    if (filters.maxDr !== undefined) filterParts.push(`dr <= ${filters.maxDr}`);
    if (filters.minTraffic !== undefined) filterParts.push(`traffic >= ${filters.minTraffic}`);
    if (filters.maxTraffic !== undefined) filterParts.push(`traffic <= ${filters.maxTraffic}`);
    if (filters.minPrice !== undefined) filterParts.push(`price >= ${filters.minPrice}`);
    if (filters.maxPrice !== undefined) filterParts.push(`price <= ${filters.maxPrice}`);
    if (filters.doFollowOnly) filterParts.push('doFollow = true');
    if (filters.turnaroundDays !== undefined) filterParts.push(`turnaroundDays <= ${filters.turnaroundDays}`);
  }

  return search<WebsiteSearchDocument>(INDEX_NAMES.WEBSITES, query, {
    filter: filterParts.join(' AND '),
    sort: sort || ['traffic:desc', 'da:desc'],
    offset: (page - 1) * limit,
    limit,
    facets: ['niche', 'category', 'country', 'language'],
  });
};

// Add or update documents
export const indexDocuments = async <T extends { id: string }>(
  indexName: string,
  documents: T[]
): Promise<void> => {
  const index = meilisearch.index(indexName);
  await index.addDocuments(documents, { primaryKey: 'id' });
};

// Delete document
export const deleteDocument = async (indexName: string, documentId: string): Promise<void> => {
  const index = meilisearch.index(indexName);
  await index.deleteDocument(documentId);
};

// Delete multiple documents
export const deleteDocuments = async (indexName: string, documentIds: string[]): Promise<void> => {
  const index = meilisearch.index(indexName);
  await index.deleteDocuments(documentIds);
};

// Get index stats
export const getIndexStats = async (indexName: string) => {
  const index = meilisearch.index(indexName);
  return index.getStats();
};

// Sync a single website to search index
export const syncWebsiteToSearch = async (website: WebsiteSearchDocument): Promise<void> => {
  await indexDocuments(INDEX_NAMES.WEBSITES, [website]);
};

// Remove website from search index
export const removeWebsiteFromSearch = async (websiteId: string): Promise<void> => {
  await deleteDocument(INDEX_NAMES.WEBSITES, websiteId);
};

// Get facet values for filters
export const getWebsiteFacets = async (): Promise<{
  niches: string[];
  categories: string[];
  countries: string[];
  languages: string[];
}> => {
  const result = await search<WebsiteSearchDocument>(INDEX_NAMES.WEBSITES, '', {
    facets: ['niche', 'category', 'country', 'language'],
    limit: 0,
  });

  const facetDistribution = result.facetDistribution || {};

  return {
    niches: Object.keys(facetDistribution.niche || {}),
    categories: Object.keys(facetDistribution.category || {}),
    countries: Object.keys(facetDistribution.country || {}),
    languages: Object.keys(facetDistribution.language || {}),
  };
};

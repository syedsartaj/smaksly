// Re-export all model types
export type {
  IUser,
  UserRole,
  IWebsite,
  WebsiteStatus,
  IDomain,
  DomainStatus,
  DnsStatus,
  SslStatus,
  IKeyword,
  KeywordIntent,
  KeywordStatus,
  KeywordSource,
  IContent,
  ContentStatus,
  ContentType,
  ContentIntent,
  IGuestPost,
  GuestPostStatus,
  IPartner,
  PartnerStatus,
  PartnerTier,
  IOrder,
  IOrderItem,
  OrderStatus,
  PaymentStatus,
  ICommission,
  IPayout,
  CommissionStatus,
  CommissionType,
  PayoutMethod,
  ISEOMetric,
  MetricPeriod,
  ICategory,
} from '../models';

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Search Types
export interface SearchFilters {
  search?: string;
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
}

export interface SearchResult<T> {
  hits: T[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
  facetDistribution?: Record<string, Record<string, number>>;
}

// Dashboard Stats Types
export interface DashboardStats {
  totalWebsites: number;
  activeWebsites: number;
  totalTraffic: number;
  totalKeywords: number;
  totalContent: number;
  pendingGuestPosts: number;
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
}

// Partner Dashboard Types
export interface PartnerDashboardStats {
  totalOrders: number;
  totalSpent: number;
  activeGuestPosts: number;
  expiringPosts: number;
  pendingPosts: number;
}

// SEO Dashboard Types
export interface NetworkSEOStats {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topPerformingWebsites: {
    websiteId: string;
    websiteName: string;
    clicks: number;
    impressions: number;
  }[];
  alerts: {
    websiteId: string;
    websiteName: string;
    alertType: string;
    severity: string;
    message: string;
  }[];
}

// Form Types
export interface WebsiteFormData {
  name: string;
  domain: string;
  niche: string;
  categoryId: string;
  description: string;
  tags: string[];
  acceptsGuestPosts: boolean;
  guestPostPrice: number;
  doFollow: boolean;
  turnaroundDays: number;
  maxLinksPerPost: number;
  minWordCount: number;
  maxWordCount: number;
  contentGuidelines: string;
  country: string;
  language: string;
}

export interface GuestPostSubmissionData {
  websiteId: string;
  title: string;
  content: string;
  targetUrl: string;
  anchorText: string;
  additionalLinks?: {
    url: string;
    anchorText: string;
  }[];
}

export interface KeywordResearchParams {
  seedKeywords: string[];
  categoryId: string;
  country?: string;
  language?: string;
  includeQuestions?: boolean;
  minVolume?: number;
  maxDifficulty?: number;
}

// Queue Job Types (re-export from lib/queue.ts)
export type {
  KeywordResearchJob,
  ContentGenerationJob,
  SEOSyncJob,
  GuestPostExpiryJob,
  SitemapGenerationJob,
  IndexingCheckJob,
  AnalyticsSyncJob,
  EmailNotificationJob,
  CommissionCalculationJob,
  SearchIndexSyncJob,
} from '../lib/queue';

// SEO Automation Types
export * from './keyword';
export * from './content';
export * from './health';
export * from './issue';

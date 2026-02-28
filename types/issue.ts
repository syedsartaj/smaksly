export type IssueType =
  | 'ranking_drop'
  | 'speed_issue'
  | 'seo_issue'
  | 'content_issue'
  | 'indexing_issue'
  | 'broken_link';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'fixing' | 'fixed' | 'ignored' | 'wont_fix';

export interface DetectedIssue {
  siteId: string;
  contentId?: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  details: Record<string, unknown>;
  suggestion: string;
  autoFixable: boolean;
}

export interface IssueFix {
  issueId: string;
  fixType: FixType;
  suggestion: string;
  autoFixable: boolean;
  fixFn?: () => Promise<FixResult>;
}

export type FixType =
  | 'regenerate_article'
  | 'update_meta'
  | 'compress_images'
  | 'fix_broken_link'
  | 'resubmit_indexing'
  | 'optimize_content'
  | 'add_internal_links'
  | 'manual';

export interface FixResult {
  success: boolean;
  message: string;
  changes?: Record<string, unknown>;
}

export interface IssueDetectionConfig {
  trafficDropThreshold: number;
  performanceMinScore: number;
  thinContentMinWords: number;
  maxBrokenLinksPerPage: number;
  checkInterval: 'daily' | 'weekly';
}

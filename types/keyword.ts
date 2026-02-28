export interface DataForSEOKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
  trend: 'rising' | 'stable' | 'declining';
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  serpFeatures: string[];
  monthlySearches: { month: string; volume: number }[];
}

export interface KeywordFilter {
  maxDifficulty: number;
  minVolume: number;
  intents?: string[];
  excludeExisting?: boolean;
}

export interface KeywordResearchResult {
  seed: string;
  locale: string;
  keywords: DataForSEOKeyword[];
  filteredCount: number;
  totalCount: number;
  fetchedAt: Date;
}

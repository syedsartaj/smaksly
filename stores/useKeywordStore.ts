import { create } from 'zustand';

export type KeywordIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';
export type KeywordStatus = 'discovered' | 'assigned' | 'content_created' | 'published' | 'rejected';

export interface Keyword {
  id: string;
  keyword: string;
  websiteId: string | null;
  websiteName?: string;
  categoryId: string;
  categoryName?: string;

  // Metrics
  volume: number;
  difficulty: number;
  cpc: number;
  intent: KeywordIntent;

  // Status
  status: KeywordStatus;
  contentId?: string;

  // Timestamps
  discoveredAt: string;
  assignedAt?: string;
  publishedAt?: string;
}

interface KeywordFilters {
  search: string;
  websiteId: string;
  categoryId: string;
  intent: KeywordIntent | '';
  status: KeywordStatus | '';
  minVolume: number;
  maxDifficulty: number;
}

interface KeywordState {
  keywords: Keyword[];
  selectedKeywords: string[];
  isLoading: boolean;
  error: string | null;
  filters: KeywordFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  setKeywords: (keywords: Keyword[]) => void;
  addKeyword: (keyword: Keyword) => void;
  addKeywords: (keywords: Keyword[]) => void;
  updateKeyword: (id: string, updates: Partial<Keyword>) => void;
  deleteKeyword: (id: string) => void;
  selectKeyword: (id: string) => void;
  deselectKeyword: (id: string) => void;
  selectAllKeywords: () => void;
  deselectAllKeywords: () => void;
  assignKeywordsToWebsite: (keywordIds: string[], websiteId: string, websiteName: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<KeywordFilters>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<KeywordState['pagination']>) => void;
}

const defaultFilters: KeywordFilters = {
  search: '',
  websiteId: '',
  categoryId: '',
  intent: '',
  status: '',
  minVolume: 0,
  maxDifficulty: 100,
};

export const useKeywordStore = create<KeywordState>((set) => ({
  keywords: [],
  selectedKeywords: [],
  isLoading: false,
  error: null,
  filters: defaultFilters,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },

  setKeywords: (keywords) => set({ keywords, selectedKeywords: [] }),

  addKeyword: (keyword) =>
    set((state) => ({
      keywords: [keyword, ...state.keywords],
    })),

  addKeywords: (keywords) =>
    set((state) => ({
      keywords: [...keywords, ...state.keywords],
    })),

  updateKeyword: (id, updates) =>
    set((state) => ({
      keywords: state.keywords.map((k) =>
        k.id === id ? { ...k, ...updates } : k
      ),
    })),

  deleteKeyword: (id) =>
    set((state) => ({
      keywords: state.keywords.filter((k) => k.id !== id),
      selectedKeywords: state.selectedKeywords.filter((kid) => kid !== id),
    })),

  selectKeyword: (id) =>
    set((state) => ({
      selectedKeywords: state.selectedKeywords.includes(id)
        ? state.selectedKeywords
        : [...state.selectedKeywords, id],
    })),

  deselectKeyword: (id) =>
    set((state) => ({
      selectedKeywords: state.selectedKeywords.filter((kid) => kid !== id),
    })),

  selectAllKeywords: () =>
    set((state) => ({
      selectedKeywords: state.keywords.map((k) => k.id),
    })),

  deselectAllKeywords: () => set({ selectedKeywords: [] }),

  assignKeywordsToWebsite: (keywordIds, websiteId, websiteName) =>
    set((state) => ({
      keywords: state.keywords.map((k) =>
        keywordIds.includes(k.id)
          ? {
              ...k,
              websiteId,
              websiteName,
              status: 'assigned' as KeywordStatus,
              assignedAt: new Date().toISOString(),
            }
          : k
      ),
      selectedKeywords: [],
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    })),

  resetFilters: () =>
    set({
      filters: defaultFilters,
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    }),

  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),
}));

// Selectors
export const selectKeywords = (state: KeywordState) => state.keywords;
export const selectUnassignedKeywords = (state: KeywordState) =>
  state.keywords.filter((k) => k.status === 'discovered');
export const selectAssignedKeywords = (state: KeywordState) =>
  state.keywords.filter((k) => k.status === 'assigned');
export const selectSelectedKeywordIds = (state: KeywordState) => state.selectedKeywords;
export const selectSelectedKeywords = (state: KeywordState) =>
  state.keywords.filter((k) => state.selectedKeywords.includes(k.id));

import { create } from 'zustand';

export interface Website {
  id: string;
  name: string;
  domain: string;
  customDomain?: string;
  niche: string;
  category: string;
  description: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';

  // SEO Metrics
  da: number;
  dr: number;
  traffic: number;
  organicKeywords: number;

  // Guest Post Settings
  acceptsGuestPosts: boolean;
  guestPostPrice: number;
  doFollow: boolean;
  turnaroundDays: number;

  // Deployment
  vercelId?: string;
  gitRepo?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface WebsiteFilters {
  search: string;
  status: string;
  niche: string;
  category: string;
  acceptsGuestPosts: boolean | null;
}

interface WebsiteState {
  websites: Website[];
  selectedWebsite: Website | null;
  isLoading: boolean;
  error: string | null;
  filters: WebsiteFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  setWebsites: (websites: Website[]) => void;
  addWebsite: (website: Website) => void;
  updateWebsite: (id: string, updates: Partial<Website>) => void;
  deleteWebsite: (id: string) => void;
  setSelectedWebsite: (website: Website | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<WebsiteFilters>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<WebsiteState['pagination']>) => void;
}

const defaultFilters: WebsiteFilters = {
  search: '',
  status: '',
  niche: '',
  category: '',
  acceptsGuestPosts: null,
};

export const useWebsiteStore = create<WebsiteState>((set) => ({
  websites: [],
  selectedWebsite: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  setWebsites: (websites) => set({ websites }),

  addWebsite: (website) =>
    set((state) => ({
      websites: [website, ...state.websites],
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    })),

  updateWebsite: (id, updates) =>
    set((state) => ({
      websites: state.websites.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
      selectedWebsite:
        state.selectedWebsite?.id === id
          ? { ...state.selectedWebsite, ...updates }
          : state.selectedWebsite,
    })),

  deleteWebsite: (id) =>
    set((state) => ({
      websites: state.websites.filter((w) => w.id !== id),
      selectedWebsite:
        state.selectedWebsite?.id === id ? null : state.selectedWebsite,
      pagination: {
        ...state.pagination,
        total: state.pagination.total - 1,
      },
    })),

  setSelectedWebsite: (selectedWebsite) => set({ selectedWebsite }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page on filter change
    })),

  resetFilters: () =>
    set({
      filters: defaultFilters,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),

  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),
}));

// Selectors
export const selectWebsites = (state: WebsiteState) => state.websites;
export const selectSelectedWebsite = (state: WebsiteState) => state.selectedWebsite;
export const selectActiveWebsites = (state: WebsiteState) =>
  state.websites.filter((w) => w.status === 'active');
export const selectGuestPostWebsites = (state: WebsiteState) =>
  state.websites.filter((w) => w.acceptsGuestPosts);

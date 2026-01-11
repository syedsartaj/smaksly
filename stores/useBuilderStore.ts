import { create } from 'zustand';

// Types
export interface BuilderProject {
  _id: string;
  websiteId: string;
  name: string;
  description: string;
  status: 'draft' | 'building' | 'ready' | 'published' | 'error';
  gitRepoUrl?: string;
  gitRepoName?: string;
  vercelProjectId?: string;
  deploymentUrl?: string;
  lastDeployedAt?: string;
  settings: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    siteName: string;
    siteDescription: string;
    logo?: string;
    favicon?: string;
  };
  blogConfig: {
    enabled: boolean;
    postsPerPage: number;
    layout: 'grid' | 'list' | 'masonry';
    showCategories: boolean;
    showTags: boolean;
  };
  website?: {
    name: string;
    domain: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BuilderPage {
  _id: string;
  projectId: string;
  name: string;
  path: string;
  type: 'static' | 'dynamic' | 'blog-listing' | 'blog-post';
  isHomePage: boolean;
  code: string;
  aiPrompt: string;
  aiConversation: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  metaTitle?: string;
  metaDescription?: string;
  status: 'draft' | 'generated' | 'edited' | 'published';
  lastGeneratedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuilderComponent {
  _id: string;
  projectId: string;
  name: string;
  displayName: string;
  description?: string;
  type: 'layout' | 'section' | 'element' | 'widget';
  scope: 'global' | 'page-specific';
  code: string;
  exportPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodeSelection {
  start: number;
  end: number;
  startLine: number;
  endLine: number;
  text: string;
}

export interface BuilderMedia {
  _id: string;
  projectId: string;
  name: string;
  originalName: string;
  type: 'image' | 'font' | 'icon' | 'document' | 'video';
  url: string;
  publicId?: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  alt?: string;
  caption?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaCategory {
  name: string;
  count: number;
}

export interface BrandingSettings {
  headerLogo?: string;
  footerLogo?: string;
  websiteIcon?: string;
  indexName?: string;
  logoAltText?: string;
  siteName?: string;
  siteDescription?: string;
}

// Store State
interface BuilderState {
  // Project
  project: BuilderProject | null;
  projects: BuilderProject[];
  isLoadingProjects: boolean;

  // Pages
  pages: BuilderPage[];
  currentPage: BuilderPage | null;

  // Components
  components: BuilderComponent[];
  currentComponent: BuilderComponent | null;

  // Editor State
  code: string;
  originalCode: string;
  isDirty: boolean;

  // Preview
  previewHtml: string;
  isPreviewLoading: boolean;
  previewError: string | null;

  // AI
  isGenerating: boolean;
  generationError: string | null;
  selectedCode: CodeSelection | null;

  // UI
  showAIPanel: boolean;
  showFileTree: boolean;
  showComponentLibrary: boolean;
  viewportSize: 'mobile' | 'tablet' | 'desktop';

  // Publish
  isPublishing: boolean;
  publishError: string | null;

  // Media
  media: BuilderMedia[];
  mediaCategories: MediaCategory[];
  selectedMediaIds: Set<string>;
  mediaViewMode: 'grid' | 'list';
  mediaSearchTerm: string;
  activeCategory: string;
  isLoadingMedia: boolean;
  isUploadingMedia: boolean;
  branding: BrandingSettings;

  // Actions
  setProject: (project: BuilderProject | null) => void;
  setProjects: (projects: BuilderProject[]) => void;
  setLoadingProjects: (loading: boolean) => void;

  setPages: (pages: BuilderPage[]) => void;
  setCurrentPage: (page: BuilderPage | null) => void;
  addPage: (page: BuilderPage) => void;
  updatePage: (pageId: string, updates: Partial<BuilderPage>) => void;
  deletePage: (pageId: string) => void;

  setComponents: (components: BuilderComponent[]) => void;
  setCurrentComponent: (component: BuilderComponent | null) => void;
  addComponent: (component: BuilderComponent) => void;
  updateComponent: (componentId: string, updates: Partial<BuilderComponent>) => void;
  deleteComponent: (componentId: string) => void;

  setCode: (code: string) => void;
  setOriginalCode: (code: string) => void;
  resetCode: () => void;
  markClean: () => void;

  setPreviewHtml: (html: string) => void;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error: string | null) => void;

  setIsGenerating: (loading: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setSelectedCode: (selection: CodeSelection | null) => void;

  toggleAIPanel: () => void;
  toggleFileTree: () => void;
  toggleComponentLibrary: () => void;
  setViewportSize: (size: 'mobile' | 'tablet' | 'desktop') => void;

  setIsPublishing: (loading: boolean) => void;
  setPublishError: (error: string | null) => void;

  // Complex Actions
  loadProject: (projectId: string) => Promise<void>;
  saveCurrentPage: () => Promise<boolean>;
  saveCurrentComponent: () => Promise<boolean>;
  saveCurrentCode: () => Promise<boolean>;
  generatePreview: () => Promise<void>;

  // Media Actions
  setMedia: (media: BuilderMedia[]) => void;
  setMediaCategories: (categories: MediaCategory[]) => void;
  setMediaViewMode: (mode: 'grid' | 'list') => void;
  setMediaSearchTerm: (term: string) => void;
  setActiveCategory: (category: string) => void;
  toggleMediaSelection: (mediaId: string) => void;
  clearMediaSelection: () => void;
  setBranding: (branding: BrandingSettings) => void;
  loadMedia: (projectId: string, options?: { category?: string; search?: string; page?: number }) => Promise<void>;
  uploadMedia: (projectId: string, file: File, category?: string, alt?: string) => Promise<BuilderMedia | null>;
  deleteMedia: (mediaId: string) => Promise<boolean>;
  updateMedia: (mediaId: string, updates: Partial<BuilderMedia>) => Promise<boolean>;
  loadBranding: (projectId: string) => Promise<void>;
  saveBranding: (projectId: string, branding: BrandingSettings) => Promise<boolean>;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  // Initial State
  project: null,
  projects: [],
  isLoadingProjects: false,

  pages: [],
  currentPage: null,

  components: [],
  currentComponent: null,

  code: '',
  originalCode: '',
  isDirty: false,

  previewHtml: '',
  isPreviewLoading: false,
  previewError: null,

  isGenerating: false,
  generationError: null,
  selectedCode: null,

  showAIPanel: false,
  showFileTree: true,
  showComponentLibrary: false,
  viewportSize: 'desktop',

  isPublishing: false,
  publishError: null,

  // Media
  media: [],
  mediaCategories: [],
  selectedMediaIds: new Set<string>(),
  mediaViewMode: 'grid',
  mediaSearchTerm: '',
  activeCategory: 'all',
  isLoadingMedia: false,
  isUploadingMedia: false,
  branding: {},

  // Actions
  setProject: (project) => set({ project }),
  setProjects: (projects) => set({ projects }),
  setLoadingProjects: (isLoadingProjects) => set({ isLoadingProjects }),

  setPages: (pages) => set({ pages }),
  setCurrentPage: (page) =>
    set({
      currentPage: page,
      currentComponent: page ? null : get().currentComponent, // Clear component when selecting page
      code: page?.code || '',
      originalCode: page?.code || '',
      isDirty: false,
      selectedCode: null,
    }),
  addPage: (page) =>
    set((state) => ({
      pages: [...state.pages, page].sort((a, b) => a.order - b.order),
    })),
  updatePage: (pageId, updates) =>
    set((state) => ({
      pages: state.pages.map((p) => (p._id === pageId ? { ...p, ...updates } : p)),
      currentPage:
        state.currentPage?._id === pageId
          ? { ...state.currentPage, ...updates }
          : state.currentPage,
    })),
  deletePage: (pageId) =>
    set((state) => ({
      pages: state.pages.filter((p) => p._id !== pageId),
      currentPage: state.currentPage?._id === pageId ? null : state.currentPage,
    })),

  setComponents: (components) => set({ components }),
  setCurrentComponent: (component) =>
    set({
      currentComponent: component,
      currentPage: component ? null : get().currentPage, // Clear page when selecting component
      code: component?.code || '',
      originalCode: component?.code || '',
      isDirty: false,
      selectedCode: null,
    }),
  addComponent: (component) =>
    set((state) => ({
      components: [...state.components, component],
    })),
  updateComponent: (componentId, updates) =>
    set((state) => ({
      components: state.components.map((c) =>
        c._id === componentId ? { ...c, ...updates } : c
      ),
      currentComponent:
        state.currentComponent?._id === componentId
          ? { ...state.currentComponent, ...updates }
          : state.currentComponent,
    })),
  deleteComponent: (componentId) =>
    set((state) => ({
      components: state.components.filter((c) => c._id !== componentId),
      currentComponent:
        state.currentComponent?._id === componentId ? null : state.currentComponent,
    })),

  setCode: (code) =>
    set((state) => ({
      code,
      isDirty: code !== state.originalCode,
    })),
  setOriginalCode: (originalCode) => set({ originalCode }),
  resetCode: () =>
    set((state) => ({
      code: state.originalCode,
      isDirty: false,
    })),
  markClean: () =>
    set((state) => ({
      originalCode: state.code,
      isDirty: false,
    })),

  setPreviewHtml: (previewHtml) => set({ previewHtml }),
  setPreviewLoading: (isPreviewLoading) => set({ isPreviewLoading }),
  setPreviewError: (previewError) => set({ previewError }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationError: (generationError) => set({ generationError }),
  setSelectedCode: (selectedCode) => set({ selectedCode }),

  toggleAIPanel: () => set((state) => ({ showAIPanel: !state.showAIPanel })),
  toggleFileTree: () => set((state) => ({ showFileTree: !state.showFileTree })),
  toggleComponentLibrary: () =>
    set((state) => ({ showComponentLibrary: !state.showComponentLibrary })),
  setViewportSize: (viewportSize) => set({ viewportSize }),

  setIsPublishing: (isPublishing) => set({ isPublishing }),
  setPublishError: (publishError) => set({ publishError }),

  // Complex Actions
  loadProject: async (projectId: string) => {
    try {
      set({ isLoadingProjects: true });

      const response = await fetch(`/api/builder/projects/${projectId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load project');
      }

      const { pages, components, ...project } = data.data;

      set({
        project,
        pages: pages || [],
        components: components || [],
        isLoadingProjects: false,
      });

      // Set first page as current if available
      if (pages && pages.length > 0) {
        const homePage = pages.find((p: BuilderPage) => p.isHomePage) || pages[0];
        set({
          currentPage: homePage,
          code: homePage.code || '',
          originalCode: homePage.code || '',
          isDirty: false,
        });
      }
    } catch (error) {
      console.error('Error loading project:', error);
      set({ isLoadingProjects: false });
      throw error;
    }
  },

  saveCurrentPage: async () => {
    const { currentPage, code, isDirty } = get();

    if (!currentPage || !isDirty) {
      return true;
    }

    try {
      const response = await fetch(`/api/builder/pages/${currentPage._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save page');
      }

      set({
        originalCode: code,
        isDirty: false,
        currentPage: { ...currentPage, code, status: 'edited' },
      });

      // Update in pages array
      get().updatePage(currentPage._id, { code, status: 'edited' });

      return true;
    } catch (error) {
      console.error('Error saving page:', error);
      return false;
    }
  },

  saveCurrentComponent: async () => {
    const { currentComponent, code, isDirty } = get();

    if (!currentComponent || !isDirty) {
      return true;
    }

    try {
      const response = await fetch(`/api/builder/components/${currentComponent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save component');
      }

      set({
        originalCode: code,
        isDirty: false,
        currentComponent: { ...currentComponent, code },
      });

      // Update in components array
      get().updateComponent(currentComponent._id, { code });

      return true;
    } catch (error) {
      console.error('Error saving component:', error);
      return false;
    }
  },

  saveCurrentCode: async () => {
    const { currentPage, currentComponent } = get();

    if (currentPage) {
      return get().saveCurrentPage();
    } else if (currentComponent) {
      return get().saveCurrentComponent();
    }
    return true;
  },

  generatePreview: async () => {
    const { code, project, currentPage } = get();

    if (!code || !project) {
      return;
    }

    try {
      set({ isPreviewLoading: true, previewError: null });

      const response = await fetch('/api/builder/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          projectId: project._id,
          pageType: currentPage?.type || 'static',
          projectSettings: project.settings,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      set({
        previewHtml: data.data.html,
        isPreviewLoading: false,
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      set({
        isPreviewLoading: false,
        previewError: error instanceof Error ? error.message : 'Preview failed',
      });
    }
  },

  // Media Actions
  setMedia: (media) => set({ media }),
  setMediaCategories: (mediaCategories) => set({ mediaCategories }),
  setMediaViewMode: (mediaViewMode) => set({ mediaViewMode }),
  setMediaSearchTerm: (mediaSearchTerm) => set({ mediaSearchTerm }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  toggleMediaSelection: (mediaId) =>
    set((state) => {
      const newSelection = new Set(state.selectedMediaIds);
      if (newSelection.has(mediaId)) {
        newSelection.delete(mediaId);
      } else {
        newSelection.add(mediaId);
      }
      return { selectedMediaIds: newSelection };
    }),
  clearMediaSelection: () => set({ selectedMediaIds: new Set<string>() }),
  setBranding: (branding) => set({ branding }),

  loadMedia: async (projectId, options = {}) => {
    try {
      set({ isLoadingMedia: true });

      const params = new URLSearchParams({ projectId });
      if (options.category && options.category !== 'all') {
        params.append('category', options.category);
      }
      if (options.search) {
        params.append('search', options.search);
      }
      if (options.page) {
        params.append('page', options.page.toString());
      }

      const response = await fetch(`/api/builder/media?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load media');
      }

      set({
        media: data.data.media,
        mediaCategories: data.data.categories,
        isLoadingMedia: false,
      });
    } catch (error) {
      console.error('Error loading media:', error);
      set({ isLoadingMedia: false });
    }
  },

  uploadMedia: async (projectId, file, category = 'general', alt = '') => {
    try {
      set({ isUploadingMedia: true });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('category', category);
      formData.append('alt', alt);

      const response = await fetch('/api/builder/media', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to upload media');
      }

      // Add to media list
      set((state) => ({
        media: [data.data, ...state.media],
        isUploadingMedia: false,
      }));

      // Reload to get updated categories
      get().loadMedia(projectId, { category: get().activeCategory });

      return data.data;
    } catch (error) {
      console.error('Error uploading media:', error);
      set({ isUploadingMedia: false });
      return null;
    }
  },

  deleteMedia: async (mediaId) => {
    try {
      const response = await fetch(`/api/builder/media/${mediaId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete media');
      }

      // Remove from media list
      set((state) => ({
        media: state.media.filter((m) => m._id !== mediaId),
        selectedMediaIds: new Set([...state.selectedMediaIds].filter((id) => id !== mediaId)),
      }));

      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      return false;
    }
  },

  updateMedia: async (mediaId, updates) => {
    try {
      const response = await fetch(`/api/builder/media/${mediaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update media');
      }

      // Update in media list
      set((state) => ({
        media: state.media.map((m) => (m._id === mediaId ? { ...m, ...data.data } : m)),
      }));

      return true;
    } catch (error) {
      console.error('Error updating media:', error);
      return false;
    }
  },

  loadBranding: async (projectId) => {
    try {
      const response = await fetch(`/api/builder/projects/${projectId}/branding`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load branding');
      }

      set({
        branding: {
          ...data.data.branding,
          siteName: data.data.siteName,
          siteDescription: data.data.siteDescription,
        },
      });
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  },

  saveBranding: async (projectId, branding) => {
    try {
      const response = await fetch(`/api/builder/projects/${projectId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save branding');
      }

      set({
        branding: {
          ...data.data.branding,
          siteName: data.data.siteName,
          siteDescription: data.data.siteDescription,
        },
      });

      return true;
    } catch (error) {
      console.error('Error saving branding:', error);
      return false;
    }
  },
}));

// Selectors
export const selectProject = (state: BuilderState) => state.project;
export const selectPages = (state: BuilderState) => state.pages;
export const selectCurrentPage = (state: BuilderState) => state.currentPage;
export const selectComponents = (state: BuilderState) => state.components;
export const selectCode = (state: BuilderState) => state.code;
export const selectIsDirty = (state: BuilderState) => state.isDirty;
export const selectIsGenerating = (state: BuilderState) => state.isGenerating;
export const selectPreviewHtml = (state: BuilderState) => state.previewHtml;

// Media Selectors
export const selectMedia = (state: BuilderState) => state.media;
export const selectMediaCategories = (state: BuilderState) => state.mediaCategories;
export const selectMediaViewMode = (state: BuilderState) => state.mediaViewMode;
export const selectActiveCategory = (state: BuilderState) => state.activeCategory;
export const selectIsLoadingMedia = (state: BuilderState) => state.isLoadingMedia;
export const selectIsUploadingMedia = (state: BuilderState) => state.isUploadingMedia;
export const selectBranding = (state: BuilderState) => state.branding;

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Globe,
  Search,
  Loader2,
  Save,
  Upload,
  ImageIcon,
  Wand2,
  X,
  Eye,
  Code,
  CheckCircle,
  AlertCircle,
  Pencil,
  Copy,
  FileText,
  Plus,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit,
  ExternalLink,
} from 'lucide-react';

interface BuilderProject {
  _id: string;
  name: string;
  websiteId: string | { _id: string; name: string; domain: string };
  status: string;
  deploymentUrl?: string;
  settings?: {
    siteName?: string;
    siteDescription?: string;
    primaryColor?: string;
  };
  website?: { _id: string; name: string; domain: string } | null;
  updatedAt?: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface ExistingBlog {
  _id: string;
  title: string;
  slug: string;
  status: string;
  excerpt?: string;
  featuredImage?: string;
  publishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  wordCount?: number;
  readingTime?: number;
  isAiGenerated?: boolean;
  body?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  tags?: string[];
}

interface BlogDraft {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  tags: string[];
  suggestedCategory: string;
  estimatedReadingTime: number;
  imagePrompts: string[];
  featuredImage: string;
  savedId?: string;
}

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'educational', label: 'Educational' },
];

const WORD_COUNTS = [
  { value: 800, label: '800 words (Short)' },
  { value: 1200, label: '1,200 words (Medium)' },
  { value: 1500, label: '1,500 words (Standard)' },
  { value: 2000, label: '2,000 words (Long)' },
  { value: 3000, label: '3,000 words (In-depth)' },
];

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,' + btoa(
  '<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" font-family="Arial,sans-serif" font-size="20" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">Image placeholder - generate or upload an image</text></svg>'
);

const emptyDraft: BlogDraft = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  metaTitle: '',
  metaDescription: '',
  focusKeyword: '',
  secondaryKeywords: [],
  tags: [],
  suggestedCategory: '',
  estimatedReadingTime: 0,
  imagePrompts: [],
  featuredImage: '',
};

function getWebsiteId(project: BuilderProject): string {
  if (typeof project.websiteId === 'string') return project.websiteId;
  return project.websiteId._id;
}

function getProjectDisplay(project: BuilderProject) {
  const website = project.website ||
    (typeof project.websiteId === 'object' ? project.websiteId : null);
  return {
    name: project.settings?.siteName || project.name || website?.name || 'Untitled',
    domain: website?.domain || '',
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  pending_review: 'bg-yellow-900/30 text-yellow-400',
  approved: 'bg-blue-900/30 text-blue-400',
  scheduled: 'bg-purple-900/30 text-purple-400',
  published: 'bg-emerald-900/30 text-emerald-400',
  rejected: 'bg-red-900/30 text-red-400',
};

export default function AIBlogWriterPage() {
  // Project selection
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<BuilderProject | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Blog list
  const [blogs, setBlogs] = useState<ExistingBlog[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [blogSearch, setBlogSearch] = useState('');
  const [blogFilter, setBlogFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Editor panel
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState<BlogDraft>(emptyDraft);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Generation settings
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [wordCount, setWordCount] = useState(1500);
  const [language, setLanguage] = useState('English');
  const [includeImages, setIncludeImages] = useState(true);
  const [imageCount, setImageCount] = useState(2);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // UI
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
  const [editInstruction, setEditInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/builder/projects?limit=100');
        const data = await res.json();
        if (data.success) {
          const projectList = data.data || [];
          setProjects(projectList);
          if (projectList.length > 0) {
            setSelectedProject(projectList[0]);
          }
        }
      } catch {
        console.error('Failed to load projects');
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories?limit=100');
        const data = await res.json();
        if (data.success) setCategories(data.data || []);
      } catch {
        console.error('Failed to load categories');
      }
    }
    loadCategories();
  }, []);

  // Load blogs when project changes
  const fetchBlogs = useCallback(async () => {
    if (!selectedProject) return;
    setLoadingBlogs(true);
    try {
      const websiteId = getWebsiteId(selectedProject);
      const params = new URLSearchParams({
        websiteId,
        type: 'blog_post',
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (blogSearch) params.append('search', blogSearch);
      if (blogFilter) params.append('status', blogFilter);

      const res = await fetch(`/api/content?${params}`);
      const data = await res.json();
      if (data.success) {
        setBlogs(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      console.error('Failed to load blogs');
    } finally {
      setLoadingBlogs(false);
    }
  }, [selectedProject, page, blogSearch, blogFilter]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  useEffect(() => {
    setPage(1);
  }, [blogSearch, blogFilter, selectedProject]);

  // Auto-clear messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const filteredProjects = projects.filter((p) => {
    const display = getProjectDisplay(p);
    const q = projectSearch.toLowerCase();
    return display.name.toLowerCase().includes(q) || display.domain.toLowerCase().includes(q);
  });

  const projectDisplay = selectedProject ? getProjectDisplay(selectedProject) : null;

  function cleanImagePlaceholders(html: string): string {
    return html.replace(/IMAGE_PLACEHOLDER_\d+/g, PLACEHOLDER_IMAGE);
  }

  // Open editor for new blog
  const handleNewBlog = () => {
    setDraft(emptyDraft);
    setTopic('');
    setKeywords('');
    setAdditionalInstructions('');
    setEditInstruction('');
    setError(null);
    setViewMode('preview');
    setShowEditor(true);
  };

  // Open editor for existing blog
  const handleEditBlog = async (blogId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/content/${blogId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const b = data.data;
      setDraft({
        title: b.title || '',
        slug: b.slug || '',
        excerpt: b.excerpt || '',
        body: b.body || b.content || '',
        metaTitle: b.metaTitle || '',
        metaDescription: b.metaDescription || '',
        focusKeyword: b.focusKeyword || '',
        secondaryKeywords: b.secondaryKeywords || [],
        tags: b.tags || [],
        suggestedCategory: '',
        estimatedReadingTime: b.readingTime || 0,
        imagePrompts: [],
        featuredImage: b.featuredImage || '',
        savedId: b._id,
      });
      setViewMode('preview');
      setShowEditor(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blog');
    }
  };

  // Delete blog
  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    setDeletingId(blogId);
    try {
      const res = await fetch(`/api/content/${blogId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Blog post deleted');
      fetchBlogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // Generate blog
  const handleGenerate = async () => {
    if (!selectedProject) { setError('No project selected'); return; }
    if (!topic.trim() || topic.trim().length < 5) { setError('Please enter a topic (at least 5 characters)'); return; }

    setIsGenerating(true);
    setError(null);
    setDraft(emptyDraft);

    try {
      const websiteId = getWebsiteId(selectedProject);
      const res = await fetch('/api/ai-blog-writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          topic: topic.trim(),
          keywords: keywords.trim() || undefined,
          tone, wordCount, language, includeImages, imageCount,
          additionalInstructions: additionalInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDraft({ ...data.data, featuredImage: '', savedId: data.savedId || undefined });
      setSuccess('Blog post generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blog');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Edit
  const handleAIEdit = async () => {
    if (!editInstruction.trim()) return;
    setIsEditing(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-blog-writer/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: draft.body, instruction: editInstruction.trim(),
          title: draft.title, excerpt: draft.excerpt,
          metaTitle: draft.metaTitle, metaDescription: draft.metaDescription,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDraft((prev) => ({
        ...prev,
        body: data.data.body || prev.body,
        title: data.data.title || prev.title,
        excerpt: data.data.excerpt || prev.excerpt,
        metaTitle: data.data.metaTitle || prev.metaTitle,
        metaDescription: data.data.metaDescription || prev.metaDescription,
        imagePrompts: [...prev.imagePrompts, ...(data.data.newImagePrompts || [])],
      }));
      setEditInstruction('');
      setSuccess(`Changes applied: ${data.data.changesSummary || 'Content updated'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit blog');
    } finally {
      setIsEditing(false);
    }
  };

  // Generate AI image
  const handleGenerateImage = async (prompt: string, type: 'featured' | 'inline') => {
    setIsGeneratingImage(type === 'featured' ? 'featured' : prompt);
    setError(null);
    try {
      const res = await fetch('/api/ai-blog-writer/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size: type === 'featured' ? '1792x1024' : '1024x1024' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (type === 'featured') {
        setDraft((prev) => ({ ...prev, featuredImage: data.data.url }));
      } else {
        setDraft((prev) => {
          let updatedBody = prev.body;
          const placeholderRegex = /src="IMAGE_PLACEHOLDER_\d+"/;
          if (placeholderRegex.test(updatedBody)) {
            updatedBody = updatedBody.replace(placeholderRegex, `src="${data.data.url}"`);
          } else {
            const insertPoint = updatedBody.lastIndexOf('</p>');
            if (insertPoint > -1) {
              const imageHtml = `<figure><img src="${data.data.url}" alt="${prompt}" style="width:100%;border-radius:8px;margin:16px 0;" /><figcaption>${prompt}</figcaption></figure>`;
              updatedBody = updatedBody.slice(0, insertPoint + 4) + imageHtml + updatedBody.slice(insertPoint + 4);
            }
          }
          return { ...prev, body: updatedBody };
        });
      }
      setSuccess(`Image generated${type === 'featured' ? ' as featured image' : ' and inserted'}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGeneratingImage(null);
    }
  };

  // Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'featured' | 'inline') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (type === 'featured') {
        setDraft((prev) => ({ ...prev, featuredImage: data.secure_url }));
      } else {
        setDraft((prev) => {
          const imageHtml = `<figure><img src="${data.secure_url}" alt="${file.name}" style="width:100%;border-radius:8px;margin:16px 0;" /><figcaption>${file.name}</figcaption></figure>`;
          const insertPoint = prev.body.lastIndexOf('</p>');
          const updatedBody = insertPoint > -1
            ? prev.body.slice(0, insertPoint + 4) + imageHtml + prev.body.slice(insertPoint + 4)
            : prev.body + imageHtml;
          return { ...prev, body: updatedBody };
        });
      }
      setSuccess('Image uploaded!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save blog
  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    if (!selectedProject || !draft.title || !draft.body) {
      setError('Cannot save -- missing title or content');
      return;
    }
    setIsSaving(true);
    setError(null);
    const cleanBody = cleanImagePlaceholders(draft.body);
    const websiteId = getWebsiteId(selectedProject);

    try {
      let categoryId = selectedCategory || undefined;
      if (!categoryId && draft.suggestedCategory) {
        const cat = categories.find((c) => c.name.toLowerCase() === draft.suggestedCategory.toLowerCase());
        if (cat) categoryId = cat._id;
      }

      if (draft.savedId) {
        const res = await fetch(`/api/content/${draft.savedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.title, slug: draft.slug, excerpt: draft.excerpt, body: cleanBody,
            featuredImage: draft.featuredImage, metaTitle: draft.metaTitle, metaDescription: draft.metaDescription,
            focusKeyword: draft.focusKeyword, secondaryKeywords: draft.secondaryKeywords, tags: draft.tags,
            categoryId, status,
            ...(status === 'published' ? { publishedAt: new Date().toISOString() } : {}),
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        const res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId, title: draft.title, slug: draft.slug, type: 'blog_post', status,
            excerpt: draft.excerpt, body: cleanBody, featuredImage: draft.featuredImage,
            seo: { metaTitle: draft.metaTitle, metaDescription: draft.metaDescription },
            focusKeyword: draft.focusKeyword, secondaryKeywords: draft.secondaryKeywords, tags: draft.tags,
            categoryId, author: 'Admin', isAiGenerated: true,
            ...(status === 'published' ? { publishedAt: new Date().toISOString() } : {}),
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setDraft((prev) => ({ ...prev, savedId: data.data._id }));
      }
      setSuccess(`Blog post ${status === 'published' ? 'published' : 'saved as draft'}!`);
      fetchBlogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyHTML = useCallback(() => {
    navigator.clipboard.writeText(draft.body);
    setSuccess('HTML copied to clipboard!');
  }, [draft.body]);

  const hasDraft = !!draft.body;
  const previewBody = draft.body.replace(/IMAGE_PLACEHOLDER_\d+/g, PLACEHOLDER_IMAGE);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Left Sidebar - Project Selection */}
      <aside className="w-60 border-r border-zinc-800 flex-shrink-0">
        <div className="flex flex-col h-full bg-zinc-900/50">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-400" />
              Websites
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search websites..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                {projectSearch ? 'No websites found' : 'No websites available'}
              </div>
            ) : (
              filteredProjects.map((p) => {
                const display = getProjectDisplay(p);
                return (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProject(p)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      selectedProject?._id === p._id
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    <div className="font-medium truncate text-sm">{display.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{display.domain || 'No domain'}</div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500 text-center">
            {filteredProjects.length} of {projects.length} websites
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-400" />
                AI Blog Writer
              </h1>
              {projectDisplay && (
                <p className="text-sm text-zinc-400 mt-1">
                  Writing for <span className="text-emerald-400">{projectDisplay.name}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleNewBlog}
              disabled={!selectedProject}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Generate New Post
            </button>
          </div>

          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Total:</span>
              <span className="font-medium">{total} posts</span>
            </div>
          </div>
        </header>

        {/* Filters */}
        {selectedProject && (
          <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={blogSearch}
                onChange={(e) => setBlogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <select
              value={blogFilter}
              onChange={(e) => setBlogFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        )}

        {/* Alerts */}
        {(error || success) && (
          <div className="px-6 pt-3">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}
          </div>
        )}

        {/* Blog Table */}
        <div className="flex-1 overflow-auto">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Sparkles className="h-16 w-16 mb-4 text-zinc-700" />
              <p className="text-lg">Select a website to manage AI blogs</p>
            </div>
          ) : loadingBlogs ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
          ) : blogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <FileText className="h-12 w-12 mb-4 text-zinc-600" />
              <p className="text-lg font-medium">No blog posts found</p>
              <p className="text-sm mb-4">Generate your first AI blog post to get started</p>
              <button
                onClick={handleNewBlog}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium"
              >
                <Sparkles className="h-4 w-4" />
                Generate Blog Post
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-24">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Words</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-28">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {blogs.map((blog) => (
                    <tr key={blog._id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="min-w-[200px]">
                          <div className="font-medium text-white truncate max-w-[400px]">{blog.title}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[400px]">/{blog.slug}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[blog.status] || statusColors.draft}`}>
                          {blog.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">
                        {blog.wordCount?.toLocaleString() || '-'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-sm">
                        {blog.createdAt ? formatDate(blog.createdAt) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditBlog(blog._id)}
                            className="p-1.5 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBlog(blog._id)}
                            disabled={deletingId === blog._id}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === blog._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {selectedProject && totalPages > 1 && (
          <div className="border-t border-zinc-800 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-sm">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====== Editor Slide-Over Panel ====== */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowEditor(false)} />

          {/* Panel */}
          <div className="relative ml-auto w-full max-w-6xl bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {draft.savedId ? 'Edit Blog Post' : 'Generate New Blog Post'}
                  </h2>
                  {projectDisplay && (
                    <p className="text-xs text-zinc-400">
                      For <span className="text-emerald-400">{projectDisplay.name}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasDraft && (
                  <>
                    <button onClick={handleCopyHTML} className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm">
                      <Copy className="h-4 w-4" /> Copy HTML
                    </button>
                    <button onClick={() => handleSave('draft')} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm disabled:opacity-50">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
                    </button>
                    <button onClick={() => handleSave('published')} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm disabled:opacity-50">
                      <Upload className="h-4 w-4" /> Publish
                    </button>
                  </>
                )}
                <button onClick={() => setShowEditor(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Panel alerts */}
            {(error || success) && (
              <div className="px-6 pt-3 shrink-0">
                {error && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                    <CheckCircle className="h-4 w-4 shrink-0" /> {success}
                  </div>
                )}
              </div>
            )}

            {/* Panel Body */}
            <div className="flex-1 overflow-auto p-6">
              <div className="flex gap-6">
                {/* Left: Generation Settings + AI Edit */}
                <div className={`${hasDraft ? 'w-[380px]' : 'w-full max-w-2xl mx-auto'} flex-shrink-0 space-y-4`}>
                  {/* Topic & Settings */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1.5">Topic / Title *</label>
                      <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows={2}
                        placeholder="e.g., 10 Best Digital Marketing Strategies for Small Businesses in 2026"
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1.5">Target Keywords</label>
                      <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="digital marketing, small business marketing" className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Tone</label>
                        <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                          {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Word Count</label>
                        <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                          {WORD_COUNTS.map((wc) => <option key={wc.value} value={wc.value}>{wc.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Language</label>
                        <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Category</label>
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                          <option value="">Auto-suggest</option>
                          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500" />
                        <span className="text-sm text-zinc-300">Include image placeholders</span>
                      </label>
                      {includeImages && (
                        <select value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none">
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} image{n > 1 ? 's' : ''}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Additional Instructions (optional)</label>
                      <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} rows={2} placeholder="e.g., Include a comparison table, mention competitor X..." className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none text-xs" />
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !topic.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating blog post...</> : <><Sparkles className="h-5 w-5" /> {hasDraft ? 'Regenerate Blog Post' : 'Generate Blog Post'}</>}
                    </button>
                  </div>

                  {/* AI Edit Panel */}
                  {hasDraft && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                      <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-purple-400" /> AI Edit
                      </h3>
                      <textarea
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        rows={3}
                        placeholder="e.g., Add a section about email marketing, make the intro more engaging..."
                        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIEdit(); } }}
                      />
                      <div className="flex gap-2 flex-wrap">
                        {['Make it more engaging', 'Improve SEO', 'Add a FAQ section', 'Shorten the intro', 'Add more examples', 'Add a comparison table'].map((s) => (
                          <button key={s} onClick={() => setEditInstruction(s)} className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs rounded-full transition-colors border border-zinc-700">
                            {s}
                          </button>
                        ))}
                      </div>
                      <button onClick={handleAIEdit} disabled={isEditing || !editInstruction.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                        {isEditing ? <><Loader2 className="h-4 w-4 animate-spin" /> Editing...</> : <><Wand2 className="h-4 w-4" /> Apply Edit</>}
                      </button>
                    </div>
                  )}

                  {/* Image Generation Panel */}
                  {hasDraft && draft.imagePrompts.length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                      <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-blue-400" /> AI Image Generation
                      </h3>
                      <div className="p-3 bg-zinc-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-zinc-300">Featured Image</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleGenerateImage(draft.imagePrompts[0] || `Featured image for: ${draft.title}`, 'featured')} disabled={isGeneratingImage === 'featured'} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50">
                              {isGeneratingImage === 'featured' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Generate
                            </button>
                            <label className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded cursor-pointer transition-colors">
                              <Upload className="h-3 w-3" /> Upload
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'featured')} className="hidden" />
                            </label>
                          </div>
                        </div>
                        {draft.featuredImage && (
                          <div className="relative mt-2">
                            <img src={draft.featuredImage} alt="Featured" className="w-full h-32 object-cover rounded-lg" />
                            <button onClick={() => setDraft((prev) => ({ ...prev, featuredImage: '' }))} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80">
                              <X className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                      {draft.imagePrompts.slice(1).map((prompt, i) => (
                        <div key={i} className="p-3 bg-zinc-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400 truncate flex-1 mr-2">Image {i + 2}: {prompt}</span>
                            <button onClick={() => handleGenerateImage(prompt, 'inline')} disabled={isGeneratingImage === prompt} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 shrink-0">
                              {isGeneratingImage === prompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Generate
                            </button>
                          </div>
                        </div>
                      ))}
                      <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition-colors">
                        {isUploadingImage ? <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" /> : <Upload className="h-4 w-4 text-zinc-400" />}
                        <span className="text-xs text-zinc-400">Upload image to insert in post</span>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'inline')} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>

                {/* Right: Preview & Meta */}
                {hasDraft && (
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Meta info bar */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Title</label>
                          <input type="text" value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))} className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Slug</label>
                          <input type="text" value={draft.slug} onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))} className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-emerald-400 text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Meta Title ({draft.metaTitle.length}/60)</label>
                          <input type="text" value={draft.metaTitle} onChange={(e) => setDraft((prev) => ({ ...prev, metaTitle: e.target.value }))} maxLength={70} className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Focus Keyword</label>
                          <input type="text" value={draft.focusKeyword} onChange={(e) => setDraft((prev) => ({ ...prev, focusKeyword: e.target.value }))} className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Excerpt</label>
                          <input type="text" value={draft.excerpt} onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))} className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Meta Description ({draft.metaDescription.length}/160)</label>
                          <input type="text" value={draft.metaDescription} onChange={(e) => setDraft((prev) => ({ ...prev, metaDescription: e.target.value }))} maxLength={160} className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          {draft.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full">
                              {tag}
                              <button onClick={() => setDraft((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))}><X className="h-3 w-3" /></button>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 shrink-0">
                          <span>{draft.estimatedReadingTime || Math.ceil(draft.body.split(/\s+/).length / 200)} min read</span>
                          <span>{draft.body.split(/\s+/).length} words</span>
                          {draft.suggestedCategory && <span className="text-purple-400">{draft.suggestedCategory}</span>}
                        </div>
                      </div>
                    </div>

                    {/* View toggle */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewMode('preview')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
                        <Eye className="h-4 w-4" /> Preview
                      </button>
                      <button onClick={() => setViewMode('html')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'html' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
                        <Code className="h-4 w-4" /> HTML
                      </button>
                    </div>

                    {/* Content area */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                      {viewMode === 'preview' ? (
                        <div className="p-8 bg-white min-h-[500px]">
                          {draft.featuredImage && (
                            <img src={draft.featuredImage} alt={draft.title} style={{ width: '100%', height: '256px', objectFit: 'cover', borderRadius: '12px', marginBottom: '24px' }} />
                          )}
                          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '16px', lineHeight: 1.3 }}>{draft.title}</h1>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', fontSize: '14px', color: '#6b7280' }}>
                            <span>By Admin</span>
                            <span>-</span>
                            <span>{draft.estimatedReadingTime || Math.ceil(draft.body.split(/\s+/).length / 200)} min read</span>
                            {draft.suggestedCategory && (<><span>-</span><span style={{ color: '#9333ea' }}>{draft.suggestedCategory}</span></>)}
                          </div>
                          <div
                            ref={previewRef}
                            dangerouslySetInnerHTML={{ __html: previewBody }}
                            style={{ color: '#374151', fontSize: '16px', lineHeight: 1.75 }}
                            className="[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:text-gray-700 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-2 [&_li]:text-gray-700 [&_strong]:text-gray-900 [&_strong]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-purple-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4 [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900 [&_td]:border [&_td]:border-gray-300 [&_td]:px-4 [&_td]:py-2 [&_td]:text-gray-700 [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:text-gray-800 [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_hr]:border-gray-200 [&_hr]:my-6"
                          />
                        </div>
                      ) : (
                        <textarea
                          value={draft.body}
                          onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
                          className="w-full min-h-[500px] p-6 bg-zinc-950 text-emerald-400 font-mono text-sm resize-y focus:outline-none"
                          spellCheck={false}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

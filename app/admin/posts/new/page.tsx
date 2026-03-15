'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Upload,
  ImageIcon,
  Wand2,
  X,
  Globe,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  PenLine,
  Clock,
  Tag,
  Plus,
  Trash2,
  Calendar,
  User,
  FileText,
  Settings2,
  Mail,
} from 'lucide-react';
import TipTapEditor from '@/app/components/editor/TipTapEditor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Domain {
  _id: string;
  name: string;
  domain: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  level: number;
  parentId?: string;
  children?: Category[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'educational', label: 'Educational' },
];

const WORD_COUNTS = [
  { value: 800, label: '800 words' },
  { value: 1200, label: '1,200 words' },
  { value: 1500, label: '1,500 words' },
  { value: 2000, label: '2,000 words' },
  { value: 3000, label: '3,000 words' },
];

const AI_EDIT_CHIPS = [
  'Add FAQ section',
  'Improve SEO',
  'Make it more engaging',
  'Add internal links',
  'Shorten paragraphs',
  'Add a conclusion',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max);
}

// ---------------------------------------------------------------------------
// WebsiteSelector
// ---------------------------------------------------------------------------

function WebsiteSelector({
  domains,
  value,
  onChange,
}: {
  domains: Domain[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = domains.find((d) => d._id === value);

  const filtered = domains.filter((d) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.domain.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-left outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span className="text-zinc-200 truncate">{selected.name}</span>
            <span className="text-zinc-500 text-xs truncate">({selected.domain})</span>
          </span>
        ) : (
          <span className="text-zinc-500">Select website...</span>
        )}
        <ChevronDown className={`h-4 w-4 text-zinc-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-zinc-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search websites..."
                className="w-full rounded-md border border-zinc-600 bg-zinc-900 pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-500/50 transition"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-zinc-500">No websites found</div>
            ) : (
              filtered.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  onClick={() => {
                    onChange(d._id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    value === d._id
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-zinc-300 hover:bg-zinc-700/60'
                  }`}
                >
                  <Globe className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{d.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{d.domain}</p>
                  </div>
                  {value === d._id && (
                    <div className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategorySelect — flat list with indentation
// ---------------------------------------------------------------------------

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition [color-scheme:dark]"
    >
      <option value="">Select category...</option>
      {categories.map((cat) => (
        <option key={cat._id} value={cat._id}>
          {'\u00A0\u00A0'.repeat(cat.level || 0)}{cat.name}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = input.trim();
      if (tag && !tags.includes(tag)) {
        onChange([...tags, tag]);
      }
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 min-h-[42px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 cursor-pointer hover:bg-emerald-500/25 transition"
          onClick={() => onChange(tags.filter((t) => t !== tag))}
        >
          {tag}
          <X className="h-3 w-3" />
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Add tags...' : ''}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SEO Preview
// ---------------------------------------------------------------------------

function SEOPreview({
  title,
  slug,
  description,
  domain,
}: {
  title: string;
  slug: string;
  description: string;
  domain: string;
}) {
  const displayUrl = domain ? `${domain}/${slug || 'post-url'}` : `example.com/${slug || 'post-url'}`;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4 space-y-1">
      <p className="text-sm font-medium text-blue-400 truncate leading-tight">
        {title || 'Post Title'}
      </p>
      <p className="text-xs text-emerald-500 truncate">{displayUrl}</p>
      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
        {description || 'Meta description will appear here...'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams
// ---------------------------------------------------------------------------

function NewPostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'ai' ? 'ai' : 'write';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Mode
  const [mode, setMode] = useState<'write' | 'ai'>(initialMode);

  // Post fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [scheduledAt, setScheduledAt] = useState('');
  const [postType, setPostType] = useState<'blog_post' | 'guest_post'>('blog_post');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestExpiresAt, setGuestExpiresAt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [websiteId, setWebsiteId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [focusKeyword, setFocusKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [authorName, setAuthorName] = useState('Admin');

  // AI generation
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiWordCount, setAiWordCount] = useState(1500);
  const [aiLanguage, setAiLanguage] = useState('English');
  const [aiInstructions, setAiInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);

  // AI edit
  const [aiEditInstruction, setAiEditInstruction] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);

  // Data
  const [domains, setDomains] = useState<Domain[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);

  // Auto-save
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentChanged = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadDomains() {
      try {
        const res = await fetch('/api/admin/domains');
        const data = await res.json();
        setDomains(data.domains ?? []);
      } catch { /* ignore */ }
    }
    loadDomains();
  }, []);

  // Reload categories when website changes (filter by websiteId)
  useEffect(() => {
    async function loadCategories() {
      try {
        const url = websiteId
          ? `/api/categories?activeOnly=true&websiteId=${websiteId}`
          : '/api/categories?activeOnly=true';
        const res = await fetch(url);
        const data = await res.json();
        setCategories(data.data ?? data.categories ?? []);
      } catch { /* ignore */ }
    }
    loadCategories();
  }, [websiteId]);

  // ---------------------------------------------------------------------------
  // Slug auto-generation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  // ---------------------------------------------------------------------------
  // Auto-save (every 30 seconds when content changes)
  // ---------------------------------------------------------------------------

  const markChanged = useCallback(() => {
    contentChanged.current = true;
  }, []);

  useEffect(() => {
    markChanged();
  }, [title, body, excerpt, tags, metaTitle, metaDescription, markChanged]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(async () => {
      if (!contentChanged.current || !title.trim() || !websiteId) return;
      contentChanged.current = false;
      setAutoSaveStatus('saving');
      try {
        const payload = buildPayload('draft');
        if (savedId) {
          const res = await fetch(`/api/content/${savedId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!data.success) throw new Error();
        } else {
          const res = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!data.success) throw new Error();
          setSavedId(data.data?._id ?? null);
        }
        setAutoSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch {
        setAutoSaveStatus('error');
      }
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedId, websiteId, title]);

  // ---------------------------------------------------------------------------
  // Build payload
  // ---------------------------------------------------------------------------

  const buildPayload = useCallback(
    (overrideStatus?: string) => {
      const s = overrideStatus ?? status;
      const base: Record<string, unknown> = {
        websiteId,
        title,
        slug,
        body,
        excerpt,
        type: postType,
        status: s,
        featuredImage,
        metaTitle,
        metaDescription,
        focusKeyword,
        secondaryKeywords: secondaryKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        tags,
        categoryId: categoryId || undefined,
        authorName,
      };

      if (s === 'published') {
        base.publishedAt = new Date().toISOString();
      }
      if (s === 'scheduled' && scheduledAt) {
        base.scheduledAt = new Date(scheduledAt).toISOString();
      }
      if (postType === 'guest_post') {
        base.schemaMarkup = { type: 'guest_post', data: { guestEmail } };
        if (guestExpiresAt) {
          base.expiresAt = new Date(guestExpiresAt).toISOString();
        }
      }

      return base;
    },
    [
      websiteId, title, slug, body, excerpt, postType, status,
      featuredImage, metaTitle, metaDescription, focusKeyword,
      secondaryKeywords, tags, categoryId, authorName,
      scheduledAt, guestEmail, guestExpiresAt,
    ],
  );

  // ---------------------------------------------------------------------------
  // Image upload handler (for TipTap)
  // ---------------------------------------------------------------------------

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.data?.secure_url ?? data.secure_url;
  }, []);

  // ---------------------------------------------------------------------------
  // Featured image upload
  // ---------------------------------------------------------------------------

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await handleImageUpload(file);
      setFeaturedImage(url);
    } catch { /* ignore */ }
    finally {
      setIsUploadingImage(false);
      if (featuredFileInputRef.current) featuredFileInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // Featured image AI generate
  // ---------------------------------------------------------------------------

  const handleGenerateFeaturedImage = async () => {
    if (!title.trim()) return;
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/ai-blog-writer/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Featured image for blog post: ${title}`, size: '1792x1024' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setFeaturedImage(data.data?.url ?? '');
    } catch { /* ignore */ }
    finally {
      setIsGeneratingImage(false);
    }
  };

  // ---------------------------------------------------------------------------
  // AI generate
  // ---------------------------------------------------------------------------

  const handleGenerate = async () => {
    if (!aiTopic.trim() || !websiteId) return;
    setIsGenerating(true);
    setGenerateProgress(0);

    const progressTimer = setInterval(() => {
      setGenerateProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 800);

    try {
      const res = await fetch('/api/ai-blog-writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          topic: aiTopic.trim(),
          keywords: aiKeywords.trim() || undefined,
          tone: aiTone,
          wordCount: aiWordCount,
          language: aiLanguage,
          additionalInstructions: aiInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Generation failed');

      const result = data.data;
      setTitle(result.title || aiTopic);
      setSlug(slugify(result.title || aiTopic));
      setSlugManual(false);
      setBody(result.body || '');
      setExcerpt(result.excerpt || '');
      setMetaTitle(result.metaTitle || '');
      setMetaDescription(result.metaDescription || '');
      setFocusKeyword(result.focusKeyword || '');
      setSecondaryKeywords((result.secondaryKeywords || []).join(', '));
      setTags(result.tags || []);
      if (data.savedId) setSavedId(data.savedId);
      setGenerateProgress(100);
      setMode('write');
    } catch { /* ignore */ }
    finally {
      clearInterval(progressTimer);
      setIsGenerating(false);
      setGenerateProgress(0);
    }
  };

  // ---------------------------------------------------------------------------
  // AI edit
  // ---------------------------------------------------------------------------

  const handleAIEdit = async (instruction?: string) => {
    const inst = instruction || aiEditInstruction.trim();
    if (!inst || !body) return;
    setIsAiEditing(true);
    try {
      const res = await fetch('/api/ai-blog-writer/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: body,
          instruction: inst,
          title,
          excerpt,
          metaTitle,
          metaDescription,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const result = data.data;
      if (result.body) setBody(result.body);
      if (result.title) setTitle(result.title);
      if (result.excerpt) setExcerpt(result.excerpt);
      if (result.metaTitle) setMetaTitle(result.metaTitle);
      if (result.metaDescription) setMetaDescription(result.metaDescription);
      setAiEditInstruction('');
    } catch { /* ignore */ }
    finally {
      setIsAiEditing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save / Publish
  // ---------------------------------------------------------------------------

  const handleSave = async (overrideStatus?: 'draft' | 'published' | 'scheduled') => {
    const s = overrideStatus ?? status;
    if (!websiteId || !title.trim()) return;
    setIsSaving(true);
    try {
      const payload = buildPayload(s);
      if (savedId) {
        const res = await fetch(`/api/content/${savedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        const res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setSavedId(data.data?._id ?? null);
      }
      setAutoSaveStatus('saved');
      setLastSavedAt(new Date());
      if (s === 'published') {
        router.push('/admin/posts');
      }
    } catch { /* ignore */ }
    finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  const handlePreview = () => {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) return;
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>${title || 'Preview'}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        h1 { font-size: 2em; margin-bottom: 0.5em; }
        h2 { font-size: 1.5em; margin-top: 1.5em; }
        pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
        code { font-size: 0.9em; }
        blockquote { border-left: 4px solid #e5e7eb; padding-left: 16px; color: #666; }
      </style></head>
      <body>
        ${featuredImage ? `<img src="${featuredImage}" alt="${featuredImageAlt}" style="width:100%;margin-bottom:24px;" />` : ''}
        <h1>${title}</h1>
        ${excerpt ? `<p style="font-size:1.1em;color:#666;">${excerpt}</p><hr/>` : ''}
        ${body}
      </body></html>
    `);
    previewWindow.document.close();
  };

  // ---------------------------------------------------------------------------
  // Selected domain for SEO preview
  // ---------------------------------------------------------------------------

  const selectedDomain = useMemo(() => {
    const d = domains.find((d) => d._id === websiteId);
    return d?.domain || '';
  }, [domains, websiteId]);

  // ---------------------------------------------------------------------------
  // Auto-save status text
  // ---------------------------------------------------------------------------

  const autoSaveText = useMemo(() => {
    if (autoSaveStatus === 'saving') return 'Saving...';
    if (autoSaveStatus === 'saved' && lastSavedAt) {
      return `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (autoSaveStatus === 'error') return 'Save failed';
    return '';
  }, [autoSaveStatus, lastSavedAt]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-4 py-3 sm:px-6">
        <button
          onClick={() => router.push('/admin/posts')}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200 truncate">
            {title || 'New Post'}
          </p>
        </div>

        {autoSaveText && (
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs ${
            autoSaveStatus === 'saving' ? 'text-zinc-500' :
            autoSaveStatus === 'error' ? 'text-red-400' :
            'text-zinc-500'
          }`}>
            {autoSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
            {autoSaveStatus === 'saved' && <Clock className="h-3 w-3" />}
            {autoSaveText}
          </span>
        )}

        <button
          onClick={handlePreview}
          disabled={!body}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40 transition"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left column — editor */}
        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:max-w-[70%]">
          {/* Mode toggle */}
          <div className="mb-6 flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 w-fit">
            <button
              onClick={() => setMode('write')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                mode === 'write'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <PenLine className="h-4 w-4" />
              Write
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                mode === 'ai'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
          </div>

          {mode === 'write' ? (
            /* ------ WRITE MODE ------ */
            <div className="space-y-5">
              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className="w-full bg-transparent text-3xl font-bold text-zinc-100 placeholder:text-zinc-700 outline-none"
              />

              {/* Slug */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-600">Slug:</span>
                {slugEditing ? (
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSlugManual(true);
                    }}
                    onBlur={() => setSlugEditing(false)}
                    autoFocus
                    className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300 outline-none focus:border-emerald-500/50"
                  />
                ) : (
                  <button
                    onClick={() => setSlugEditing(true)}
                    className="text-zinc-400 hover:text-emerald-400 transition truncate max-w-md"
                  >
                    {slug || 'post-url'}
                  </button>
                )}
              </div>

              {/* Excerpt */}
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Excerpt (optional)..."
                rows={2}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 resize-none transition"
              />

              {/* TipTap Editor */}
              <TipTapEditor
                content={body}
                onChange={setBody}
                placeholder="Start writing your post..."
                onImageUpload={handleImageUpload}
              />

              {/* AI Edit section (shown when there is content) */}
              {body && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <Wand2 className="h-4 w-4 text-purple-400" />
                    AI Edit
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiEditInstruction}
                      onChange={(e) => setAiEditInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAIEdit();
                        }
                      }}
                      placeholder="Describe what to change..."
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition"
                    />
                    <button
                      onClick={() => handleAIEdit()}
                      disabled={isAiEditing || !aiEditInstruction.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-40 transition"
                    >
                      {isAiEditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      Apply
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_EDIT_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleAIEdit(chip)}
                        disabled={isAiEditing}
                        className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-xs text-zinc-400 hover:border-purple-500/40 hover:text-purple-300 disabled:opacity-40 transition"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ------ AI GENERATE MODE ------ */
            <div className="space-y-5 max-w-2xl">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-1">Generate with AI</h2>
                <p className="text-sm text-zinc-500">Fill in the details and let AI write your blog post.</p>
              </div>

              {/* Topic */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Topic <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="What should the post be about?"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>

              {/* Target keywords */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Target Keywords</label>
                <input
                  type="text"
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>

              {/* Tone + Word Count row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Tone</label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition [color-scheme:dark]"
                  >
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Word Count</label>
                  <select
                    value={aiWordCount}
                    onChange={(e) => setAiWordCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition [color-scheme:dark]"
                  >
                    {WORD_COUNTS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Language</label>
                <input
                  type="text"
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value)}
                  placeholder="English"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>

              {/* Additional instructions */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Additional Instructions</label>
                <textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Any specific requirements or guidelines..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 resize-none transition"
                />
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !aiTopic.trim() || !websiteId}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-purple-900/30"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating... {Math.round(generateProgress)}%
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Post
                  </>
                )}
              </button>

              {/* Progress bar */}
              {isGenerating && (
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${generateProgress}%` }}
                  />
                </div>
              )}

              {!websiteId && (
                <p className="text-xs text-yellow-500/70 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Select a website in the sidebar before generating.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right column — sidebar */}
        <aside className="w-full lg:w-[30%] lg:min-w-[320px] lg:max-w-[400px] border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/30 overflow-y-auto lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)]">
          <div className="p-5 space-y-6">
            {/* Publish box */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                Publish
              </h3>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'scheduled')}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition [color-scheme:dark]"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              {status === 'scheduled' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition [color-scheme:dark]"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={isSaving || !websiteId || !title.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave(status === 'scheduled' ? 'scheduled' : 'published')}
                  disabled={isSaving || !websiteId || !title.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {savedId ? 'Update' : 'Publish'}
                </button>
              </div>
            </div>

            {/* Post Type */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-zinc-500" />
                Post Type
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setPostType('blog_post')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    postType === 'blog_post'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Blog Post
                </button>
                <button
                  onClick={() => setPostType('guest_post')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    postType === 'guest_post'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Guest Post
                </button>
              </div>

              {postType === 'guest_post' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">Guest Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="guest@example.com"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 pl-10 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">Expiry Date</label>
                    <input
                      type="date"
                      value={guestExpiresAt}
                      onChange={(e) => setGuestExpiresAt(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Featured Image */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-zinc-500" />
                Featured Image
              </h3>

              {featuredImage ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-zinc-700">
                    <img src={featuredImage} alt={featuredImageAlt} className="w-full h-40 object-cover" />
                    <button
                      onClick={() => setFeaturedImage('')}
                      className="absolute top-2 right-2 rounded-full bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="Alt text..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={featuredFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFeaturedImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => featuredFileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/30 px-3 py-4 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 disabled:opacity-40 transition"
                  >
                    {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Image
                  </button>
                  <button
                    onClick={handleGenerateFeaturedImage}
                    disabled={isGeneratingImage || !title.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-400 hover:border-purple-500/40 hover:text-purple-300 disabled:opacity-40 transition"
                  >
                    {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Generate with AI
                  </button>
                  <input
                    type="text"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="Alt text..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition"
                  />
                </div>
              )}
            </div>

            {/* Website */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Globe className="h-4 w-4 text-zinc-500" />
                Website
              </h3>
              <WebsiteSelector domains={domains} value={websiteId} onChange={setWebsiteId} />
            </div>

            {/* Category */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                Category
              </h3>
              <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
            </div>

            {/* Tags */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Tag className="h-4 w-4 text-zinc-500" />
                Tags
              </h3>
              <TagInput tags={tags} onChange={setTags} />
            </div>

            {/* SEO */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <button
                onClick={() => setSeoOpen(!seoOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800/40 transition"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-zinc-500" />
                  SEO
                </span>
                <ChevronRight className={`h-4 w-4 text-zinc-500 transition-transform ${seoOpen ? 'rotate-90' : ''}`} />
              </button>

              {seoOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
                  {/* Focus keyword */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">Focus Keyword</label>
                    <input
                      type="text"
                      value={focusKeyword}
                      onChange={(e) => setFocusKeyword(e.target.value)}
                      placeholder="Primary keyword..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>

                  {/* Secondary keywords */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">Secondary Keywords</label>
                    <input
                      type="text"
                      value={secondaryKeywords}
                      onChange={(e) => setSecondaryKeywords(e.target.value)}
                      placeholder="keyword1, keyword2..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>

                  {/* Meta Title */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-400">Meta Title</label>
                      <span className={`text-xs ${metaTitle.length > 70 ? 'text-red-400' : 'text-zinc-600'}`}>
                        {metaTitle.length}/70
                      </span>
                    </div>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(truncate(e.target.value, 70))}
                      placeholder="SEO title..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition"
                    />
                  </div>

                  {/* Meta Description */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-400">Meta Description</label>
                      <span className={`text-xs ${metaDescription.length > 160 ? 'text-red-400' : 'text-zinc-600'}`}>
                        {metaDescription.length}/160
                      </span>
                    </div>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(truncate(e.target.value, 160))}
                      placeholder="SEO description..."
                      rows={2}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 resize-none transition"
                    />
                  </div>

                  {/* SEO Preview */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">Search Preview</label>
                    <SEOPreview
                      title={metaTitle || title}
                      slug={slug}
                      description={metaDescription || excerpt}
                      domain={selectedDomain}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Author */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-500" />
                Author
              </h3>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author name..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense boundary for useSearchParams
// ---------------------------------------------------------------------------

export default function NewPostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      }
    >
      <NewPostPageInner />
    </Suspense>
  );
}

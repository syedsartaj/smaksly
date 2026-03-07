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
  RefreshCw,
  ChevronDown,
  X,
  Eye,
  Code,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';

interface Website {
  _id: string;
  name: string;
  domain: string;
  niche?: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
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

export default function AIBlogWriterPage() {
  // Website selection
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [websiteSearch, setWebsiteSearch] = useState('');
  const [showWebsiteDropdown, setShowWebsiteDropdown] = useState(false);
  const [loadingWebsites, setLoadingWebsites] = useState(true);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Generation settings
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [wordCount, setWordCount] = useState(1500);
  const [language, setLanguage] = useState('English');
  const [includeImages, setIncludeImages] = useState(true);
  const [imageCount, setImageCount] = useState(2);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Blog state
  const [draft, setDraft] = useState<BlogDraft>(emptyDraft);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
  const [editInstruction, setEditInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // showEditPanel removed — AI edit visibility is controlled by hasDraft

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const websiteDropdownRef = useRef<HTMLDivElement>(null);

  // Load websites
  useEffect(() => {
    async function loadWebsites() {
      try {
        const res = await fetch('/api/websites?limit=200');
        const data = await res.json();
        if (data.success) {
          setWebsites(data.data || []);
        }
      } catch {
        console.error('Failed to load websites');
      } finally {
        setLoadingWebsites(false);
      }
    }
    loadWebsites();
  }, []);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories?limit=100');
        const data = await res.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      } catch {
        console.error('Failed to load categories');
      }
    }
    loadCategories();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (websiteDropdownRef.current && !websiteDropdownRef.current.contains(e.target as Node)) {
        setShowWebsiteDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const filteredWebsites = websites.filter(
    (w) =>
      w.name.toLowerCase().includes(websiteSearch.toLowerCase()) ||
      w.domain.toLowerCase().includes(websiteSearch.toLowerCase())
  );

  // Generate blog
  const handleGenerate = async () => {
    if (!selectedWebsite) {
      setError('Please select a website first');
      return;
    }
    if (!topic.trim() || topic.trim().length < 5) {
      setError('Please enter a topic (at least 5 characters)');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setDraft(emptyDraft);

    try {
      const res = await fetch('/api/ai-blog-writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: selectedWebsite._id,
          topic: topic.trim(),
          keywords: keywords.trim() || undefined,
          tone,
          wordCount,
          language,
          includeImages,
          imageCount,
          additionalInstructions: additionalInstructions.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setDraft({
        ...data.data,
        featuredImage: '',
        savedId: data.savedId || undefined,
      });
      setSuccess('Blog post generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blog');
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit blog via AI
  const handleAIEdit = async () => {
    if (!editInstruction.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-blog-writer/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: draft.body,
          instruction: editInstruction.trim(),
          title: draft.title,
          excerpt: draft.excerpt,
          metaTitle: draft.metaTitle,
          metaDescription: draft.metaDescription,
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
        imagePrompts: [
          ...prev.imagePrompts,
          ...(data.data.newImagePrompts || []),
        ],
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
        body: JSON.stringify({
          prompt,
          size: type === 'featured' ? '1792x1024' : '1024x1024',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (type === 'featured') {
        setDraft((prev) => ({ ...prev, featuredImage: data.data.url }));
      } else {
        // Replace IMAGE_PLACEHOLDER in body
        setDraft((prev) => {
          let updatedBody = prev.body;
          // Find the first IMAGE_PLACEHOLDER that hasn't been replaced
          const placeholderRegex = /src="IMAGE_PLACEHOLDER_\d+"/;
          if (placeholderRegex.test(updatedBody)) {
            updatedBody = updatedBody.replace(placeholderRegex, `src="${data.data.url}"`);
          } else {
            // Append image before the last paragraph
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

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

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

  // Save blog to database
  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    if (!selectedWebsite || !draft.title || !draft.body) {
      setError('Cannot save — missing website, title, or content');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Find matching category
      let categoryId = selectedCategory || undefined;
      if (!categoryId && draft.suggestedCategory) {
        const cat = categories.find(
          (c) => c.name.toLowerCase() === draft.suggestedCategory.toLowerCase()
        );
        if (cat) categoryId = cat._id;
      }

      if (draft.savedId) {
        // Update existing
        const res = await fetch(`/api/content/${draft.savedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.title,
            slug: draft.slug,
            excerpt: draft.excerpt,
            body: draft.body,
            content: draft.body,
            featuredImage: draft.featuredImage,
            metaTitle: draft.metaTitle,
            metaDescription: draft.metaDescription,
            focusKeyword: draft.focusKeyword,
            secondaryKeywords: draft.secondaryKeywords,
            tags: draft.tags,
            categoryId,
            status,
            ...(status === 'published' ? { publishedAt: new Date().toISOString() } : {}),
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setSuccess(`Blog post ${status === 'published' ? 'published' : 'saved as draft'}!`);
      } else {
        // Create new
        const res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId: selectedWebsite._id,
            title: draft.title,
            slug: draft.slug,
            type: 'blog_post',
            status,
            excerpt: draft.excerpt,
            body: draft.body,
            content: draft.body,
            featuredImage: draft.featuredImage,
            seo: {
              metaTitle: draft.metaTitle,
              metaDescription: draft.metaDescription,
            },
            focusKeyword: draft.focusKeyword,
            secondaryKeywords: draft.secondaryKeywords,
            tags: draft.tags,
            categoryId,
            author: 'Admin',
            isAiGenerated: true,
            ...(status === 'published' ? { publishedAt: new Date().toISOString() } : {}),
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setDraft((prev) => ({ ...prev, savedId: data.data._id }));
        setSuccess(`Blog post ${status === 'published' ? 'published' : 'saved as draft'}!`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy HTML
  const handleCopyHTML = useCallback(() => {
    navigator.clipboard.writeText(draft.body);
    setSuccess('HTML copied to clipboard!');
  }, [draft.body]);

  // Reset
  const handleReset = () => {
    setDraft(emptyDraft);
    setTopic('');
    setKeywords('');
    setAdditionalInstructions('');
    setEditInstruction('');
    setError(null);
  };

  const hasDraft = !!draft.body;

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Blog Writer</h1>
              <p className="text-sm text-zinc-400">Generate SEO-optimized blog posts with AI</p>
            </div>
          </div>

          {hasDraft && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm"
              >
                New Post
              </button>
              <button
                onClick={handleCopyHTML}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
              >
                <Copy className="h-4 w-4" />
                Copy HTML
              </button>
              <button
                onClick={() => handleSave('draft')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </button>
              <button
                onClick={() => handleSave('published')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Publish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="max-w-[1600px] mx-auto mb-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      {success && (
        <div className="max-w-[1600px] mx-auto mb-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto flex gap-6">
        {/* Left Panel — Settings & Generation */}
        <div className={`${hasDraft ? 'w-[380px]' : 'w-full max-w-2xl mx-auto'} flex-shrink-0 space-y-4 transition-all`}>
          {/* Website Selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <Globe className="inline h-4 w-4 mr-1.5 text-emerald-400" />
              Select Website
            </label>
            <div className="relative" ref={websiteDropdownRef}>
              <button
                onClick={() => setShowWebsiteDropdown(!showWebsiteDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-left hover:border-zinc-600 transition-colors"
              >
                {selectedWebsite ? (
                  <div>
                    <span className="text-white">{selectedWebsite.name}</span>
                    <span className="text-zinc-500 text-xs ml-2">{selectedWebsite.domain}</span>
                  </div>
                ) : (
                  <span className="text-zinc-500">Choose a website...</span>
                )}
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </button>

              {showWebsiteDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-zinc-700">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        value={websiteSearch}
                        onChange={(e) => setWebsiteSearch(e.target.value)}
                        placeholder="Search websites..."
                        className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {loadingWebsites ? (
                      <div className="p-4 text-center text-zinc-500 text-sm">Loading...</div>
                    ) : filteredWebsites.length === 0 ? (
                      <div className="p-4 text-center text-zinc-500 text-sm">No websites found</div>
                    ) : (
                      filteredWebsites.map((w) => (
                        <button
                          key={w._id}
                          onClick={() => {
                            setSelectedWebsite(w);
                            setShowWebsiteDropdown(false);
                            setWebsiteSearch('');
                          }}
                          className={`w-full px-3 py-2.5 text-left hover:bg-zinc-700 transition-colors ${
                            selectedWebsite?._id === w._id ? 'bg-emerald-600/10 text-emerald-400' : 'text-white'
                          }`}
                        >
                          <div className="text-sm font-medium">{w.name}</div>
                          <div className="text-xs text-zinc-500">{w.domain}{w.niche ? ` - ${w.niche}` : ''}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Topic & Settings */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Topic / Title *
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={2}
                placeholder="e.g., 10 Best Digital Marketing Strategies for Small Businesses in 2026"
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Target Keywords
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="digital marketing, small business marketing"
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Word Count</label>
                <select
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {WORD_COUNTS.map((wc) => (
                    <option key={wc.value} value={wc.value}>{wc.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Language</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Auto-suggest</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-zinc-300">Include image placeholders</span>
              </label>
              {includeImages && (
                <select
                  value={imageCount}
                  onChange={(e) => setImageCount(Number(e.target.value))}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} image{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Additional instructions */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Additional Instructions (optional)</label>
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={2}
                placeholder="e.g., Include a comparison table, mention competitor X..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none text-xs"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedWebsite || !topic.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating blog post...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {hasDraft ? 'Regenerate Blog Post' : 'Generate Blog Post'}
                </>
              )}
            </button>
          </div>

          {/* AI Edit Panel */}
          {hasDraft && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-purple-400" />
                  AI Edit
                </h3>
              </div>
              <textarea
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                rows={3}
                placeholder="e.g., Add a section about email marketing, make the intro more engaging, add a comparison table..."
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAIEdit();
                  }
                }}
              />
              <div className="flex gap-2 flex-wrap">
                {[
                  'Make it more engaging',
                  'Improve SEO',
                  'Add a FAQ section',
                  'Shorten the intro',
                  'Add more examples',
                  'Add a comparison table',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setEditInstruction(suggestion)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs rounded-full transition-colors border border-zinc-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAIEdit}
                disabled={isEditing || !editInstruction.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Editing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Apply Edit
                  </>
                )}
              </button>
            </div>
          )}

          {/* Image Generation Panel */}
          {hasDraft && draft.imagePrompts.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-400" />
                AI Image Generation
              </h3>
              <p className="text-xs text-zinc-500">Click to generate images using DALL-E 3</p>

              {/* Featured image */}
              <div className="p-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-300">Featured Image</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleGenerateImage(draft.imagePrompts[0] || `Featured image for: ${draft.title}`, 'featured')}
                      disabled={isGeneratingImage === 'featured'}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                    >
                      {isGeneratingImage === 'featured' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Generate
                    </button>
                    <label className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded cursor-pointer transition-colors">
                      <Upload className="h-3 w-3" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'featured')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {draft.featuredImage && (
                  <div className="relative mt-2">
                    <img src={draft.featuredImage} alt="Featured" className="w-full h-32 object-cover rounded-lg" />
                    <button
                      onClick={() => setDraft((prev) => ({ ...prev, featuredImage: '' }))}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-1 truncate">{draft.imagePrompts[0] || 'Auto-generated prompt'}</p>
              </div>

              {/* Inline images */}
              {draft.imagePrompts.slice(1).map((prompt, i) => (
                <div key={i} className="p-3 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 truncate flex-1 mr-2">Image {i + 2}: {prompt}</span>
                    <button
                      onClick={() => handleGenerateImage(prompt, 'inline')}
                      disabled={isGeneratingImage === prompt}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isGeneratingImage === prompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Generate
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload inline image */}
              <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition-colors">
                {isUploadingImage ? (
                  <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-zinc-400" />
                )}
                <span className="text-xs text-zinc-400">Upload image to insert in post</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'inline')}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Right Panel — Preview & Editor */}
        {hasDraft && (
          <div className="flex-1 min-w-0 space-y-4">
            {/* Meta info bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Slug</label>
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-emerald-400 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Meta Title ({draft.metaTitle.length}/60)</label>
                  <input
                    type="text"
                    value={draft.metaTitle}
                    onChange={(e) => setDraft((prev) => ({ ...prev, metaTitle: e.target.value }))}
                    maxLength={70}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Focus Keyword</label>
                  <input
                    type="text"
                    value={draft.focusKeyword}
                    onChange={(e) => setDraft((prev) => ({ ...prev, focusKeyword: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Excerpt</label>
                  <input
                    type="text"
                    value={draft.excerpt}
                    onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Meta Description ({draft.metaDescription.length}/160)</label>
                  <input
                    type="text"
                    value={draft.metaDescription}
                    onChange={(e) => setDraft((prev) => ({ ...prev, metaDescription: e.target.value }))}
                    maxLength={160}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              {/* Tags & Info */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {draft.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full">
                      {tag}
                      <button onClick={() => setDraft((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))}>
                        <X className="h-3 w-3" />
                      </button>
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
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={() => setViewMode('html')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === 'html' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Code className="h-4 w-4" />
                HTML
              </button>
            </div>

            {/* Content area */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {viewMode === 'preview' ? (
                <div className="p-8 bg-white min-h-[600px]">
                  {/* Featured Image */}
                  {draft.featuredImage && (
                    <img
                      src={draft.featuredImage}
                      alt={draft.title}
                      className="w-full h-64 object-cover rounded-xl mb-6"
                    />
                  )}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {draft.title}
                  </h1>
                  <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
                    <span>By Admin</span>
                    <span>-</span>
                    <span>{draft.estimatedReadingTime || Math.ceil(draft.body.split(/\s+/).length / 200)} min read</span>
                    {draft.suggestedCategory && (
                      <>
                        <span>-</span>
                        <span className="text-purple-600">{draft.suggestedCategory}</span>
                      </>
                    )}
                  </div>
                  <div
                    ref={previewRef}
                    className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: draft.body }}
                  />
                </div>
              ) : (
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
                  className="w-full min-h-[600px] p-6 bg-zinc-950 text-emerald-400 font-mono text-sm resize-y focus:outline-none"
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for general uploads */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="general-upload"
      />
    </div>
  );
}

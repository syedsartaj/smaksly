'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Wand2, Upload, Loader2, Link as LinkIcon } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: 'draft' | 'published' | 'scheduled';
  type: 'blog_post';
  authorName: string;
  authorBio: string;
  categoryId: string;
  tags: string[];
  featuredImage: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  scheduledAt: string;
}

interface BlogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BlogFormData) => Promise<void>;
  editData?: BlogFormData & { _id: string };
  categories: Category[];
  websiteId: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

const defaultFormData: BlogFormData = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  status: 'draft',
  type: 'blog_post',
  authorName: 'Admin',
  authorBio: '',
  categoryId: '',
  tags: [],
  featuredImage: '',
  metaTitle: '',
  metaDescription: '',
  focusKeyword: '',
  scheduledAt: '',
};

export default function BlogFormModal({
  isOpen,
  onClose,
  onSubmit,
  editData,
  categories,
  websiteId,
}: BlogFormModalProps) {
  const [formData, setFormData] = useState<BlogFormData>(defaultFormData);
  const [keyword, setKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editData) {
      setFormData({
        title: editData.title || '',
        slug: editData.slug || '',
        excerpt: editData.excerpt || '',
        body: editData.body || '',
        status: editData.status || 'draft',
        type: 'blog_post',
        authorName: editData.authorName || 'Admin',
        authorBio: editData.authorBio || '',
        categoryId: editData.categoryId || '',
        tags: editData.tags || [],
        featuredImage: editData.featuredImage || '',
        metaTitle: editData.metaTitle || '',
        metaDescription: editData.metaDescription || '',
        focusKeyword: editData.focusKeyword || '',
        scheduledAt: editData.scheduledAt || '',
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [editData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'title' && !editData) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleGenerateAI = async () => {
    if (!keyword.trim()) {
      setError('Please enter a keyword');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate content');

      const cleanBody = (data.body || '').replace(/\*/g, '');
      setFormData((prev) => ({
        ...prev,
        title: data.title || prev.title,
        slug: generateSlug(data.title || prev.title),
        body: cleanBody,
        excerpt: data.excerpt || prev.excerpt,
        metaTitle: data.metaTitle || data.title || prev.metaTitle,
        metaDescription: data.metaDescription || data.excerpt || prev.metaDescription,
        focusKeyword: keyword,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setFormData((prev) => ({ ...prev, featuredImage: data.secure_url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleAddLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !linkUrl || !previewRef.current) {
      setError('Please select text in the preview and enter a valid URL');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    if (!selectedText) {
      setError('Please select some text in the preview');
      return;
    }

    try {
      const formattedUrl = /^(http|https):\/\//i.test(linkUrl)
        ? linkUrl
        : `https://${linkUrl}`;

      const link = document.createElement('a');
      link.href = formattedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = selectedText;
      link.className = 'text-blue-600 hover:underline';

      range.deleteContents();
      range.insertNode(link);

      setFormData((prev) => ({
        ...prev,
        body: previewRef.current!.innerHTML,
      }));

      setLinkUrl('');
      selection.removeAllRanges();
    } catch (err) {
      setError('Failed to add link');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.body.trim()) {
      setError('Content is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blog');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">
            {editData ? 'Edit Blog Post' : 'Create Blog Post'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="flex divide-x divide-zinc-800">
            {/* Left Column - Form */}
            <div className="flex-1 p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* AI Generation */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <label className="block text-sm font-medium text-emerald-400 mb-2">
                  <Wand2 className="inline h-4 w-4 mr-1" />
                  Generate with AI
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter keyword or topic..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Generate
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter blog title..."
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-emerald-400 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="auto-generated-slug"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Excerpt
                </label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Brief description of the blog post..."
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Content *
                </label>
                <textarea
                  name="body"
                  value={formData.body}
                  onChange={handleChange}
                  rows={10}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y font-mono text-sm"
                  placeholder="Write your blog content here (HTML supported)..."
                />
              </div>

              {/* Status & Category Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scheduled Date */}
              {formData.status === 'scheduled' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    value={formData.scheduledAt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  name="authorName"
                  value={formData.authorName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Author name"
                />
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Featured Image
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="featuredImage"
                    value={formData.featuredImage}
                    onChange={handleChange}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Image URL or upload..."
                  />
                  <label className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Add tag and press Enter..."
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* SEO Section */}
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">SEO Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Meta Title ({formData.metaTitle.length}/70)
                    </label>
                    <input
                      type="text"
                      name="metaTitle"
                      value={formData.metaTitle}
                      onChange={handleChange}
                      maxLength={70}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="SEO title..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Meta Description ({formData.metaDescription.length}/160)
                    </label>
                    <textarea
                      name="metaDescription"
                      value={formData.metaDescription}
                      onChange={handleChange}
                      maxLength={160}
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                      placeholder="SEO description..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Focus Keyword
                    </label>
                    <input
                      type="text"
                      name="focusKeyword"
                      value={formData.focusKeyword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Main keyword..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="w-[400px] p-6 bg-white overflow-y-auto max-h-[70vh]">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Live Preview</h3>

              {/* Link Tool */}
              <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <LinkIcon className="inline h-3 w-3 mr-1" />
                  Add Link to Selected Text
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <h1 className="text-2xl font-bold text-gray-800 mb-3">
                  {formData.title || 'Post Title'}
                </h1>
                {formData.featuredImage && (
                  <img
                    src={formData.featuredImage}
                    alt="Featured"
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div
                  ref={previewRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="text-gray-700 focus:outline-none min-h-[200px]"
                  dangerouslySetInnerHTML={{ __html: formData.body || '<p class="text-gray-400 italic">Start writing to see preview...</p>' }}
                  onInput={() => {
                    if (previewRef.current) {
                      setFormData((prev) => ({
                        ...prev,
                        body: previewRef.current!.innerHTML,
                      }));
                    }
                  }}
                />
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  <p><strong>Author:</strong> {formData.authorName || 'Admin'}</p>
                  <p><strong>Status:</strong> {formData.status}</p>
                  {formData.tags.length > 0 && (
                    <p><strong>Tags:</strong> {formData.tags.join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editData ? 'Update' : 'Create'} Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

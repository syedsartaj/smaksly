'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Sparkles,
  Search,
  Filter,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  Clock,
  Check,
  PenLine,
  MoreHorizontal,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

interface ContentData {
  _id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  excerpt?: string;
  wordCount: number;
  readingTime: number;
  isAiGenerated?: boolean;
  websiteId?: { _id: string; name: string; domain: string };
  keywordId?: { _id: string; keyword: string; volume: number };
  createdAt: string;
  publishedAt?: string;
}

interface ContentStats {
  totals: {
    totalContent: number;
    totalWords: number;
    avgWordCount: number;
    publishedCount: number;
    draftCount: number;
    scheduledCount: number;
    aiGeneratedCount: number;
  };
}

interface Website {
  _id: string;
  name: string;
  domain: string;
}

interface Keyword {
  _id: string;
  keyword: string;
  volume: number;
  difficulty: number;
}

export default function ContentPage() {
  const [content, setContent] = useState<ContentData[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    websiteId: '',
    status: '',
    type: '',
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Fetch content
  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.websiteId && { websiteId: filters.websiteId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
      });

      const res = await fetch(`/api/content?${params}`);
      const data = await res.json();

      if (data.success) {
        setContent(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  // Fetch stats and websites
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, websitesRes] = await Promise.all([
          fetch('/api/content/stats'),
          fetch('/api/websites?limit=100'),
        ]);

        const [statsData, websitesData] = await Promise.all([
          statsRes.json(),
          websitesRes.json(),
        ]);

        if (statsData.success) {
          setStats(statsData.data);
        }
        if (websitesData.success) {
          setWebsites(websitesData.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedContent.length} content items?`)) return;

    try {
      const res = await fetch('/api/content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedContent }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedContent([]);
        fetchContent();
      }
    } catch (error) {
      console.error('Failed to delete content:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-900/20 text-emerald-400';
      case 'draft':
        return 'bg-zinc-800 text-zinc-400';
      case 'scheduled':
        return 'bg-blue-900/20 text-blue-400';
      case 'archived':
        return 'bg-red-900/20 text-red-400';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <Check className="h-3 w-3" />;
      case 'draft':
        return <PenLine className="h-3 w-3" />;
      case 'scheduled':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Content</h1>
              <p className="text-zinc-400 mt-1">
                {total} articles across your network
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchContent}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                <Sparkles className="h-4 w-4" />
                AI Generate
              </button>
              <Link
                href="/content/new"
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                <Plus className="h-4 w-4" />
                New Content
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Content</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.totalContent)}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Check className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Published</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.publishedCount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <PenLine className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Drafts</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.draftCount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">AI Generated</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.aiGeneratedCount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Words</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.totalWords)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-zinc-400">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filters:</span>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={filters.websiteId}
            onChange={(e) => setFilters({ ...filters, websiteId: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Websites</option>
            {websites.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Types</option>
            <option value="blog">Blog</option>
            <option value="page">Page</option>
            <option value="landing">Landing</option>
          </select>

          {(filters.search || filters.websiteId || filters.status || filters.type) && (
            <button
              onClick={() =>
                setFilters({ search: '', websiteId: '', status: '', type: '' })
              }
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedContent.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-400">
              {selectedContent.length} items selected
            </span>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-red-400 hover:text-red-300 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}

        {/* Content Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedContent.length === content.length && content.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContent(content.map((c) => c._id));
                      } else {
                        setSelectedContent([]);
                      }
                    }}
                    className="rounded border-zinc-600"
                  />
                </th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3 text-right">Words</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading content...
                  </td>
                </tr>
              ) : content.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    No content found. Start by creating new content or using AI Generate.
                  </td>
                </tr>
              ) : (
                content.map((item) => (
                  <tr key={item._id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedContent.includes(item._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContent([...selectedContent, item._id]);
                          } else {
                            setSelectedContent(selectedContent.filter((id) => id !== item._id));
                          }
                        }}
                        className="rounded border-zinc-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        {item.isAiGenerated && (
                          <Sparkles className="h-3 w-3 text-purple-400" />
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">/{item.slug}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {item.websiteId?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.keywordId ? (
                        <span className="text-emerald-400">{item.keywordId.keyword}</span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatNumber(item.wordCount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/content/${item._id}`}
                          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {item.websiteId && (
                          <a
                            href={`https://${item.websiteId.domain}/blog/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700"
                            title="View"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* AI Generate Modal */}
      {showGenerateModal && (
        <AIGenerateModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            setShowGenerateModal(false);
            fetchContent();
          }}
          websites={websites}
        />
      )}
    </div>
  );
}

// AI Generate Modal
function AIGenerateModal({
  onClose,
  onSuccess,
  websites,
}: {
  onClose: () => void;
  onSuccess: () => void;
  websites: Website[];
}) {
  const [websiteId, setWebsiteId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [wordCount, setWordCount] = useState(1500);
  const [autoSave, setAutoSave] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    excerpt: string;
    content: string;
  } | null>(null);

  // Keyword suggestions
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState('');

  // Fetch unassigned keywords for selected website
  useEffect(() => {
    if (websiteId) {
      fetch(`/api/keywords?websiteId=${websiteId}&status=new&limit=20`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setKeywords(data.data);
          }
        });
    }
  }, [websiteId]);

  const handleGenerate = async () => {
    if (!websiteId) {
      alert('Please select a website');
      return;
    }

    if (!keyword && !topic && !selectedKeywordId) {
      alert('Please enter a keyword, topic, or select from suggestions');
      return;
    }

    setIsLoading(true);
    setGeneratedContent(null);

    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          keywordId: selectedKeywordId || undefined,
          keyword: keyword || undefined,
          topic: topic || undefined,
          tone,
          wordCount,
          autoSave,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedContent(data.data);
        if (autoSave) {
          onSuccess();
        }
      } else {
        alert(data.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('Failed to generate content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            AI Content Generator
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Website *
              </label>
              <select
                value={websiteId}
                onChange={(e) => setWebsiteId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select website</option>
                {websites.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.domain})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="friendly">Friendly</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>
          </div>

          {/* Keyword Selection */}
          {keywords.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Select from unassigned keywords:
              </label>
              <div className="flex flex-wrap gap-2">
                {keywords.slice(0, 10).map((kw) => (
                  <button
                    key={kw._id}
                    onClick={() => {
                      setSelectedKeywordId(kw._id);
                      setKeyword('');
                      setTopic('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      selectedKeywordId === kw._id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {kw.keyword}
                    <span className="text-xs ml-1 opacity-60">({formatNumber(kw.volume)})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-zinc-500 text-sm">— OR —</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Custom Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setSelectedKeywordId('');
                }}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., best SEO tools 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setSelectedKeywordId('');
                }}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., SEO optimization guide"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Target Word Count
              </label>
              <input
                type="number"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                min={500}
                max={5000}
                step={100}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                <span className="text-sm text-zinc-400">
                  Automatically save as draft
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !websiteId}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Content
              </>
            )}
          </button>

          {/* Generated Content Preview */}
          {generatedContent && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Generated Content</h3>

              <div className="bg-zinc-800 rounded-lg p-4">
                <h4 className="text-xl font-bold mb-2">{generatedContent.title}</h4>
                <p className="text-zinc-400 text-sm mb-4">{generatedContent.excerpt}</p>
                <div
                  className="prose prose-invert max-w-none text-sm max-h-64 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                />
              </div>

              {autoSave && (
                <p className="text-emerald-400 text-sm">
                  Content saved as draft!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

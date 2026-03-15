'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Sparkles,
  Search,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  FileEdit,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Globe,
  Eye,
  EyeOff,
  Inbox,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Website {
  _id: string;
  name: string;
  domain: string;
}

interface ContentItem {
  _id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'scheduled' | 'pending_review' | 'rejected';
  type: 'blog_post' | 'guest_post' | 'page' | 'landing_page';
  websiteId: { _id: string; name: string; domain: string } | null;
  authorName: string;
  categoryId: { _id: string; name: string } | null;
  wordCount: number;
  readingTime: number;
  isAiGenerated: boolean;
  featuredImage: string;
  publishedAt: string | null;
  createdAt: string;
  expiresAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Stats {
  totals: {
    totalContent: number;
    publishedCount: number;
    draftCount: number;
    scheduledCount: number;
    aiGeneratedCount: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return `${diffMonth}mo ago`;
}

function fullDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: 'Published', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  draft: { label: 'Draft', color: 'text-zinc-400', bg: 'bg-zinc-400/10 border-zinc-400/20' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  pending_review: { label: 'Pending Review', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
};

const TYPE_LABELS: Record<string, string> = {
  blog_post: 'Blog Post',
  guest_post: 'Guest Post',
  page: 'Page',
  landing_page: 'Landing Page',
};

const STATUS_TABS = ['all', 'published', 'draft', 'scheduled', 'pending_review'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PostsPage() {
  // Data
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [websiteFilter, setWebsiteFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  // UI
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch content
  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sortBy,
        sortOrder,
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (websiteFilter) params.set('websiteId', websiteFilter);
      if (searchDebounced) params.set('search', searchDebounced);

      const res = await fetch(`/api/content?${params.toString()}`);
      const data = await res.json();
      const items = data.content ?? data.data ?? [];
      setContent(items);
      if (data.pagination) setPagination(data.pagination);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, typeFilter, websiteFilter, searchDebounced, sortBy, sortOrder]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/content/stats');
      const data = await res.json();
      const statsData = data.data ?? data;
      if (statsData.totals) setStats(statsData);
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch websites
  const fetchWebsites = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/domains');
      const data = await res.json();
      if (data.domains) setWebsites(data.domains);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchWebsites();
  }, [fetchStats, fetchWebsites]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Reset page when filters change
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [statusFilter, typeFilter, websiteFilter, searchDebounced]);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === content.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(content.map((c) => c._id)));
    }
  };

  const allSelected = content.length > 0 && selectedIds.size === content.length;

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    const label = newStatus === 'published' ? 'publish' : 'unpublish';
    if (!confirm(`Are you sure you want to ${label} ${selectedIds.size} item(s)?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/content/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      setSelectedIds(new Set());
      fetchContent();
      fetchStats();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/content/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedIds(new Set());
      fetchContent();
      fetchStats();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/content/${id}`, { method: 'DELETE' });
      fetchContent();
      fetchStats();
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Pagination helpers
  // ---------------------------------------------------------------------------

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.pages) return;
    setPagination((p) => ({ ...p, page }));
    setSelectedIds(new Set());
  };

  const pageNumbers = (): number[] => {
    const { page, pages } = pagination;
    const nums: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, page + 2);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  };

  const showingFrom = (pagination.page - 1) * pagination.limit + 1;
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total);

  // ---------------------------------------------------------------------------
  // Stat counts for tabs
  // ---------------------------------------------------------------------------

  const tabCounts: Record<string, number | undefined> = {
    all: stats?.totals.totalContent,
    published: stats?.totals.publishedCount,
    draft: stats?.totals.draftCount,
    scheduled: stats?.totals.scheduledCount,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---- Header ---- */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Posts</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage all your content</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/posts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 border border-zinc-700"
            >
              <Plus className="h-4 w-4" />
              Write Post
            </Link>
            <Link
              href="/admin/posts/new?mode=ai"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </Link>
          </div>
        </motion.div>

        {/* ---- Stats Cards ---- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { label: 'Total Posts', value: stats?.totals.totalContent ?? 0, icon: FileText, color: 'text-zinc-300' },
            { label: 'Published', value: stats?.totals.publishedCount ?? 0, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Drafts', value: stats?.totals.draftCount ?? 0, icon: FileEdit, color: 'text-zinc-400' },
            { label: 'Scheduled', value: stats?.totals.scheduledCount ?? 0, icon: Clock, color: 'text-blue-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg bg-zinc-800 p-2 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">{s.label}</p>
                  <p className="mt-0.5 text-xl font-semibold text-white">{formatNumber(s.value)}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ---- Filters ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 space-y-4"
        >
          {/* Status tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab;
              const label = tab === 'all' ? 'All' : STATUS_CONFIG[tab]?.label ?? tab;
              const count = tabCounts[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                  {count !== undefined && (
                    <span className={`ml-1.5 text-xs ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Type / Website / Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-emerald-500 transition"
            >
              <option value="">All Types</option>
              <option value="blog_post">Blog Post</option>
              <option value="guest_post">Guest Post</option>
              <option value="page">Page</option>
              <option value="landing_page">Landing Page</option>
            </select>

            <select
              value={websiteFilter}
              onChange={(e) => setWebsiteFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-emerald-500 transition"
            >
              <option value="">All Websites</option>
              {websites.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>

            <div className="relative sm:ml-auto sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>
        </motion.div>

        {/* ---- Bulk Actions Bar ---- */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3">
                <span className="text-sm font-medium text-emerald-300">
                  {selectedIds.size} selected
                </span>
                <div className="h-4 w-px bg-zinc-700" />
                <button
                  onClick={() => handleBulkStatusChange('published')}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Publish
                </button>
                <button
                  onClick={() => handleBulkStatusChange('draft')}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-600 disabled:opacity-50"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Unpublish
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-600/30 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                {bulkLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-zinc-400" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Table ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Words</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-500" />
                      <p className="mt-2 text-sm text-zinc-500">Loading posts...</p>
                    </td>
                  </tr>
                ) : content.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="rounded-full bg-zinc-800 p-4">
                          <Inbox className="h-8 w-8 text-zinc-600" />
                        </div>
                        <p className="mt-4 text-base font-medium text-zinc-300">No posts found</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          Get started by creating your first post
                        </p>
                        <div className="mt-5 flex items-center gap-3">
                          <Link
                            href="/admin/posts/new"
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                          >
                            <Plus className="h-4 w-4" />
                            Create Post
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {content.map((item) => {
                      const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
                      const displayDate = item.publishedAt || item.createdAt;
                      const isSelected = selectedIds.has(item._id);

                      return (
                        <motion.tr
                          key={item._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`border-b border-zinc-800/50 transition ${
                            isSelected ? 'bg-emerald-950/10' : 'hover:bg-zinc-800/30'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item._id)}
                              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                            />
                          </td>

                          {/* Title */}
                          <td className="px-4 py-3 max-w-xs">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/posts/${item._id}`}
                                  className="block truncate font-medium text-zinc-100 hover:text-emerald-400 transition"
                                >
                                  {item.title}
                                </Link>
                                <p className="mt-0.5 truncate text-xs text-zinc-500">/{item.slug}</p>
                              </div>
                              {item.isAiGenerated && (
                                <span className="flex-shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400 border border-violet-500/20">
                                  AI
                                </span>
                              )}
                              {item.type === 'guest_post' && (
                                <span className="flex-shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                                  Guest
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Website */}
                          <td className="px-4 py-3">
                            {item.websiteId ? (
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-zinc-500" />
                                <span className="text-zinc-300 truncate max-w-[120px]">
                                  {item.websiteId.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                            >
                              {statusCfg.label}
                            </span>
                          </td>

                          {/* Author */}
                          <td className="px-4 py-3 text-zinc-300">
                            {item.authorName || '—'}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3 text-zinc-400">
                            {item.categoryId?.name || '—'}
                          </td>

                          {/* Word Count */}
                          <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">
                            {item.wordCount ? formatNumber(item.wordCount) : '—'}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3">
                            <span
                              className="text-zinc-400 cursor-default"
                              title={fullDate(displayDate)}
                            >
                              {relativeTime(displayDate)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/admin/posts/${item._id}`}
                                className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleDelete(item._id)}
                                disabled={deletingId === item._id}
                                className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* ---- Pagination ---- */}
          {pagination.pages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 sm:flex-row">
              <p className="text-xs text-zinc-500">
                Showing {showingFrom}–{showingTo} of {formatNumber(pagination.total)}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageNumbers().map((n) => (
                  <button
                    key={n}
                    onClick={() => goToPage(n)}
                    className={`min-w-[32px] rounded-md px-2 py-1 text-xs font-medium transition ${
                      n === pagination.page
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

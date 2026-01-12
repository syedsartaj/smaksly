'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import WebsiteSidebar from './components/WebsiteSidebar';
import BlogFilters from './components/BlogFilters';
import BlogTable, { BlogData } from './components/BlogTable';
import BlogFormModal from './components/BlogFormModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

interface Website {
  _id: string;
  name: string;
  domain: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface FilterState {
  search: string;
  status: string;
  categoryId: string;
  authorName: string;
  startDate: string;
  endDate: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: FilterState = {
  search: '',
  status: '',
  categoryId: '',
  authorName: '',
  startDate: '',
  endDate: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export default function PostManagement() {
  // Website state
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [websiteSearch, setWebsiteSearch] = useState('');
  const [websitesLoading, setWebsitesLoading] = useState(true);

  // Blog state
  const [blogs, setBlogs] = useState<BlogData[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [selectedBlogs, setSelectedBlogs] = useState<string[]>([]);

  // Filter & pagination state
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Category & author state
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editBlog, setEditBlog] = useState<(BlogData & { _id: string }) | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch websites
  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const res = await fetch('/api/websites?limit=100&status=active');
        const data = await res.json();
        if (data.success) {
          setWebsites(data.data);
          // Auto-select first website
          if (data.data.length > 0 && !selectedWebsiteId) {
            setSelectedWebsiteId(data.data[0]._id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch websites:', error);
      } finally {
        setWebsitesLoading(false);
      }
    };

    fetchWebsites();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch blogs when website or filters change
  const fetchBlogs = useCallback(async () => {
    if (!selectedWebsiteId) return;

    setBlogsLoading(true);
    try {
      const params = new URLSearchParams({
        websiteId: selectedWebsiteId,
        page: page.toString(),
        limit: limit.toString(),
        type: 'blog_post',
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.authorName) params.append('authorName', filters.authorName);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`/api/content?${params}`);
      const data = await res.json();

      if (data.success) {
        setBlogs(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);

        // Extract unique authors
        const uniqueAuthors = [...new Set(data.data.map((b: BlogData) => b.authorName).filter(Boolean))] as string[];
        setAuthors(uniqueAuthors);
      }
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
    } finally {
      setBlogsLoading(false);
    }
  }, [selectedWebsiteId, page, filters]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, selectedWebsiteId]);

  // Clear selected blogs when website changes
  useEffect(() => {
    setSelectedBlogs([]);
  }, [selectedWebsiteId]);

  // Handle create/edit blog
  const handleSubmitBlog = async (formData: Record<string, unknown>) => {
    const url = editBlog ? `/api/content/${editBlog._id}` : '/api/content';
    const method = editBlog ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        websiteId: selectedWebsiteId,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save blog');

    setShowCreateModal(false);
    setEditBlog(null);
    fetchBlogs();
  };

  // Handle delete blogs
  const handleDeleteBlogs = async () => {
    if (deleteIds.length === 0) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      setDeleteIds([]);
      setSelectedBlogs([]);
      fetchBlogs();
    } catch (error) {
      console.error('Failed to delete blogs:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit click
  const handleEditClick = async (id: string) => {
    try {
      const res = await fetch(`/api/content/${id}`);
      const data = await res.json();
      if (data.success) {
        const blogData = data.data;
        const categoryId = typeof blogData.categoryId === 'object' && blogData.categoryId
          ? blogData.categoryId._id
          : blogData.categoryId || '';
        setEditBlog({
          ...blogData,
          categoryId,
        });
        setShowCreateModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch blog for edit:', error);
    }
  };

  const selectedWebsite = websites.find((w) => w._id === selectedWebsiteId);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Left Sidebar - Website Selection */}
      <aside className="w-60 border-r border-zinc-800 flex-shrink-0">
        <WebsiteSidebar
          websites={websites}
          selectedId={selectedWebsiteId}
          searchQuery={websiteSearch}
          onSearchChange={setWebsiteSearch}
          onSelect={setSelectedWebsiteId}
          isLoading={websitesLoading}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-400" />
                Blog Management
              </h1>
              {selectedWebsite && (
                <p className="text-sm text-zinc-400 mt-1">
                  Managing blogs for <span className="text-emerald-400">{selectedWebsite.name}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedBlogs.length > 0 && (
                <button
                  onClick={() => setDeleteIds(selectedBlogs)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedBlogs.length})
                </button>
              )}
              <button
                onClick={() => {
                  setEditBlog(null);
                  setShowCreateModal(true);
                }}
                disabled={!selectedWebsiteId}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Add Post
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Total:</span>
              <span className="font-medium">{total} posts</span>
            </div>
            {selectedBlogs.length > 0 && (
              <div className="flex items-center gap-2 text-emerald-400">
                <span>{selectedBlogs.length} selected</span>
              </div>
            )}
          </div>
        </header>

        {/* Filters */}
        {selectedWebsiteId && (
          <BlogFilters
            filters={filters}
            onChange={setFilters}
            categories={categories}
            authors={authors}
          />
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {!selectedWebsiteId ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <FileText className="h-16 w-16 mb-4 text-zinc-700" />
              <p className="text-lg">Select a website to manage blogs</p>
            </div>
          ) : (
            <BlogTable
              data={blogs}
              selectedIds={selectedBlogs}
              onSelect={setSelectedBlogs}
              onEdit={handleEditClick}
              onDelete={(ids) => setDeleteIds(ids)}
              isLoading={blogsLoading}
            />
          )}
        </div>

        {/* Pagination */}
        {selectedWebsiteId && totalPages > 1 && (
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
              <span className="px-4 py-2 text-sm">
                Page {page} of {totalPages}
              </span>
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

      {/* Create/Edit Modal */}
      <BlogFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditBlog(null);
        }}
        onSubmit={handleSubmitBlog}
        editData={editBlog ? {
          ...editBlog,
          body: editBlog.body || '',
          excerpt: editBlog.excerpt || '',
          status: (['draft', 'published', 'scheduled'].includes(editBlog.status) ? editBlog.status : 'draft') as 'draft' | 'published' | 'scheduled',
          type: 'blog_post',
          authorName: editBlog.authorName || 'Admin',
          authorBio: (editBlog as { authorBio?: string }).authorBio || '',
          categoryId: typeof editBlog.categoryId === 'string' ? editBlog.categoryId : '',
          tags: editBlog.tags || [],
          featuredImage: editBlog.featuredImage || '',
          metaTitle: (editBlog as { metaTitle?: string }).metaTitle || '',
          metaDescription: (editBlog as { metaDescription?: string }).metaDescription || '',
          focusKeyword: (editBlog as { focusKeyword?: string }).focusKeyword || '',
          scheduledAt: (editBlog as { scheduledAt?: string }).scheduledAt || '',
        } : undefined}
        categories={categories}
        websiteId={selectedWebsiteId || ''}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteIds.length > 0}
        onClose={() => setDeleteIds([])}
        onConfirm={handleDeleteBlogs}
        count={deleteIds.length}
        isDeleting={isDeleting}
      />
    </div>
  );
}

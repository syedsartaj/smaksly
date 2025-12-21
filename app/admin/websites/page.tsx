'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Globe,
  TrendingUp,
  DollarSign,
  FileText,
} from 'lucide-react';
import { WebsitesTable, WebsiteTableData } from '@/components/tables/WebsitesTable';
import { AddWebsiteModal } from '@/components/websites/AddWebsiteModal';
import { formatNumber, formatPrice } from '@/lib/utils';

interface WebsiteStats {
  totals: {
    websites: number;
    active: number;
    pending: number;
    guestPostEnabled: number;
    totalTraffic: number;
  };
  averages: {
    avgDa: number;
    avgDr: number;
    avgTraffic: number;
    avgPrice: number;
  };
}

export default function WebsitesPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<WebsiteTableData[]>([]);
  const [stats, setStats] = useState<WebsiteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editWebsiteId, setEditWebsiteId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    niche: '',
    acceptsGuestPosts: '',
  });

  const fetchWebsites = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.niche && { niche: filters.niche }),
        ...(filters.acceptsGuestPosts && { acceptsGuestPosts: filters.acceptsGuestPosts }),
      });

      const res = await fetch(`/api/websites?${params}`);
      const data = await res.json();

      if (data.success) {
        setWebsites(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/websites/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
    fetchStats();
  }, [fetchWebsites, fetchStats]);

  const handleView = (id: string) => {
    router.push(`/websites/${id}`);
  };

  const handleEdit = (id: string) => {
    setEditWebsiteId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} website(s)?`)) {
      return;
    }

    try {
      const res = await fetch('/api/websites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();
      if (data.success) {
        fetchWebsites();
        fetchStats();
      } else {
        alert(data.error || 'Failed to delete websites');
      }
    } catch (error) {
      console.error('Failed to delete websites:', error);
      alert('Failed to delete websites');
    }
  };

  const handleBulkAction = async (action: string, ids: string[], data?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/websites/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids, data }),
      });

      const result = await res.json();
      if (result.success) {
        fetchWebsites();
        fetchStats();
      } else {
        alert(result.error || 'Failed to perform action');
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
      alert('Failed to perform action');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditWebsiteId(null);
  };

  const handleModalSuccess = () => {
    fetchWebsites();
    fetchStats();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Websites</h1>
              <p className="text-zinc-400 mt-1">
                Manage your network of {total} websites
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchWebsites}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Add Website
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Websites</p>
                  <p className="text-2xl font-bold">{stats.totals.websites}</p>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-green-400">{stats.totals.active} active</span>
                <span className="text-zinc-500"> · </span>
                <span className="text-yellow-400">{stats.totals.pending} pending</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Traffic</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.totalTraffic)}</p>
                </div>
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Avg: {formatNumber(Math.round(stats.averages.avgTraffic))}/site
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Guest Post Sites</p>
                  <p className="text-2xl font-bold">{stats.totals.guestPostEnabled}</p>
                </div>
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                {Math.round((stats.totals.guestPostEnabled / stats.totals.websites) * 100)}% of network
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Avg Price</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(Math.round(stats.averages.avgPrice))}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                DA: {Math.round(stats.averages.avgDa)} · DR: {Math.round(stats.averages.avgDr)}
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
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={filters.acceptsGuestPosts}
            onChange={(e) => setFilters({ ...filters, acceptsGuestPosts: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Guest Post Status</option>
            <option value="true">Accepts Guest Posts</option>
            <option value="false">No Guest Posts</option>
          </select>
          {(filters.status || filters.acceptsGuestPosts) && (
            <button
              onClick={() => setFilters({ status: '', niche: '', acceptsGuestPosts: '' })}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <WebsitesTable
          data={websites}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkAction={handleBulkAction}
          isLoading={isLoading}
        />

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

      {/* Add/Edit Modal */}
      <AddWebsiteModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editId={editWebsiteId || undefined}
      />
    </div>
  );
}

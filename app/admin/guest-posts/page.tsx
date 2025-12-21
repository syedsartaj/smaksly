'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Clock,
  Check,
  AlertTriangle,
  Eye,
  MessageSquare,
  DollarSign,
  Calendar,
  Users,
  X,
} from 'lucide-react';
import { formatNumber, formatPrice } from '@/lib/utils';
import Link from 'next/link';

interface GuestPostData {
  _id: string;
  status: string;
  title?: string;
  targetUrl: string;
  anchorText: string;
  isDoFollow: boolean;
  price: number;
  hasExpiry: boolean;
  expiresAt?: string;
  publishedUrl?: string;
  publishedAt?: string;
  createdAt: string;
  revisionCount: number;
  maxRevisions: number;
  websiteId?: { _id: string; name: string; domain: string; da: number };
  partnerId?: { _id: string; companyName: string; contactName: string; email: string };
  orderId?: { _id: string; orderNumber: string };
  messages?: Array<{ isRead: boolean; senderRole: string }>;
}

interface GuestPostStats {
  totals: {
    totalPosts: number;
    totalRevenue: number;
    publishedCount: number;
    pendingCount: number;
    expiringSoon: number;
    avgPrice: number;
  };
  statusDistribution: Record<string, { count: number; revenue: number }>;
  recentSubmissions: Array<{
    _id: string;
    title: string;
    status: string;
    contentSubmittedAt: string;
    websiteId?: { name: string };
    partnerId?: { companyName: string };
  }>;
}

interface Website {
  _id: string;
  name: string;
  domain: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_payment: { label: 'Pending Payment', color: 'bg-gray-500/20 text-gray-400', icon: <Clock className="h-3 w-3" /> },
  paid: { label: 'Paid', color: 'bg-blue-500/20 text-blue-400', icon: <DollarSign className="h-3 w-3" /> },
  content_pending: { label: 'Content Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="h-3 w-3" /> },
  content_submitted: { label: 'Submitted', color: 'bg-purple-500/20 text-purple-400', icon: <FileText className="h-3 w-3" /> },
  under_review: { label: 'Under Review', color: 'bg-orange-500/20 text-orange-400', icon: <Eye className="h-3 w-3" /> },
  revision_requested: { label: 'Revision Requested', color: 'bg-red-500/20 text-red-400', icon: <AlertTriangle className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400', icon: <Check className="h-3 w-3" /> },
  published: { label: 'Published', color: 'bg-green-500/20 text-green-400', icon: <Check className="h-3 w-3" /> },
  expired: { label: 'Expired', color: 'bg-gray-500/20 text-gray-400', icon: <Clock className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: <X className="h-3 w-3" /> },
  refunded: { label: 'Refunded', color: 'bg-gray-500/20 text-gray-400', icon: <DollarSign className="h-3 w-3" /> },
};

export default function GuestPostsPage() {
  const [guestPosts, setGuestPosts] = useState<GuestPostData[]>([]);
  const [stats, setStats] = useState<GuestPostStats | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    websiteId: '',
    status: '',
    expiringDays: '',
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal
  const [selectedPost, setSelectedPost] = useState<GuestPostData | null>(null);

  // Fetch guest posts
  const fetchGuestPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.websiteId && { websiteId: filters.websiteId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.expiringDays && { expiringDays: filters.expiringDays }),
      });

      const res = await fetch(`/api/guest-posts?${params}`);
      const data = await res.json();

      if (data.success) {
        setGuestPosts(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch guest posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  // Fetch stats and websites
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, websitesRes] = await Promise.all([
          fetch('/api/guest-posts/stats'),
          fetch('/api/websites?limit=100&acceptsGuestPosts=true'),
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
    fetchGuestPosts();
  }, [fetchGuestPosts]);

  const handleStatusChange = async (postId: string, newStatus: string, reason?: string) => {
    try {
      const res = await fetch(`/api/guest-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          statusReason: reason,
          reviewNotes: reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchGuestPosts();
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getUnreadCount = (post: GuestPostData) => {
    return (
      post.messages?.filter((m) => !m.isRead && m.senderRole === 'partner').length || 0
    );
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const days = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Guest Posts</h1>
              <p className="text-zinc-400 mt-1">
                Manage {total} guest post submissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchGuestPosts}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
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
                  <p className="text-sm text-zinc-400">Total Posts</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.totalPosts)}</p>
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
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Pending Review</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.pendingCount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Expiring Soon</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.expiringSoon)}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatPrice(stats.totals.totalRevenue * 100)}</p>
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
            <option value="pending">Pending Review</option>
            <option value="content_submitted">Content Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="revision_requested">Revision Requested</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="active">Active (Published, Not Expired)</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={filters.expiringDays}
            onChange={(e) => setFilters({ ...filters, expiringDays: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Expiring...</option>
            <option value="7">Within 7 days</option>
            <option value="14">Within 14 days</option>
            <option value="30">Within 30 days</option>
          </select>

          {(filters.websiteId || filters.status || filters.expiringDays) && (
            <button
              onClick={() => setFilters({ websiteId: '', status: '', expiringDays: '' })}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Guest Posts Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                <th className="px-4 py-3">Post</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading guest posts...
                  </td>
                </tr>
              ) : guestPosts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    No guest posts found.
                  </td>
                </tr>
              ) : (
                guestPosts.map((post) => {
                  const statusInfo = statusConfig[post.status] || {
                    label: post.status,
                    color: 'bg-zinc-800 text-zinc-400',
                    icon: null,
                  };
                  const unreadCount = getUnreadCount(post);

                  return (
                    <tr key={post._id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">
                            {post.title || post.anchorText}
                          </span>
                          {post.orderId && (
                            <span className="text-xs text-zinc-500 ml-2">
                              #{post.orderId.orderNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {post.websiteId ? (
                          <div>
                            <span className="font-medium">{post.websiteId.name}</span>
                            <span className="text-xs text-zinc-500 ml-2">
                              DA: {post.websiteId.da}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {post.partnerId?.companyName || post.partnerId?.contactName || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                        {post.revisionCount > 0 && (
                          <span className="text-xs text-zinc-500 ml-1">
                            ({post.revisionCount}/{post.maxRevisions})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              post.isDoFollow
                                ? 'bg-emerald-900/20 text-emerald-400'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {post.isDoFollow ? 'DoFollow' : 'NoFollow'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatPrice(post.price)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {post.hasExpiry && post.expiresAt ? (
                          <span
                            className={`${
                              getDaysUntilExpiry(post.expiresAt) <= 7
                                ? 'text-red-400'
                                : getDaysUntilExpiry(post.expiresAt) <= 30
                                ? 'text-yellow-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            {getDaysUntilExpiry(post.expiresAt)} days
                          </span>
                        ) : (
                          <span className="text-zinc-500">Permanent</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedPost(post)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="relative p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700"
                            title="Messages"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                                {unreadCount}
                              </span>
                            )}
                          </button>
                          {post.publishedUrl && (
                            <a
                              href={post.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-700"
                              title="View Published"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Detail Modal */}
      {selectedPost && (
        <GuestPostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

// Detail Modal Component
function GuestPostDetailModal({
  post,
  onClose,
  onStatusChange,
}: {
  post: GuestPostData;
  onClose: () => void;
  onStatusChange: (id: string, status: string, reason?: string) => void;
}) {
  const [reviewNotes, setReviewNotes] = useState('');

  const statusInfo = statusConfig[post.status] || {
    label: post.status,
    color: 'bg-zinc-800 text-zinc-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold">
              {post.title || post.anchorText}
            </h2>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Website</label>
                <p className="font-medium">
                  {post.websiteId?.name} ({post.websiteId?.domain})
                </p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Partner</label>
                <p className="font-medium">{post.partnerId?.companyName}</p>
                <p className="text-sm text-zinc-500">{post.partnerId?.email}</p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Target URL</label>
                <a
                  href={post.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 break-all"
                >
                  {post.targetUrl}
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Price</label>
                <p className="font-medium text-xl">{formatPrice(post.price)}</p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Anchor Text</label>
                <p className="font-medium">{post.anchorText}</p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Link Type</label>
                <span
                  className={`px-2 py-0.5 rounded text-sm ${
                    post.isDoFollow
                      ? 'bg-emerald-900/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {post.isDoFollow ? 'DoFollow' : 'NoFollow'}
                </span>
              </div>
              {post.hasExpiry && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Expiry</label>
                  <p className="font-medium">
                    {post.expiresAt
                      ? new Date(post.expiresAt).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Actions */}
          {['content_submitted', 'under_review'].includes(post.status) && (
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-medium mb-4">Review Actions</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">
                    Review Notes (optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes for the partner..."
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onStatusChange(post._id, 'approved')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      onStatusChange(post._id, 'revision_requested', reviewNotes)
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Request Revision
                  </button>
                  <button
                    onClick={() =>
                      onStatusChange(post._id, 'rejected', reviewNotes)
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Approved - Ready to Publish */}
          {post.status === 'approved' && (
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-medium mb-4">Publish</h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Published URL..."
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => onStatusChange(post._id, 'published')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Check className="h-4 w-4" />
                  Mark Published
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

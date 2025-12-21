'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface OrderStats {
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  spending: {
    total: number;
    average: number;
  };
  guestPosts: {
    total: number;
    pending: number;
    inReview: number;
    approved: number;
    published: number;
    live: number;
    rejected: number;
    revisionRequired: number;
    activeRate: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
  }>;
  monthlySpend: Array<{
    month: string;
    year: number;
    total: number;
    count: number;
  }>;
}

export default function PartnerDashboard() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/partner/orders/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    processing: 'text-blue-600 bg-blue-50',
    paid: 'text-green-600 bg-green-50',
    fulfilled: 'text-green-600 bg-green-50',
    cancelled: 'text-red-600 bg-red-50',
    refunded: 'text-gray-600 bg-gray-50',
  };

  const statusIcons: Record<string, typeof Clock> = {
    pending: Clock,
    processing: AlertCircle,
    paid: CheckCircle,
    fulfilled: CheckCircle,
    cancelled: XCircle,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s an overview of your activity.</p>
        </div>
        <Link
          href="/partner/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Marketplace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.orders.total || 0}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-yellow-600">{stats?.orders.pending || 0} pending</span>
            <span className="text-blue-600">{stats?.orders.processing || 0} processing</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.spending.total.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Avg. ${stats?.spending.average.toFixed(2) || 0} per order
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Guest Posts</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.guestPosts.total || 0}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-green-600">{stats?.guestPosts.live || 0} live</span>
            <span className="text-yellow-600">{stats?.guestPosts.pending || 0} pending</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.guestPosts.activeRate || 0}%
              </p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {stats?.guestPosts.published || 0} published posts
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href="/partner/orders"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => {
                const StatusIcon = statusIcons[order.status] || Clock;
                return (
                  <Link
                    key={order.id}
                    href={`/partner/orders/${order.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusColors[order.status]}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">${order.total}</p>
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No orders yet</p>
                <Link
                  href="/partner/marketplace"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Browse marketplace
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Guest Post Status */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Guest Post Status</h2>
            <Link
              href="/partner/guest-posts"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-sm text-gray-700">Pending Review</span>
              </div>
              <span className="font-medium">{stats?.guestPosts.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-sm text-gray-700">In Review</span>
              </div>
              <span className="font-medium">{stats?.guestPosts.inReview || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <span className="text-sm text-gray-700">Revision Required</span>
              </div>
              <span className="font-medium">{stats?.guestPosts.revisionRequired || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-sm text-gray-700">Approved</span>
              </div>
              <span className="font-medium">{stats?.guestPosts.approved || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700">Published / Live</span>
              </div>
              <span className="font-medium">
                {(stats?.guestPosts.published || 0) + (stats?.guestPosts.live || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-sm text-gray-700">Rejected</span>
              </div>
              <span className="font-medium">{stats?.guestPosts.rejected || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Spending Chart placeholder */}
      {stats?.monthlySpend && stats.monthlySpend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending</h2>
          <div className="flex items-end gap-2 h-40">
            {stats.monthlySpend.map((month, index) => {
              const maxSpend = Math.max(...stats.monthlySpend.map((m) => m.total));
              const height = maxSpend > 0 ? (month.total / maxSpend) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%`, minHeight: month.total > 0 ? '4px' : '0' }}
                  ></div>
                  <span className="text-xs text-gray-500">{month.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Filter,
  RefreshCw,
  ChevronDown,
  Eye,
  MoreHorizontal,
  Users,
  CreditCard,
} from 'lucide-react';

interface Commission {
  _id: string;
  partnerId: {
    _id: string;
    contactName: string;
    companyName?: string;
    contactEmail: string;
  };
  orderId?: {
    orderNumber: string;
  };
  websiteId?: {
    name: string;
    domain: string;
  };
  type: string;
  description: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  platformFee: number;
  status: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}

interface CommissionStats {
  overall: {
    totalCommissions: number;
    totalOrderAmount: number;
    totalCommissionAmount: number;
    totalPlatformFee: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
    averageCommissionRate: number;
  };
  pendingPayouts: Array<{
    partnerId: string;
    partnerName: string;
    pendingAmount: number;
    commissionCount: number;
  }>;
  topPartners: Array<{
    partnerId: string;
    partnerName: string;
    tier: string;
    totalEarnings: number;
    commissionCount: number;
  }>;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCommissions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (status) params.append('status', status);
      if (type) params.append('type', type);

      const res = await fetch(`/api/commissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCommissions(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
    }
  }, [page, status, type]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/commissions/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchCommissions(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchCommissions]);

  const handleAction = async (commissionId: string, action: string, reason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      if (res.ok) {
        await Promise.all([fetchCommissions(), fetchStats()]);
        setSelectedCommission(null);
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
    pending: { color: 'text-yellow-600 bg-yellow-50', icon: Clock },
    approved: { color: 'text-green-600 bg-green-50', icon: CheckCircle },
    paid: { color: 'text-blue-600 bg-blue-50', icon: DollarSign },
    cancelled: { color: 'text-red-600 bg-red-50', icon: XCircle },
    on_hold: { color: 'text-orange-600 bg-orange-50', icon: Pause },
  };

  const typeLabels: Record<string, string> = {
    guest_post_sale: 'Guest Post Sale',
    referral: 'Referral',
    bonus: 'Bonus',
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
          <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-500">Manage partner commissions and payouts</p>
        </div>
        <a
          href="/payouts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <CreditCard className="h-4 w-4" />
          Manage Payouts
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.overall.totalCommissionAmount.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Platform Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.overall.totalPlatformFee.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.overall.pendingAmount.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ready for Payout</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.overall.approvedAmount.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commissions List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => { fetchCommissions(); fetchStats(); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => { setType(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Types</option>
                    <option value="guest_post_sale">Guest Post Sale</option>
                    <option value="referral">Referral</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Commission List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.map((commission) => {
                    const statusInfo = statusConfig[commission.status] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <tr key={commission._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {commission.partnerId?.companyName || commission.partnerId?.contactName}
                            </p>
                            <p className="text-xs text-gray-500">{commission.partnerId?.contactEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">
                            {typeLabels[commission.type] || commission.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">${commission.commissionAmount}</p>
                            <p className="text-xs text-gray-500">{commission.commissionRate}% of ${commission.orderAmount}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {commission.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedCommission(commission)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {commission.status === 'pending' && (
                              <button
                                onClick={() => handleAction(commission._id, 'approve')}
                                disabled={actionLoading}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pending Payouts */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pending Payouts
            </h3>
            <div className="space-y-3">
              {stats?.pendingPayouts && stats.pendingPayouts.length > 0 ? (
                stats.pendingPayouts.slice(0, 5).map((payout) => (
                  <div key={payout.partnerId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{payout.partnerName}</p>
                      <p className="text-xs text-gray-500">{payout.commissionCount} commissions</p>
                    </div>
                    <span className="font-semibold text-green-600">${payout.pendingAmount}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No pending payouts</p>
              )}
            </div>
          </div>

          {/* Top Partners */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Partners
            </h3>
            <div className="space-y-3">
              {stats?.topPartners && stats.topPartners.length > 0 ? (
                stats.topPartners.slice(0, 5).map((partner, idx) => (
                  <div key={partner.partnerId} className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{partner.partnerName}</p>
                      <p className="text-xs text-gray-500 capitalize">{partner.tier}</p>
                    </div>
                    <span className="font-semibold text-gray-900">${partner.totalEarnings}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Commission Detail Modal */}
      {selectedCommission && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedCommission(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Commission Details</h2>
                <button onClick={() => setSelectedCommission(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Partner Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Partner</h3>
                  <p className="font-semibold text-gray-900">
                    {selectedCommission.partnerId?.companyName || selectedCommission.partnerId?.contactName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedCommission.partnerId?.contactEmail}</p>
                </div>

                {/* Amount Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Order Amount</h3>
                    <p className="text-xl font-bold text-gray-900">${selectedCommission.orderAmount}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Commission ({selectedCommission.commissionRate}%)</h3>
                    <p className="text-xl font-bold text-green-600">${selectedCommission.commissionAmount}</p>
                  </div>
                </div>

                {/* Platform Fee */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Platform Fee</h3>
                  <p className="text-lg font-semibold text-blue-600">${selectedCommission.platformFee}</p>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-700">{selectedCommission.description}</p>
                </div>

                {/* Website */}
                {selectedCommission.websiteId && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Website</h3>
                    <p className="text-gray-700">{selectedCommission.websiteId.name}</p>
                    <p className="text-sm text-gray-500">{selectedCommission.websiteId.domain}</p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedCommission.status]?.color}`}>
                    {selectedCommission.status}
                  </span>
                </div>

                {/* Actions */}
                {(selectedCommission.status === 'pending' || selectedCommission.status === 'on_hold') && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleAction(selectedCommission._id, 'approve')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    {selectedCommission.status === 'pending' && (
                      <button
                        onClick={() => handleAction(selectedCommission._id, 'hold', 'Manual hold')}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        Put on Hold
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(selectedCommission._id, 'cancel', 'Cancelled by admin')}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

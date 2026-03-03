'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderTree,
  Plus,
  Sparkles,
  RefreshCw,
  Search,
  Globe,
  TrendingUp,
  Target,
  ChevronRight,
  CheckCircle2,
  Clock,
  PenLine,
  BarChart3,
  ArrowLeft,
  Filter,
} from 'lucide-react';

interface KeywordGroup {
  _id: string;
  name: string;
  niche?: string;
  totalVolume: number;
  avgKD: number;
  keywordCount: number;
  priorityScore: number;
  status: 'ungrouped' | 'assigned' | 'in_progress' | 'published' | 'paused';
  websiteId?: { _id: string; name: string; domain: string };
  website?: { _id: string; name: string; domain: string };
  primaryKeyword?: { keyword: string; volume: number; kd: number };
  blogContent?: { title: string; status: string };
  lastClusteredAt?: string;
  createdAt: string;
}

interface Website { _id: string; name: string; domain: string; niche?: string }

const STATUS_STYLE: Record<string, string> = {
  ungrouped: 'bg-zinc-800 text-zinc-400',
  assigned: 'bg-blue-900/30 text-blue-400',
  in_progress: 'bg-yellow-900/30 text-yellow-400',
  published: 'bg-emerald-900/30 text-emerald-400',
  paused: 'bg-orange-900/30 text-orange-400',
};

export default function KeywordGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClustering, setIsClustering] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    status: '',
    websiteId: '',
    niche: '',
    search: '',
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningGroupId, setAssigningGroupId] = useState('');

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'priorityScore',
        ...(filters.status && { status: filters.status }),
        ...(filters.websiteId && { websiteId: filters.websiteId }),
        ...(filters.niche && { niche: filters.niche }),
      });
      const res = await fetch(`/api/keywords/groups?${params}`);
      const data = await res.json();
      if (data.success) {
        setGroups(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetch('/api/websites?limit=100&status=active')
      .then((r) => r.json())
      .then((d) => d.success && setWebsites(d.data));
  }, []);

  const handleRunAIClustering = async () => {
    // Fetch all unassigned master keywords for clustering
    setIsClustering(true);
    try {
      const res = await fetch('/api/keywords/master?limit=200');
      const data = await res.json();
      if (!data.success || !data.data.length) {
        alert('No keywords in master library to cluster. Import keywords first.');
        return;
      }
      const ids = data.data.map((k: { _id: string }) => k._id);
      const clusterRes = await fetch('/api/keywords/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cluster', keywordMasterIds: ids }),
      });
      const clusterData = await clusterRes.json();
      if (clusterData.success) {
        alert(`AI clustering complete: ${clusterData.data.groupIds.length} groups created/updated`);
        fetchGroups();
      } else {
        alert(clusterData.error || 'Clustering failed');
      }
    } catch (err) {
      console.error('Clustering error:', err);
      alert('Failed to run AI clustering');
    } finally {
      setIsClustering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="h-3 w-3" />;
      case 'in_progress': return <Clock className="h-3 w-3" />;
      case 'assigned': return <Globe className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/keywords')}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <FolderTree className="h-6 w-6 text-purple-400" />
                  Keyword Groups
                </h1>
                <p className="text-zinc-400 mt-1">
                  {total} groups · AI-clustered keyword topics for blog planning
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchGroups}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleRunAIClustering}
                disabled={isClustering}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-60"
              >
                {isClustering ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                AI Cluster Keywords
              </button>
              <button
                onClick={() => router.push('/admin/keywords/history')}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
              >
                <BarChart3 className="h-4 w-4" />
                History
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Groups', value: total, icon: FolderTree, color: 'purple' },
            {
              label: 'Unassigned',
              value: groups.filter((g) => g.status === 'ungrouped').length,
              icon: Target,
              color: 'zinc',
            },
            {
              label: 'Assigned',
              value: groups.filter((g) => g.status === 'assigned').length,
              icon: Globe,
              color: 'blue',
            },
            {
              label: 'Published',
              value: groups.filter((g) => g.status === 'published').length,
              icon: CheckCircle2,
              color: 'emerald',
            },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${s.color}-500/20 rounded-lg`}>
                  <s.icon className={`h-5 w-5 text-${s.color}-400`} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-zinc-400">
            <Filter className="h-4 w-4" />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="ungrouped">Ungrouped</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="published">Published</option>
          </select>
          <select
            value={filters.websiteId}
            onChange={(e) => setFilters({ ...filters, websiteId: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Websites</option>
            {websites.map((w) => (
              <option key={w._id} value={w._id}>{w.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by niche..."
            value={filters.niche}
            onChange={(e) => setFilters({ ...filters, niche: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Groups Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                <th className="px-4 py-3">Group Name</th>
                <th className="px-4 py-3 text-right">Keywords</th>
                <th className="px-4 py-3 text-right">Volume</th>
                <th className="px-4 py-3 text-right">Avg KD</th>
                <th className="px-4 py-3 text-right">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading groups...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-zinc-400">
                    <FolderTree className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
                    <p className="text-lg font-medium">No keyword groups yet</p>
                    <p className="text-sm mt-1">
                      Run AI clustering to automatically group your keywords into blog topics.
                    </p>
                    <button
                      onClick={handleRunAIClustering}
                      className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white"
                    >
                      Run AI Clustering
                    </button>
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr
                    key={group._id}
                    className="border-t border-zinc-800 hover:bg-zinc-800/40 cursor-pointer"
                    onClick={() => router.push(`/admin/keywords/groups/${group._id}`)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{group.name}</span>
                        {group.niche && (
                          <span className="ml-2 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                            {group.niche}
                          </span>
                        )}
                        {group.primaryKeyword && (
                          <div className="text-xs text-zinc-500 mt-0.5">
                            Primary: {group.primaryKeyword.keyword}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {group.keywordCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {group.totalVolume.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${
                        group.avgKD <= 30 ? 'text-emerald-400' :
                        group.avgKD <= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {group.avgKD}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-zinc-500" />
                        <span className="text-sm font-mono">{group.priorityScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[group.status]}`}>
                        {getStatusIcon(group.status)}
                        {group.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {group.website?.name || group.websiteId ? (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {(group.website || group.websiteId as unknown as { name: string })?.name}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningGroupId(group._id);
                            setShowAssignModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          + Assign Website
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/keywords/groups/${group._id}`); }}
                        className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300"
                      >
                        <PenLine className="h-3 w-3" />
                        View
                        <ChevronRight className="h-3 w-3" />
                      </button>
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
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-zinc-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignWebsiteModal
          groupId={assigningGroupId}
          websites={websites}
          onClose={() => { setShowAssignModal(false); setAssigningGroupId(''); }}
          onSuccess={() => { setShowAssignModal(false); setAssigningGroupId(''); fetchGroups(); }}
        />
      )}
    </div>
  );
}

function AssignWebsiteModal({
  groupId, websites, onClose, onSuccess,
}: {
  groupId: string;
  websites: Website[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [websiteId, setWebsiteId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    if (!websiteId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/keywords/groups/${groupId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || 'Failed to assign');
      }
    } catch {
      alert('Failed to assign group to website');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-400" />
          Assign Group to Website
        </h2>
        <select
          value={websiteId}
          onChange={(e) => setWebsiteId(e.target.value)}
          className="w-full px-4 py-2 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a website...</option>
          {websites.map((w) => (
            <option key={w._id} value={w._id}>{w.name} ({w.domain})</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!websiteId || isAssigning}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAssigning ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

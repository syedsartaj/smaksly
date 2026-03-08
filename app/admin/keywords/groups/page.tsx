'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderTree,
  Sparkles,
  RefreshCw,
  Globe,
  TrendingUp,
  Target,
  ChevronRight,
  CheckCircle2,
  Clock,
  PenLine,
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
  createdAt: string;
}

interface Website { _id: string; name: string; domain: string }

const STATUS_STYLE: Record<string, string> = {
  ungrouped: 'bg-zinc-800 text-zinc-400',
  assigned: 'bg-blue-900/30 text-blue-400',
  in_progress: 'bg-yellow-900/30 text-yellow-400',
  published: 'bg-emerald-900/30 text-emerald-400',
  paused: 'bg-orange-900/30 text-orange-400',
};

const STATUS_LABEL: Record<string, string> = {
  ungrouped: 'Ungrouped',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  published: 'Published',
  paused: 'Paused',
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

  const [filters, setFilters] = useState({ status: '', websiteId: '', niche: '' });
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
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    fetch('/api/websites?limit=100&status=active')
      .then((r) => r.json())
      .then((d) => d.success && setWebsites(d.data));
  }, []);

  const handleRunAIClustering = async () => {
    setIsClustering(true);
    try {
      const res = await fetch('/api/keywords/master?limit=200');
      const data = await res.json();
      if (!data.success || !data.data.length) {
        alert('No keywords in master library. Add keywords first via Research page.');
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
        alert(`Created ${clusterData.data.groupIds.length} groups`);
        fetchGroups();
      } else {
        alert(clusterData.error || 'Clustering failed');
      }
    } catch {
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

  // Counts per status
  const statusCounts = {
    total,
    ungrouped: groups.filter((g) => g.status === 'ungrouped').length,
    assigned: groups.filter((g) => g.status === 'assigned').length,
    published: groups.filter((g) => g.status === 'published').length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderTree className="h-6 w-6 text-purple-400" />
                Keyword Groups
              </h1>
              <p className="text-zinc-400 mt-1">
                {total} groups — AI-clustered keyword topics for blog planning
              </p>
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
                {isClustering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI Cluster Keywords
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Groups', value: statusCounts.total, icon: FolderTree, bg: 'bg-purple-500/20', text: 'text-purple-400' },
            { label: 'Ungrouped', value: statusCounts.ungrouped, icon: Target, bg: 'bg-zinc-700/30', text: 'text-zinc-400', desc: 'Need assignment' },
            { label: 'Assigned', value: statusCounts.assigned, icon: Globe, bg: 'bg-blue-500/20', text: 'text-blue-400', desc: 'Ready for content' },
            { label: 'Published', value: statusCounts.published, icon: CheckCircle2, bg: 'bg-emerald-500/20', text: 'text-emerald-400', desc: 'Blog live' },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${s.bg} rounded-lg`}>
                  <s.icon className={`h-5 w-5 ${s.text}`} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                  {s.desc && <p className="text-xs text-zinc-600">{s.desc}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
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
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">All Websites</option>
            {websites.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
          <input
            type="text" placeholder="Filter by niche..."
            value={filters.niche}
            onChange={(e) => setFilters({ ...filters, niche: e.target.value })}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          />
        </div>

        {/* Groups Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-xs text-zinc-400 uppercase tracking-wider">
                <th className="px-5 py-3">Group Name</th>
                <th className="px-5 py-3 text-right">Keywords</th>
                <th className="px-5 py-3 text-right">Volume</th>
                <th className="px-5 py-3 text-right">Avg KD</th>
                <th className="px-5 py-3 text-right">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-zinc-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading groups...</p>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-zinc-500">
                    <FolderTree className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                    <p className="text-lg font-medium">No keyword groups yet</p>
                    <p className="text-sm mt-1 mb-4">AI will automatically group your keywords into blog topics</p>
                    <button
                      onClick={handleRunAIClustering}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm"
                    >
                      Run AI Clustering
                    </button>
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr
                    key={group._id}
                    className="border-t border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/keywords/groups/${group._id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="font-medium">{group.name}</span>
                        {group.niche && (
                          <span className="ml-2 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{group.niche}</span>
                        )}
                        {group.primaryKeyword && (
                          <p className="text-xs text-zinc-500 mt-0.5">Primary: {group.primaryKeyword.keyword}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm">{group.keywordCount}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm">{group.totalVolume.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-sm font-medium ${
                        group.avgKD <= 30 ? 'text-emerald-400' : group.avgKD <= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{group.avgKD}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-mono flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-zinc-500" /> {group.priorityScore}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[group.status]}`}>
                        {getStatusIcon(group.status)}
                        {STATUS_LABEL[group.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-400">
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
                          + Assign
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/keywords/groups/${group._id}`); }}
                        className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300"
                      >
                        <PenLine className="h-3 w-3" /> View <ChevronRight className="h-3 w-3" />
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
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50">Previous</button>
            <span className="text-zinc-400 text-sm">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50">Next</button>
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
}: { groupId: string; websites: Website[]; onClose: () => void; onSuccess: () => void }) {
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
      if (data.success) onSuccess();
      else alert(data.error || 'Failed to assign');
    } catch { alert('Failed to assign'); }
    finally { setIsAssigning(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-400" /> Assign to Website
        </h2>
        <select value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}
          className="w-full px-4 py-2 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
          <option value="">Select a website...</option>
          {websites.map((w) => <option key={w._id} value={w._id}>{w.name} ({w.domain})</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300">Cancel</button>
          <button onClick={handleAssign} disabled={!websiteId || isAssigning}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {isAssigning && <RefreshCw className="h-4 w-4 animate-spin" />} Assign
          </button>
        </div>
      </div>
    </div>
  );
}

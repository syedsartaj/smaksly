'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Sparkles,
  FolderTree,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  DollarSign,
  Download,
  Upload,
  Trash2,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Database,
  ArrowRight,
  BarChart3,
  Hash,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface KeywordMaster {
  _id: string;
  keyword: string;
  country: string;
  volume: number;
  kd: number;
  cpc: number;
  trend: 'rising' | 'stable' | 'declining';
  provider: string;
  lastRefreshedAt: string;
}

interface KeywordStats {
  totals: {
    totalKeywords: number;
    totalVolume: number;
    avgDifficulty: number;
    avgCpc: number;
    clusteredCount: number;
    assignedCount: number;
  };
}

interface Website {
  _id: string;
  name: string;
  domain: string;
}

const TREND_ICON = {
  rising: <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />,
  stable: <Minus className="h-3.5 w-3.5 text-zinc-400" />,
  declining: <TrendingDown className="h-3.5 w-3.5 text-red-400" />,
};

const KD_COLOR = (kd: number) =>
  kd <= 20 ? 'text-emerald-400 bg-emerald-900/20' :
  kd <= 50 ? 'text-yellow-400 bg-yellow-900/20' :
  kd <= 70 ? 'text-orange-400 bg-orange-900/20' :
  'text-red-400 bg-red-900/20';

export default function KeywordResearchPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'library' | 'website'>('library');
  const [masterKeywords, setMasterKeywords] = useState<KeywordMaster[]>([]);
  const [stats, setStats] = useState<KeywordStats | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Master library filters
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [trend, setTrend] = useState('');
  const [minVolume, setMinVolume] = useState('');
  const [maxKD, setMaxKD] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showResearchModal, setShowResearchModal] = useState(false);

  // Fetch master keywords
  const fetchMaster = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sortBy,
        ...(q && { q }),
        ...(country && { country }),
        ...(trend && { trend }),
        ...(minVolume && { minVolume }),
        ...(maxKD && { maxKD }),
      });
      const res = await fetch(`/api/keywords/master?${params}`);
      const data = await res.json();
      if (data.success) {
        setMasterKeywords(data.data);
        setTotalPages(data.pagination.pages);
        setTotalCount(data.pagination.total);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, q, country, trend, minVolume, maxKD, sortBy]);

  useEffect(() => {
    fetchMaster();
  }, [fetchMaster]);

  useEffect(() => {
    Promise.all([
      fetch('/api/keywords/stats').then((r) => r.json()),
      fetch('/api/websites?limit=100').then((r) => r.json()),
    ]).then(([statsData, websitesData]) => {
      if (statsData.success) setStats(statsData.data);
      if (websitesData.success) setWebsites(websitesData.data);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this keyword? This cannot be undone.')) return;
    await fetch(`/api/keywords/master?id=${id}`, { method: 'DELETE' });
    fetchMaster();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} keywords?`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/keywords/master?id=${id}`, { method: 'DELETE' });
    }
    setSelectedIds([]);
    fetchMaster();
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === masterKeywords.length ? [] : masterKeywords.map((k) => k._id));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Search className="h-6 w-6 text-emerald-400" />
                Keyword Research
              </h1>
              <p className="text-zinc-400 mt-1">
                {totalCount.toLocaleString()} keywords in your master library
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchMaster}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowResearchModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                <Sparkles className="h-4 w-4" />
                AI Research
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Quick Navigation */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/admin/keywords/groups')}
            className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 rounded-xl text-left transition-all group"
          >
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <FolderTree className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Keyword Groups</p>
              <p className="text-xs text-zinc-500 mt-0.5">AI-clustered topics for blog planning</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-purple-400" />
          </button>

          <button
            onClick={() => router.push('/admin/keywords/rankings')}
            className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl text-left transition-all group"
          >
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Rankings</p>
              <p className="text-xs text-zinc-500 mt-0.5">Daily keyword ranking trends from GSC</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-blue-400" />
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Database className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Keywords</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.totalKeywords)}</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Volume</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.totalVolume)}</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Target className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Avg Difficulty</p>
                  <p className="text-2xl font-bold">{stats.totals.avgDifficulty.toFixed(0)}</p>
                  <p className="text-xs text-zinc-600">Lower is easier to rank</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <FolderTree className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Clustered</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.clusteredCount)}</p>
                  <p className="text-xs text-zinc-600">Grouped into blog topics</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">All Countries</option>
            <option value="US">US</option>
            <option value="GB">GB</option>
            <option value="AE">AE</option>
            <option value="CA">CA</option>
            <option value="AU">AU</option>
          </select>
          <select
            value={trend}
            onChange={(e) => { setTrend(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">All Trends</option>
            <option value="rising">Rising</option>
            <option value="stable">Stable</option>
            <option value="declining">Declining</option>
          </select>
          <input
            type="number"
            value={minVolume}
            onChange={(e) => { setMinVolume(e.target.value); setPage(1); }}
            placeholder="Min volume"
            className="w-28 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          />
          <input
            type="number"
            value={maxKD}
            onChange={(e) => { setMaxKD(e.target.value); setPage(1); }}
            placeholder="Max KD"
            className="w-24 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          />
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="volume">Sort: Volume</option>
            <option value="kd">Sort: Difficulty</option>
            <option value="keyword">Sort: Keyword</option>
            <option value="updatedAt">Sort: Updated</option>
          </select>
          {(q || country || trend || minVolume || maxKD) && (
            <button
              onClick={() => { setQ(''); setCountry(''); setTrend(''); setMinVolume(''); setMaxKD(''); setPage(1); }}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-400">{selectedIds.length} selected</span>
            <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 text-red-400 hover:text-red-300 text-sm">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        )}

        {/* Master Library Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-left text-xs uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === masterKeywords.length && masterKeywords.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-600"
                  />
                </th>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3 text-right">Volume</th>
                <th className="px-4 py-3 text-right">KD</th>
                <th className="px-4 py-3 text-right">CPC</th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-zinc-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading keywords...</p>
                  </td>
                </tr>
              ) : masterKeywords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-zinc-500">
                    <Database className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                    <p className="text-lg font-medium">No keywords yet</p>
                    <p className="text-sm mt-1 mb-4">Use AI Research to discover keywords for your niche</p>
                    <button
                      onClick={() => setShowResearchModal(true)}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm"
                    >
                      Start AI Research
                    </button>
                  </td>
                </tr>
              ) : (
                masterKeywords.map((kw) => (
                  <tr key={kw._id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(kw._id)}
                        onChange={() => toggleSelect(kw._id)}
                        className="rounded border-zinc-600"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 text-xs font-mono">{kw.country}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{kw.volume.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${KD_COLOR(kw.kd)}`}>
                        {kw.kd}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">${kw.cpc.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {TREND_ICON[kw.trend]}
                        <span className="text-xs text-zinc-400 capitalize">{kw.trend}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400 text-xs">{kw.provider}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(kw._id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, totalCount)} of {totalCount.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 bg-zinc-800 rounded-lg">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Research Modal */}
      {showResearchModal && (
        <KeywordResearchModal
          onClose={() => setShowResearchModal(false)}
          onSuccess={() => { setShowResearchModal(false); fetchMaster(); }}
          websites={websites}
        />
      )}
    </div>
  );
}

// AI Research Modal
function KeywordResearchModal({
  onClose, onSuccess, websites,
}: { onClose: () => void; onSuccess: () => void; websites: Website[] }) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [niche, setNiche] = useState('');
  const [websiteId, setWebsiteId] = useState('');
  const [count, setCount] = useState(50);
  const [intent, setIntent] = useState('all');
  const [autoSave, setAutoSave] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{
    keyword: string; volume: number; difficulty: number; cpc: number; intent: string; topic: string;
  }> | null>(null);

  const handleResearch = async () => {
    if (!seedKeyword && !niche) { alert('Enter a seed keyword or niche'); return; }
    setIsLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/keywords/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedKeyword, niche, websiteId: websiteId || undefined, count, intent, autoSave }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        if (autoSave) onSuccess();
      } else {
        alert(data.error || 'Failed to generate keywords');
      }
    } catch { alert('Failed to generate keywords'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 z-10">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            AI Keyword Research
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Seed Keyword</label>
              <input
                type="text" value={seedKeyword} onChange={(e) => setSeedKeyword(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., digital marketing"
              />
              <p className="text-xs text-zinc-600 mt-1">The main topic to research</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Niche / Industry</label>
              <input
                type="text" value={niche} onChange={(e) => setNiche(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., SaaS, E-commerce"
              />
              <p className="text-xs text-zinc-600 mt-1">Helps AI find more relevant keywords</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Assign to Website</label>
              <select value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
                <option value="">Don&apos;t assign</option>
                {websites.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">How Many</label>
              <input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value))} min={10} max={100}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Intent</label>
              <select value={intent} onChange={(e) => setIntent(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
                <option value="all">All Intents</option>
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="autoSave" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="rounded border-zinc-600" />
            <label htmlFor="autoSave" className="text-sm text-zinc-400">Auto-save keywords to library</label>
          </div>

          <button onClick={handleResearch} disabled={isLoading || (!seedKeyword && !niche)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
            {isLoading ? <><RefreshCw className="h-5 w-5 animate-spin" /> Generating...</> : <><Sparkles className="h-5 w-5" /> Generate Keywords</>}
          </button>

          {results && (
            <div>
              <h3 className="text-lg font-medium mb-3">Generated {results.length} Keywords</h3>
              <div className="max-h-64 overflow-y-auto bg-zinc-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Keyword</th>
                      <th className="px-3 py-2 text-right">Volume</th>
                      <th className="px-3 py-2 text-right">Difficulty</th>
                      <th className="px-3 py-2">Intent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((kw, i) => (
                      <tr key={i} className="border-t border-zinc-700">
                        <td className="px-3 py-2">{kw.keyword}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(kw.volume)}</td>
                        <td className="px-3 py-2 text-right">{kw.difficulty}</td>
                        <td className="px-3 py-2 capitalize">{kw.intent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

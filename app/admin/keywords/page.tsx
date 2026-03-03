'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  FolderTree,
  TrendingUp,
  Target,
  DollarSign,
  Filter,
  Download,
  Upload,
  Trash2,
  ChevronDown,
  ArrowUpDown,
  MoreHorizontal,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface KeywordData {
  _id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: string;
  status: string;
  priority: string;
  topic?: string;
  clusterId?: string;
  clusterName?: string;
  websiteId?: { _id: string; name: string; domain: string };
  categoryId?: { _id: string; name: string };
  createdAt: string;
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
  intentDistribution: Array<{ _id: string; count: number; totalVolume: number }>;
  difficultyDistribution: Array<{ label: string; count: number; totalVolume: number }>;
  topKeywords: Array<{ keyword: string; volume: number; difficulty: number }>;
}

interface Website {
  _id: string;
  name: string;
  domain: string;
}

export default function KeywordsPage() {
  const [activeNav, setActiveNav] = useState<'keywords' | 'groups' | 'history' | 'master'>('keywords');

  // Nav redirect helper
  const handleNavChange = (tab: typeof activeNav) => {
    setActiveNav(tab);
    if (tab === 'groups') window.location.href = '/admin/keywords/groups';
    if (tab === 'history') window.location.href = '/admin/keywords/history';
    if (tab === 'master') window.location.href = '/admin/keywords/master';
  };

  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [stats, setStats] = useState<KeywordStats | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    websiteId: '',
    intent: '',
    difficulty: '',
    status: '',
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);

  // Fetch keywords
  const fetchKeywords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.search && { search: filters.search }),
        ...(filters.websiteId && { websiteId: filters.websiteId }),
        ...(filters.intent && { intent: filters.intent }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.status && { status: filters.status }),
      });

      const res = await fetch(`/api/keywords?${params}`);
      const data = await res.json();

      if (data.success) {
        setKeywords(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  // Fetch stats and websites
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, websitesRes] = await Promise.all([
          fetch('/api/keywords/stats'),
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
    fetchKeywords();
  }, [fetchKeywords]);

  const handleSelectAll = () => {
    if (selectedKeywords.length === keywords.length) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(keywords.map((k) => k._id));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedKeywords.length} keywords?`)) return;

    try {
      const res = await fetch('/api/keywords', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedKeywords }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedKeywords([]);
        fetchKeywords();
      }
    } catch (error) {
      console.error('Failed to delete keywords:', error);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return 'text-emerald-400 bg-emerald-900/20';
    if (difficulty <= 60) return 'text-yellow-400 bg-yellow-900/20';
    return 'text-red-400 bg-red-900/20';
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'informational':
        return 'bg-blue-900/20 text-blue-400';
      case 'commercial':
        return 'bg-purple-900/20 text-purple-400';
      case 'transactional':
        return 'bg-emerald-900/20 text-emerald-400';
      case 'navigational':
        return 'bg-orange-900/20 text-orange-400';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Sub-navigation */}
          <div className="flex items-center gap-1 mb-5">
            {[
              { key: 'keywords', label: 'Website Keywords' },
              { key: 'master', label: 'Master Library' },
              { key: 'groups', label: 'Keyword Groups' },
              { key: 'history', label: 'Ranking History' },
            ].map((nav) => (
              <button
                key={nav.key}
                onClick={() => handleNavChange(nav.key as typeof activeNav)}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  activeNav === nav.key
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Keyword Research</h1>
              <p className="text-zinc-400 mt-1">
                {total} keywords in your database
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchKeywords}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                onClick={() => setShowClusterModal(true)}
                disabled={selectedKeywords.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
              >
                <FolderTree className="h-4 w-4" />
                Cluster
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Search className="h-5 w-5 text-blue-400" />
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
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Avg CPC</p>
                  <p className="text-2xl font-bold">${stats.totals.avgCpc.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <FolderTree className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Clustered</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.totals.clusteredCount)}</p>
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
              placeholder="Search keywords..."
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
            value={filters.intent}
            onChange={(e) => setFilters({ ...filters, intent: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Intents</option>
            <option value="informational">Informational</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
            <option value="navigational">Navigational</option>
          </select>

          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Difficulty</option>
            <option value="easy">Easy (0-30)</option>
            <option value="medium">Medium (30-60)</option>
            <option value="hard">Hard (60+)</option>
          </select>

          {(filters.search || filters.websiteId || filters.intent || filters.difficulty) && (
            <button
              onClick={() =>
                setFilters({ search: '', websiteId: '', intent: '', difficulty: '', status: '' })
              }
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedKeywords.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-400">
              {selectedKeywords.length} keywords selected
            </span>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-red-400 hover:text-red-300 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={() => setShowClusterModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-purple-400 hover:text-purple-300 text-sm"
            >
              <FolderTree className="h-4 w-4" />
              Cluster Selected
            </button>
          </div>
        )}

        {/* Keywords Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.length === keywords.length && keywords.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-zinc-600"
                  />
                </th>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3 text-right">
                  <button className="flex items-center gap-1 ml-auto">
                    Volume <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Difficulty</th>
                <th className="px-4 py-3 text-right">CPC</th>
                <th className="px-4 py-3">Intent</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Cluster</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading keywords...
                  </td>
                </tr>
              ) : keywords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                    No keywords found. Start by running AI Research.
                  </td>
                </tr>
              ) : (
                keywords.map((keyword) => (
                  <tr key={keyword._id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedKeywords.includes(keyword._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedKeywords([...selectedKeywords, keyword._id]);
                          } else {
                            setSelectedKeywords(selectedKeywords.filter((id) => id !== keyword._id));
                          }
                        }}
                        className="rounded border-zinc-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{keyword.keyword}</span>
                        {keyword.topic && (
                          <span className="text-xs text-zinc-500 ml-2">({keyword.topic})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatNumber(keyword.volume)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(
                          keyword.difficulty
                        )}`}
                      >
                        {keyword.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ${(keyword.cpc / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${getIntentColor(
                          keyword.intent
                        )}`}
                      >
                        {keyword.intent}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {keyword.websiteId?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {keyword.clusterName || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700">
                        <MoreHorizontal className="h-4 w-4" />
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

      {/* AI Research Modal */}
      {showResearchModal && (
        <KeywordResearchModal
          onClose={() => setShowResearchModal(false)}
          onSuccess={() => {
            setShowResearchModal(false);
            fetchKeywords();
          }}
          websites={websites}
        />
      )}

      {/* Cluster Modal */}
      {showClusterModal && (
        <ClusterModal
          keywordIds={selectedKeywords}
          onClose={() => setShowClusterModal(false)}
          onSuccess={() => {
            setShowClusterModal(false);
            setSelectedKeywords([]);
            fetchKeywords();
          }}
        />
      )}
    </div>
  );
}

// AI Research Modal
function KeywordResearchModal({
  onClose,
  onSuccess,
  websites,
}: {
  onClose: () => void;
  onSuccess: () => void;
  websites: Website[];
}) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [niche, setNiche] = useState('');
  const [websiteId, setWebsiteId] = useState('');
  const [count, setCount] = useState(50);
  const [intent, setIntent] = useState('all');
  const [autoSave, setAutoSave] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{
    keyword: string;
    volume: number;
    difficulty: number;
    cpc: number;
    intent: string;
    topic: string;
  }> | null>(null);

  const handleResearch = async () => {
    if (!seedKeyword && !niche) {
      alert('Please enter a seed keyword or niche');
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const res = await fetch('/api/keywords/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedKeyword,
          niche,
          websiteId: websiteId || undefined,
          count,
          intent,
          autoSave,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        if (autoSave) {
          onSuccess();
        }
      } else {
        alert(data.error || 'Failed to generate keywords');
      }
    } catch (error) {
      console.error('Failed to generate keywords:', error);
      alert('Failed to generate keywords');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            AI Keyword Research
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Seed Keyword
              </label>
              <input
                type="text"
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., digital marketing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Niche/Industry
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., SaaS, E-commerce"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Assign to Website
              </label>
              <select
                value={websiteId}
                onChange={(e) => setWebsiteId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Don&apos;t assign</option>
                {websites.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Number of Keywords
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                min={10}
                max={100}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Intent Filter
              </label>
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Intents</option>
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoSave"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="rounded border-zinc-600"
            />
            <label htmlFor="autoSave" className="text-sm text-zinc-400">
              Automatically save keywords to database
            </label>
          </div>

          <button
            onClick={handleResearch}
            disabled={isLoading || (!seedKeyword && !niche)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Generating Keywords...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Keywords
              </>
            )}
          </button>

          {results && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">
                Generated {results.length} Keywords
              </h3>
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

// Cluster Modal
function ClusterModal({
  keywordIds,
  onClose,
  onSuccess,
}: {
  keywordIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [results, setResults] = useState<Array<{
    clusterId: string;
    clusterName: string;
    keywords: string[];
    parentKeyword: string;
    intent: string;
    contentSuggestion: string;
  }> | null>(null);

  const handleCluster = async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/keywords/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordIds,
          autoUpdate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        if (autoUpdate) {
          onSuccess();
        }
      } else {
        alert(data.error || 'Failed to cluster keywords');
      }
    } catch (error) {
      console.error('Failed to cluster keywords:', error);
      alert('Failed to cluster keywords');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-purple-400" />
            Cluster Keywords
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-zinc-400">
            Clustering {keywordIds.length} selected keywords into topic groups using AI.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoUpdate"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
              className="rounded border-zinc-600"
            />
            <label htmlFor="autoUpdate" className="text-sm text-zinc-400">
              Automatically update keywords with cluster assignments
            </label>
          </div>

          <button
            onClick={handleCluster}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Clustering Keywords...
              </>
            ) : (
              <>
                <FolderTree className="h-5 w-5" />
                Start Clustering
              </>
            )}
          </button>

          {results && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">
                Created {results.length} Clusters
              </h3>
              {results.map((cluster, i) => (
                <div key={i} className="bg-zinc-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-emerald-400">{cluster.clusterName}</h4>
                    <span className="text-xs text-zinc-500 capitalize">{cluster.intent}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">
                    Primary: <span className="text-white">{cluster.parentKeyword}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mb-2">
                    Content: {cluster.contentSuggestion}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {cluster.keywords.map((kw, j) => (
                      <span
                        key={j}
                        className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

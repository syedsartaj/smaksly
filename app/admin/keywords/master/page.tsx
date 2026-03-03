'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Database, RefreshCw, Search, TrendingUp, TrendingDown,
  Minus, Upload, Trash2, Filter, ChevronDown,
} from 'lucide-react';

interface KeywordMaster {
  _id: string;
  keyword: string;
  country: string;
  region?: string;
  volume: number;
  kd: number;
  cpc: number;
  competition: number;
  trend: 'rising' | 'stable' | 'declining';
  provider: string;
  lastRefreshedAt: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const TREND_ICON = {
  rising: <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />,
  stable: <Minus className="h-3.5 w-3.5 text-zinc-400" />,
  declining: <TrendingDown className="h-3.5 w-3.5 text-red-400" />,
};

const KD_COLOR = (kd: number) =>
  kd <= 20 ? 'text-emerald-400' : kd <= 50 ? 'text-yellow-400' : kd <= 70 ? 'text-orange-400' : 'text-red-400';

export default function KeywordMasterPage() {
  const router = useRouter();
  const [keywords, setKeywords] = useState<KeywordMaster[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [trend, setTrend] = useState('');
  const [minVolume, setMinVolume] = useState('');
  const [maxKD, setMaxKD] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  const [page, setPage] = useState(1);

  const fetchKeywords = useCallback(async () => {
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
        setKeywords(data.data);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, q, country, trend, minVolume, maxKD, sortBy]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this keyword from the master library? This cannot be undone.')) return;
    await fetch(`/api/keywords/master?id=${id}`, { method: 'DELETE' });
    fetchKeywords();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === keywords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(keywords.map((k) => k._id));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Sub-nav */}
          <div className="flex items-center gap-1 mb-5">
            {[
              { key: 'keywords', label: 'Website Keywords', href: '/admin/keywords' },
              { key: 'master', label: 'Master Library', href: '/admin/keywords/master' },
              { key: 'groups', label: 'Keyword Groups', href: '/admin/keywords/groups' },
              { key: 'history', label: 'Ranking History', href: '/admin/keywords/history' },
            ].map((nav) => (
              <button
                key={nav.key}
                onClick={() => router.push(nav.href)}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  nav.key === 'master'
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
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="h-6 w-6 text-emerald-400" />
                Master Keyword Library
              </h1>
              <p className="text-zinc-400 mt-1">
                {pagination?.total.toLocaleString() ?? '—'} unique keywords globally deduplicated by keyword + country
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
              <button
                onClick={() => router.push('/admin/keywords/groups')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
              >
                Cluster Selected
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search keywords..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
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
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
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
            className="w-28 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
          />

          <input
            type="number"
            value={maxKD}
            onChange={(e) => { setMaxKD(e.target.value); setPage(1); }}
            placeholder="Max KD"
            min="0" max="100"
            className="w-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
          />

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="volume">Sort: Volume</option>
            <option value="kd">Sort: Difficulty</option>
            <option value="keyword">Sort: Keyword</option>
            <option value="updatedAt">Sort: Updated</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-left">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === keywords.length && keywords.length > 0}
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
                <th className="px-4 py-3">Refreshed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : keywords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-zinc-500">
                    <Database className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                    <p className="text-lg font-medium">No keywords in master library</p>
                    <p className="text-sm mt-1">Import keywords via the API or use the keyword research tool</p>
                  </td>
                </tr>
              ) : (
                keywords.map((kw) => (
                  <tr key={kw._id} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
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
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 text-xs font-mono">
                        {kw.country}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {kw.volume.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${KD_COLOR(kw.kd)}`}>
                      {kw.kd}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      ${kw.cpc.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {TREND_ICON[kw.trend]}
                        <span className="text-xs text-zinc-400 capitalize">{kw.trend}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400 text-xs">
                        {kw.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(kw.lastRefreshedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(kw._id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        title="Delete keyword"
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
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, pagination.total)} of {pagination.total.toLocaleString()} keywords
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 bg-zinc-800 rounded-lg">
                {page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

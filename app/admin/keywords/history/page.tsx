'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BarChart3, RefreshCw, TrendingUp, TrendingDown,
  Minus, Search, Calendar, Filter,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface RankingEntry {
  date: string; rank: number | null; rankChange: number | null;
  clicks: number; impressions: number; position: number;
}

interface LatestRanking {
  _id: string; keyword: string; latestRank: number | null;
  latestPosition: number; latestClicks: number; latestImpressions: number;
  latestDate: string; rankChange: number | null;
}

interface Website { _id: string; name: string; domain: string }

export default function KeywordHistoryPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('');
  const [rankings, setRankings] = useState<LatestRanking[]>([]);
  const [trendData, setTrendData] = useState<RankingEntry[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<LatestRanking | null>(null);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/websites?limit=100&status=active')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.length > 0) {
          setWebsites(d.data);
          setSelectedWebsiteId(d.data[0]._id);
        }
      });
  }, []);

  const fetchRankings = useCallback(async () => {
    if (!selectedWebsiteId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/seo/tracker/${selectedWebsiteId}/keywords?mode=latest`
      );
      const data = await res.json();
      if (data.success) setRankings(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWebsiteId]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const loadTrend = async (kw: LatestRanking) => {
    setSelectedKeyword(kw);
    setIsTrendLoading(true);
    try {
      const res = await fetch(
        `/api/seo/tracker/${selectedWebsiteId}/keywords?mode=trend&keywordMasterId=${kw._id}&days=${days}`
      );
      const data = await res.json();
      if (data.success) {
        setTrendData(
          data.data.map((d: RankingEntry) => ({
            ...d,
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          }))
        );
      }
    } finally {
      setIsTrendLoading(false);
    }
  };

  const filtered = rankings.filter((r) =>
    !search || r.keyword.toLowerCase().includes(search.toLowerCase())
  );

  const getRankBadge = (rank: number | null) => {
    if (rank === null) return <span className="text-zinc-500">—</span>;
    const color = rank <= 3 ? 'text-emerald-400' : rank <= 10 ? 'text-blue-400' : rank <= 20 ? 'text-yellow-400' : 'text-zinc-400';
    return <span className={`font-bold ${color}`}>#{rank}</span>;
  };

  const getRankChangeBadge = (change: number | null) => {
    if (change === null) return <span className="text-zinc-600"><Minus className="h-3 w-3" /></span>;
    if (change > 0) return <span className="flex items-center gap-0.5 text-emerald-400 text-xs"><TrendingUp className="h-3 w-3" />+{change}</span>;
    if (change < 0) return <span className="flex items-center gap-0.5 text-red-400 text-xs"><TrendingDown className="h-3 w-3" />{change}</span>;
    return <span className="text-zinc-500 text-xs"><Minus className="h-3 w-3" /></span>;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/keywords')} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                  Keyword History
                </h1>
                <p className="text-zinc-400 mt-1">Daily ranking history — append-only, never overwritten</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {websites.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
              <select
                value={days}
                onChange={(e) => { setDays(parseInt(e.target.value)); if (selectedKeyword) loadTrend(selectedKeyword); }}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
              </select>
              <button onClick={fetchRankings} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
        {/* Keywords Table */}
        <div className="col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search keywords..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="py-12 text-center text-zinc-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No ranked keywords yet. Rankings are synced daily from GSC.
                </div>
              ) : (
                filtered.map((kw) => (
                  <button
                    key={kw._id}
                    onClick={() => loadTrend(kw)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 border-b border-zinc-800/50 text-left transition-colors ${
                      selectedKeyword?._id === kw._id ? 'bg-zinc-800 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{kw.keyword}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {kw.latestClicks} clicks · {kw.latestImpressions} imp
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {getRankChangeBadge(kw.rankChange)}
                      {getRankBadge(kw.latestRank)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="col-span-2">
          {selectedKeyword ? (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold">{selectedKeyword.keyword}</h2>
                    <p className="text-zinc-400 text-sm">Ranking history · last {days} days</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-zinc-400">Current Rank</p>
                      <p className="text-xl font-bold">
                        {selectedKeyword.latestRank ? `#${selectedKeyword.latestRank}` : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-400">Change</p>
                      <div className="text-xl font-bold">{getRankChangeBadge(selectedKeyword.rankChange)}</div>
                    </div>
                  </div>
                </div>

                {isTrendLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} reversed domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                        formatter={(v: number) => [`#${v}`, 'Rank']}
                      />
                      <ReferenceLine y={10} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Top 10', fill: '#3b82f6', fontSize: 11 }} />
                      <ReferenceLine y={3} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Top 3', fill: '#10b981', fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="rank"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        dot={{ fill: '#a78bfa', r: 3 }}
                        connectNulls={false}
                        name="Rank"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
                    No trend data available for this period
                  </div>
                )}
              </div>

              {/* Clicks/Impressions Chart */}
              {trendData.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="font-medium mb-4 text-zinc-300">Clicks & Impressions</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      />
                      <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
                      <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Impressions" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-[400px] flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-lg">Select a keyword to view its ranking history</p>
                <p className="text-sm mt-1">Rankings are tracked daily from Google Search Console</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

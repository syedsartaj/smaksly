'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ChevronDown,
  Hash,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface RankingEntry {
  date: string;
  rank: number | null;
  rankChange: number | null;
  clicks: number;
  impressions: number;
  position: number;
}

interface LatestRanking {
  _id: string;
  keyword: string;
  latestRank: number | null;
  latestPosition: number;
  latestClicks: number;
  latestImpressions: number;
  latestDate: string;
  rankChange: number | null;
}

interface Website { _id: string; name: string; domain: string }

export default function KeywordRankingsPage() {
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
      const res = await fetch(`/api/seo/tracker/${selectedWebsiteId}/keywords?mode=latest`);
      const data = await res.json();
      if (data.success) setRankings(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWebsiteId]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

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

  const getRankColor = (rank: number | null) => {
    if (rank === null) return 'text-zinc-500';
    if (rank <= 3) return 'text-emerald-400';
    if (rank <= 10) return 'text-blue-400';
    if (rank <= 20) return 'text-yellow-400';
    return 'text-zinc-400';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-400" />
                Keyword Rankings
              </h1>
              <p className="text-zinc-400 mt-1">
                Daily ranking history tracked from Google Search Console
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                >
                  {websites.map((w) => (
                    <option key={w._id} value={w._id}>{w.name} ({w.domain})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
              <div className="flex bg-zinc-800 rounded-lg p-1">
                {[7, 30, 90, 180].map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDays(d); if (selectedKeyword) loadTrend(selectedKeyword); }}
                    className={`px-3 py-1 text-sm rounded-md ${days === d ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <button onClick={fetchRankings}
                className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
        {/* Keywords Sidebar */}
        <div className="col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search keywords..."
                  className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none"
                />
              </div>
              <p className="text-xs text-zinc-600 mt-2 px-1">{filtered.length} keywords tracked</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="py-16 text-center text-zinc-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading rankings...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-zinc-500">
                  <Hash className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
                  <p className="font-medium">No ranked keywords yet</p>
                  <p className="text-xs mt-1">Rankings sync daily from GSC</p>
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
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {kw.latestClicks} clicks · {kw.latestImpressions} impressions
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {kw.rankChange !== null && kw.rankChange !== 0 && (
                        <span className={`flex items-center gap-0.5 text-xs ${
                          kw.rankChange > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {kw.rankChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {kw.rankChange > 0 ? '+' : ''}{kw.rankChange}
                        </span>
                      )}
                      <span className={`font-bold text-sm ${getRankColor(kw.latestRank)}`}>
                        {kw.latestRank ? `#${kw.latestRank}` : '—'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="col-span-2 space-y-4">
          {selectedKeyword ? (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold">{selectedKeyword.keyword}</h2>
                    <p className="text-zinc-500 text-sm">Ranking history over {days} days</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Current Rank</p>
                      <p className={`text-2xl font-bold ${getRankColor(selectedKeyword.latestRank)}`}>
                        {selectedKeyword.latestRank ? `#${selectedKeyword.latestRank}` : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Change</p>
                      <div className="text-xl font-bold">
                        {selectedKeyword.rankChange !== null && selectedKeyword.rankChange !== 0 ? (
                          <span className={selectedKeyword.rankChange > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {selectedKeyword.rankChange > 0 ? '+' : ''}{selectedKeyword.rankChange}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Clicks</p>
                      <p className="text-xl font-bold">{selectedKeyword.latestClicks}</p>
                    </div>
                  </div>
                </div>

                {isTrendLoading ? (
                  <div className="h-56 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} reversed domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: 12 }}
                        formatter={(v: number) => [`#${v}`, 'Rank']}
                      />
                      <ReferenceLine y={10} stroke="#3b82f6" strokeDasharray="3 3"
                        label={{ value: 'Top 10', fill: '#3b82f6', fontSize: 11 }} />
                      <ReferenceLine y={3} stroke="#10b981" strokeDasharray="3 3"
                        label={{ value: 'Top 3', fill: '#10b981', fontSize: 11 }} />
                      <Line type="monotone" dataKey="rank" stroke="#a78bfa" strokeWidth={2.5}
                        dot={{ fill: '#a78bfa', r: 3 }} connectNulls={false} name="Rank" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-56 flex items-center justify-center text-zinc-500 text-sm">
                    No trend data available for this period
                  </div>
                )}
              </div>

              {/* Clicks & Impressions */}
              {trendData.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="font-medium mb-1">Clicks & Impressions</h3>
                  <p className="text-xs text-zinc-600 mb-4">How this keyword performs on Google</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: 12 }} />
                      <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
                      <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Impressions" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-[500px] flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <BarChart3 className="h-14 w-14 mx-auto mb-4 text-zinc-700" />
                <p className="text-lg font-medium">Select a keyword</p>
                <p className="text-sm mt-1">Click any keyword on the left to see its ranking history</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

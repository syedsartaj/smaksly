'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  MousePointer,
  Eye,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronDown,
  Search,
  ExternalLink,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  FileText,
  Globe,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { formatNumber } from '@/lib/utils';

interface Website {
  _id: string;
  name: string;
  domain: string;
  gscConnected?: boolean;
}

interface TrendPoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface KeywordData {
  id: number;
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageData {
  id: number;
  url: string;
  path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function DeltaIndicator({
  value,
  invert = false,
  suffix = '%',
}: {
  value: number | null;
  invert?: boolean;
  suffix?: string;
}) {
  if (value === null) return null;
  const positive = invert ? value < 0 : value > 0;
  const color = positive ? 'text-emerald-400' : value === 0 ? 'text-zinc-500' : 'text-red-400';
  const bgColor = positive ? 'bg-emerald-900/30' : value === 0 ? 'bg-zinc-800' : 'bg-red-900/30';
  const Icon = positive ? ArrowUpRight : value === 0 ? Minus : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${color} ${bgColor}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}{suffix}
    </span>
  );
}

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedWebsite = searchParams.get('website');

  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('');
  const [period, setPeriod] = useState(28);
  const [isLoading, setIsLoading] = useState(false);
  const [websitesLoaded, setWebsitesLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'pages'>('overview');

  // Data
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [totals, setTotals] = useState<{
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
  } | null>(null);
  const [comparison, setComparison] = useState<{
    clicksDelta: number | null;
    impressionsDelta: number | null;
    positionDelta: number | null;
  } | null>(null);
  const [keywordStats, setKeywordStats] = useState<{
    totalKeywords: number;
    top3Keywords: number;
    top10Keywords: number;
    top100Keywords: number;
    avgPosition: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/websites?limit=100&status=active')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const connectedSites = d.data.filter((w: Website) => w.gscConnected);
          setWebsites(connectedSites);
          if (preselectedWebsite && connectedSites.find((w: Website) => w._id === preselectedWebsite)) {
            setSelectedWebsiteId(preselectedWebsite);
          } else if (connectedSites.length > 0) {
            setSelectedWebsiteId(connectedSites[0]._id);
          }
        }
        setWebsitesLoaded(true);
      })
      .catch(() => setWebsitesLoaded(true));
  }, [preselectedWebsite]);

  const fetchData = useCallback(async () => {
    if (!selectedWebsiteId) return;
    setIsLoading(true);

    const periodStr = period <= 7 ? '7d' : period <= 28 ? '28d' : '3m';

    try {
      const [trendRes, metricsRes, kwRes, pagesRes] = await Promise.all([
        fetch(`/api/seo/tracker/${selectedWebsiteId}/trends?days=${period}&compare=true`),
        fetch(`/api/seo/metrics?websiteId=${selectedWebsiteId}&period=${periodStr}&dimension=date`),
        fetch(`/api/seo/keywords?websiteId=${selectedWebsiteId}&period=${periodStr}&limit=50`),
        fetch(`/api/seo/pages?websiteId=${selectedWebsiteId}&period=${periodStr}&limit=20`),
      ]);

      const [trendData, metricsData, kwData, pagesData] = await Promise.all([
        trendRes.json(),
        metricsRes.json(),
        kwRes.json(),
        pagesRes.json(),
      ]);

      if (trendData.success) {
        setTrendData(
          trendData.data.trend.map((d: TrendPoint) => ({
            ...d,
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          }))
        );
        setComparison(trendData.data.comparison);
      }

      if (metricsData.success) {
        setTotals(metricsData.data.totals);
      }

      if (kwData.success) {
        setKeywords(kwData.data);
        setKeywordStats(kwData.stats);
      }

      if (pagesData.success) {
        setPages(pagesData.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWebsiteId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedWebsite = websites.find((w) => w._id === selectedWebsiteId);

  // Keyword position distribution for bar chart
  const positionBuckets = [
    { name: 'Top 3', range: [1, 3], color: '#10b981', count: keywordStats?.top3Keywords || 0 },
    { name: '4-10', range: [4, 10], color: '#3b82f6', count: (keywordStats?.top10Keywords || 0) - (keywordStats?.top3Keywords || 0) },
    { name: '11-20', range: [11, 20], color: '#8b5cf6', count: 0 },
    { name: '21-50', range: [21, 50], color: '#f59e0b', count: 0 },
    { name: '51-100', range: [51, 100], color: '#f97316', count: (keywordStats?.top100Keywords || 0) - (keywordStats?.top10Keywords || 0) },
  ];

  if (!websitesLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (websites.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="p-4 bg-zinc-900 rounded-2xl inline-block mb-5">
            <Globe className="h-12 w-12 text-zinc-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Website Connected to GSC</h2>
          <p className="text-zinc-400 mb-6 text-sm">
            Connect your websites to Google Search Console first to see analytics data here.
          </p>
          <button
            onClick={() => router.push('/admin/seo/search-console')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Go to Search Console Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-purple-400" />
                SEO Analytics
              </h1>
              <p className="text-zinc-400 mt-1">
                {selectedWebsite
                  ? `Detailed performance for ${selectedWebsite.domain}`
                  : 'Select a website to view analytics'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Website Selector */}
              <div className="relative">
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {websites.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.domain})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>

              {/* Period Selector */}
              <div className="flex bg-zinc-800 rounded-lg p-1">
                {[
                  { days: 7, label: '7d' },
                  { days: 14, label: '14d' },
                  { days: 28, label: '28d' },
                  { days: 90, label: '90d' },
                ].map((p) => (
                  <button
                    key={p.days}
                    onClick={() => setPeriod(p.days)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      period === p.days ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-5">
            {[
              { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
              { key: 'keywords' as const, label: 'Keywords', icon: Hash },
              { key: 'pages' as const, label: 'Pages', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Big Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <MousePointer className="h-5 w-5 text-blue-400" />
                      </div>
                      <DeltaIndicator value={comparison?.clicksDelta ?? null} />
                    </div>
                    <p className="text-3xl font-bold">{formatNumber(totals?.clicks || 0)}</p>
                    <p className="text-sm text-zinc-500 mt-1">Total Clicks</p>
                    <p className="text-xs text-zinc-600 mt-0.5">People who visited your site from Google</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Eye className="h-5 w-5 text-purple-400" />
                      </div>
                      <DeltaIndicator value={comparison?.impressionsDelta ?? null} />
                    </div>
                    <p className="text-3xl font-bold">{formatNumber(totals?.impressions || 0)}</p>
                    <p className="text-sm text-zinc-500 mt-1">Impressions</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Times your site appeared in search results</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Target className="h-5 w-5 text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold">{((totals?.ctr || 0) * 100).toFixed(1)}%</p>
                    <p className="text-sm text-zinc-500 mt-1">Click-Through Rate</p>
                    <p className="text-xs text-zinc-600 mt-0.5">% of people who clicked after seeing your site</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-amber-400" />
                      </div>
                      <DeltaIndicator value={comparison?.positionDelta ?? null} invert />
                    </div>
                    <p className="text-3xl font-bold">{(totals?.avgPosition || 0).toFixed(1)}</p>
                    <p className="text-sm text-zinc-500 mt-1">Avg Position</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Your average ranking on Google (lower = better)</p>
                  </div>
                </div>

                {/* Trend Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Clicks & Impressions */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-medium mb-1">Clicks & Impressions</h3>
                    <p className="text-xs text-zinc-500 mb-4">How many people see and click your site on Google</p>
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                          <YAxis stroke="#71717a" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Area type="monotone" dataKey="clicks" stroke="#3b82f6" fill="url(#clicksGrad)" strokeWidth={2} dot={false} name="Clicks" />
                          <Area type="monotone" dataKey="impressions" stroke="#8b5cf6" fill="url(#impGrad)" strokeWidth={1.5} dot={false} name="Impressions" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
                        No data available for this period
                      </div>
                    )}
                  </div>

                  {/* Position Trend */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-medium mb-1">Ranking Position</h3>
                    <p className="text-xs text-zinc-500 mb-4">Your average position on Google (lower number = higher ranking)</p>
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                          <YAxis stroke="#71717a" fontSize={11} reversed domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: 12 }} />
                          <Line type="monotone" dataKey="position" stroke="#10b981" strokeWidth={2.5} dot={false} name="Avg Position" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
                        No data available for this period
                      </div>
                    )}
                  </div>
                </div>

                {/* Keyword Distribution */}
                {keywordStats && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-medium mb-1">Keyword Rankings Distribution</h3>
                    <p className="text-xs text-zinc-500 mb-5">Where your keywords rank on Google</p>
                    <div className="grid grid-cols-5 gap-4">
                      {[
                        { label: 'Total Keywords', value: keywordStats.totalKeywords, color: 'text-white', desc: 'All tracked' },
                        { label: 'Top 3', value: keywordStats.top3Keywords, color: 'text-emerald-400', desc: 'Best performers' },
                        { label: 'Top 10', value: keywordStats.top10Keywords, color: 'text-blue-400', desc: 'Page 1' },
                        { label: 'Top 100', value: keywordStats.top100Keywords, color: 'text-purple-400', desc: 'Visible' },
                        { label: 'Avg Position', value: keywordStats.avgPosition.toFixed(1), color: 'text-amber-400', desc: 'Average rank' },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center bg-zinc-800/50 rounded-xl p-4">
                          <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                          <p className="text-sm text-zinc-300 mt-1">{stat.label}</p>
                          <p className="text-xs text-zinc-600">{stat.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KEYWORDS TAB */}
            {activeTab === 'keywords' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-lg font-medium">Top Keywords</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Keywords people search on Google to find your website
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800/50 text-left text-xs text-zinc-400 uppercase tracking-wider">
                        <th className="px-5 py-3 w-10">#</th>
                        <th className="px-5 py-3">Keyword</th>
                        <th className="px-5 py-3 text-right">Clicks</th>
                        <th className="px-5 py-3 text-right">Impressions</th>
                        <th className="px-5 py-3 text-right">CTR</th>
                        <th className="px-5 py-3 text-right">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((kw, i) => (
                        <tr key={kw.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="px-5 py-3.5 text-zinc-500 text-sm">{i + 1}</td>
                          <td className="px-5 py-3.5">
                            <span className="font-medium text-sm">{kw.keyword}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm">{formatNumber(kw.clicks)}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-zinc-400">{formatNumber(kw.impressions)}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-zinc-400">{(kw.ctr * 100).toFixed(1)}%</td>
                          <td className="px-5 py-3.5 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                kw.position <= 3
                                  ? 'bg-emerald-900/30 text-emerald-400'
                                  : kw.position <= 10
                                  ? 'bg-blue-900/30 text-blue-400'
                                  : kw.position <= 20
                                  ? 'bg-amber-900/30 text-amber-400'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {kw.position.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {keywords.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                      <Hash className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                      <p>No keyword data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PAGES TAB */}
            {activeTab === 'pages' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Top Pages</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Your best performing pages on Google
                    </p>
                  </div>
                  {pages.length > 0 && (
                    <button
                      onClick={async () => {
                        const urls = pages.map((p) => p.url);
                        try {
                          const res = await fetch('/api/seo/indexing', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ websiteId: selectedWebsiteId, urls }),
                          });
                          const data = await res.json();
                          alert(data.success ? `Submitted ${data.data.submitted} URLs for indexing` : data.error);
                        } catch {
                          alert('Failed to request indexing');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Index All
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800/50 text-left text-xs text-zinc-400 uppercase tracking-wider">
                        <th className="px-5 py-3 w-10">#</th>
                        <th className="px-5 py-3">Page</th>
                        <th className="px-5 py-3 text-right">Clicks</th>
                        <th className="px-5 py-3 text-right">Impressions</th>
                        <th className="px-5 py-3 text-right">CTR</th>
                        <th className="px-5 py-3 text-right">Position</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((page, i) => (
                        <tr key={page.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="px-5 py-3.5 text-zinc-500 text-sm">{i + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate max-w-md">{page.path}</span>
                              <a
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-500 hover:text-purple-400 flex-shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm">{formatNumber(page.clicks)}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-zinc-400">{formatNumber(page.impressions)}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-zinc-400">{(page.ctr * 100).toFixed(1)}%</td>
                          <td className="px-5 py-3.5 text-right text-sm">{page.position.toFixed(1)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/seo/indexing', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ websiteId: selectedWebsiteId, urls: [page.url] }),
                                  });
                                  const data = await res.json();
                                  alert(data.success ? 'Indexing requested!' : data.error);
                                } catch {
                                  alert('Failed');
                                }
                              }}
                              className="text-emerald-400 hover:text-emerald-300"
                              title="Request indexing"
                            >
                              <Zap className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pages.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                      <p>No page data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}

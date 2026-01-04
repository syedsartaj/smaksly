'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  MousePointer,
  Eye,
  Target,
  BarChart3,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Zap,
  Link2,
  CheckCircle2,
  AlertCircle,
  Copy,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { formatNumber } from '@/lib/utils';

interface Website {
  _id: string;
  name: string;
  domain: string;
  gscConnected?: boolean;
}

interface MetricData {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Totals {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

interface KeywordData {
  id: number;
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface KeywordStats {
  totalKeywords: number;
  avgPosition: number;
  top3Keywords: number;
  top10Keywords: number;
  top100Keywords: number;
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

export default function SEODashboardPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [period, setPeriod] = useState('28d');
  const [isLoading, setIsLoading] = useState(true);

  // Metrics
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);

  // Keywords
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [keywordStats, setKeywordStats] = useState<KeywordStats | null>(null);

  // Pages
  const [pages, setPages] = useState<PageData[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'pages' | 'indexing'>('overview');

  // GSC Connection Modal
  const [showGSCModal, setShowGSCModal] = useState(false);

  // Fetch websites
  useEffect(() => {
    const fetchWebsites = async () => {
      try {
        const res = await fetch('/api/websites?limit=100&status=active');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setWebsites(data.data);
          setSelectedWebsite(data.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch websites:', error);
      }
    };
    fetchWebsites();
  }, []);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    if (!selectedWebsite) return;

    setIsLoading(true);
    try {
      const [metricsRes, keywordsRes, pagesRes] = await Promise.all([
        fetch(`/api/seo/metrics?websiteId=${selectedWebsite._id}&period=${period}&dimension=date`),
        fetch(`/api/seo/keywords?websiteId=${selectedWebsite._id}&period=${period}&limit=20`),
        fetch(`/api/seo/pages?websiteId=${selectedWebsite._id}&period=${period}&limit=10`),
      ]);

      const [metricsData, keywordsData, pagesData] = await Promise.all([
        metricsRes.json(),
        keywordsRes.json(),
        pagesRes.json(),
      ]);

      if (metricsData.success) {
        setMetrics(metricsData.data.metrics);
        setTotals(metricsData.data.totals);
      }

      if (keywordsData.success) {
        setKeywords(keywordsData.data);
        setKeywordStats(keywordsData.stats);
      }

      if (pagesData.success) {
        setPages(pagesData.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWebsite, period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleRequestIndexing = async (urls: string[]) => {
    if (!selectedWebsite) return;

    try {
      const res = await fetch('/api/seo/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: selectedWebsite._id,
          urls,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Successfully submitted ${data.data.submitted} URLs for indexing`);
      } else {
        alert(data.error || 'Failed to request indexing');
      }
    } catch (error) {
      console.error('Failed to request indexing:', error);
      alert('Failed to request indexing');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">SEO Dashboard</h1>
              <p className="text-zinc-400 mt-1">Monitor search performance across your network</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Website Selector */}
              <div className="relative">
                <select
                  value={selectedWebsite?._id || ''}
                  onChange={(e) => {
                    const website = websites.find((w) => w._id === e.target.value);
                    setSelectedWebsite(website || null);
                  }}
                  className="appearance-none px-4 py-2 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {websites.map((website) => (
                    <option key={website._id} value={website._id}>
                      {website.name} ({website.domain})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>

              {/* Period Selector */}
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="28d">Last 28 days</option>
                <option value="3m">Last 3 months</option>
              </select>

              <button
                onClick={fetchMetrics}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Connect GSC Button */}
              <button
                onClick={() => setShowGSCModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  selectedWebsite?.gscConnected
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {selectedWebsite?.gscConnected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    GSC Connected
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Connect GSC
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6">
            {(['overview', 'keywords', 'pages', 'indexing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
                  activeTab === tab
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : !selectedWebsite ? (
          <div className="text-center py-12 text-zinc-400">
            No websites found. Add a website first to view SEO metrics.
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <MousePointer className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Total Clicks</p>
                        <p className="text-2xl font-bold">{formatNumber(totals?.clicks || 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Eye className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Impressions</p>
                        <p className="text-2xl font-bold">{formatNumber(totals?.impressions || 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Target className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Avg CTR</p>
                        <p className="text-2xl font-bold">{((totals?.ctr || 0) * 100).toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Avg Position</p>
                        <p className="text-2xl font-bold">{(totals?.avgPosition || 0).toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Clicks & Impressions Chart */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-medium mb-4">Clicks & Impressions</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={metrics}>
                        <defs>
                          <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="key" stroke="#71717a" fontSize={12} />
                        <YAxis stroke="#71717a" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="clicks"
                          stroke="#3b82f6"
                          fill="url(#clicksGradient)"
                          name="Clicks"
                        />
                        <Area
                          type="monotone"
                          dataKey="impressions"
                          stroke="#8b5cf6"
                          fill="url(#impressionsGradient)"
                          name="Impressions"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Position Chart */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-medium mb-4">Average Position</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="key" stroke="#71717a" fontSize={12} />
                        <YAxis stroke="#71717a" fontSize={12} reversed />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="position"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          name="Position"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Keywords Summary */}
                {keywordStats && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-medium mb-4">Keywords Distribution</h3>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{keywordStats.totalKeywords}</p>
                        <p className="text-sm text-zinc-400">Total Keywords</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-emerald-400">{keywordStats.top3Keywords}</p>
                        <p className="text-sm text-zinc-400">Top 3</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-400">{keywordStats.top10Keywords}</p>
                        <p className="text-sm text-zinc-400">Top 10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-400">{keywordStats.top100Keywords}</p>
                        <p className="text-sm text-zinc-400">Top 100</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-orange-400">{keywordStats.avgPosition.toFixed(1)}</p>
                        <p className="text-sm text-zinc-400">Avg Position</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'keywords' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Top Keywords</h3>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search keywords..."
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Keyword</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                      <th className="px-4 py-3 text-right">Impressions</th>
                      <th className="px-4 py-3 text-right">CTR</th>
                      <th className="px-4 py-3 text-right">Position</th>
                      <th className="px-4 py-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((keyword, index) => (
                      <tr key={keyword.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                        <td className="px-4 py-3 text-zinc-400">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{keyword.keyword}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(keyword.clicks)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(keyword.impressions)}</td>
                        <td className="px-4 py-3 text-right">{(keyword.ctr * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`${
                              keyword.position <= 3
                                ? 'text-emerald-400'
                                : keyword.position <= 10
                                ? 'text-blue-400'
                                : keyword.position <= 20
                                ? 'text-yellow-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            {keyword.position.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {keyword.position <= 10 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-400 inline" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-400 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'pages' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Top Pages</h3>
                  <button
                    onClick={() =>
                      handleRequestIndexing(pages.map((p) => p.url))
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
                  >
                    <Zap className="h-4 w-4" />
                    Index All
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Page</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                      <th className="px-4 py-3 text-right">Impressions</th>
                      <th className="px-4 py-3 text-right">CTR</th>
                      <th className="px-4 py-3 text-right">Position</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page, index) => (
                      <tr key={page.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                        <td className="px-4 py-3 text-zinc-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate max-w-md">{page.path}</span>
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-emerald-400"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatNumber(page.clicks)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(page.impressions)}</td>
                        <td className="px-4 py-3 text-right">{(page.ctr * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right">{page.position.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRequestIndexing([page.url])}
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
              </div>
            )}

            {activeTab === 'indexing' && (
              <IndexingTab websiteId={selectedWebsite._id} domain={selectedWebsite.domain} />
            )}
          </>
        )}
      </div>

      {/* GSC Connection Modal */}
      {showGSCModal && selectedWebsite && (
        <GSCConnectionModal
          website={selectedWebsite}
          onClose={() => setShowGSCModal(false)}
          onConnected={() => {
            setShowGSCModal(false);
            // Refresh websites to get updated gscConnected status
            const updatedWebsites = websites.map((w) =>
              w._id === selectedWebsite._id ? { ...w, gscConnected: true } : w
            );
            setWebsites(updatedWebsites);
            setSelectedWebsite({ ...selectedWebsite, gscConnected: true });
            fetchMetrics();
          }}
        />
      )}
    </div>
  );
}

// Indexing Tab Component
function IndexingTab({ websiteId, domain }: { websiteId: string; domain: string }) {
  const [urls, setUrls] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<{
    submitted: number;
    failed: number;
    results: Array<{ url?: string; success: boolean; error?: string }>;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urls.trim()) return;

    setIsSubmitting(true);
    setResults(null);

    try {
      const urlList = urls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u);

      const res = await fetch('/api/seo/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          urls: urlList,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      } else {
        alert(data.error || 'Failed to request indexing');
      }
    } catch (error) {
      console.error('Failed to request indexing:', error);
      alert('Failed to request indexing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Submit URLs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Request Indexing</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              URLs (one per line)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={10}
              placeholder={`https://${domain}/page-1\nhttps://${domain}/page-2\nhttps://${domain}/blog/article`}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              {urls.split('\n').filter((u) => u.trim()).length} URLs
            </p>
            <button
              type="submit"
              disabled={isSubmitting || !urls.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Submit for Indexing
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Results</h3>
        {results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">{results.submitted}</p>
                <p className="text-sm text-zinc-400">Submitted</p>
              </div>
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-400">{results.failed}</p>
                <p className="text-sm text-zinc-400">Failed</p>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {results.results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    result.success ? 'bg-emerald-900/10' : 'bg-red-900/10'
                  }`}
                >
                  {result.success ? (
                    <span className="text-emerald-400">OK</span>
                  ) : (
                    <span className="text-red-400">ERR</span>
                  )}
                  <span className="truncate flex-1">{result.url || 'Unknown URL'}</span>
                  {result.error && (
                    <span className="text-red-400 text-xs">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-400">
            Submit URLs to see indexing results
          </div>
        )}
      </div>
    </div>
  );
}

// GSC Connection Modal Component
function GSCConnectionModal({
  website,
  onClose,
  onConnected,
}: {
  website: Website;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const serviceAccountEmail = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL || 'smaksly-seo@your-project.iam.gserviceaccount.com';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    setVerifyError(null);

    try {
      // Try to fetch metrics to verify connection
      const res = await fetch(`/api/seo/metrics?websiteId=${website._id}&period=7d&dimension=date`);
      const data = await res.json();

      if (data.success) {
        // Mark website as GSC connected
        await fetch(`/api/websites/${website._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gscConnected: true }),
        });
        onConnected();
      } else {
        setVerifyError(data.error || 'Failed to verify connection. Please ensure you have added the service account to your property.');
      }
    } catch (error) {
      setVerifyError('Failed to verify connection. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const steps = [
    {
      title: 'Open Google Search Console',
      content: (
        <div className="space-y-3">
          <p className="text-zinc-300">
            Go to Google Search Console and select your property:
          </p>
          <a
            href={`https://search.google.com/search-console/users?resource_id=sc-domain:${website.domain.replace(/^https?:\/\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="h-4 w-4" />
            Open Search Console for {website.domain}
          </a>
          <div className="p-3 bg-zinc-800 rounded-lg text-sm text-zinc-400">
            <strong>Note:</strong> If your property is not verified yet, you&apos;ll need to verify it first using DNS verification or HTML file upload.
          </div>
        </div>
      ),
    },
    {
      title: 'Add Service Account User',
      content: (
        <div className="space-y-3">
          <p className="text-zinc-300">
            In Search Console, go to <strong>Settings → Users and permissions</strong> and add the following service account email as a <strong>Full</strong> user:
          </p>
          <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
            <code className="flex-1 text-emerald-400 text-sm break-all">
              {serviceAccountEmail}
            </code>
            <button
              onClick={() => copyToClipboard(serviceAccountEmail)}
              className="p-2 hover:bg-zinc-700 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-zinc-400" />
              )}
            </button>
          </div>
          <div className="p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg text-sm text-amber-300">
            <strong>Important:</strong> Make sure to select &quot;Full&quot; permission level, not &quot;Restricted&quot;.
          </div>
        </div>
      ),
    },
    {
      title: 'Verify Connection',
      content: (
        <div className="space-y-4">
          <p className="text-zinc-300">
            Once you&apos;ve added the service account, click below to verify the connection:
          </p>

          {verifyError && (
            <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Connection Failed</p>
                <p className="text-red-400/80">{verifyError}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleVerifyConnection}
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Verify Connection
              </>
            )}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            It may take a few minutes for Google to grant access after adding the service account.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Connect Google Search Console</h2>
              <p className="text-sm text-zinc-400">{website.domain}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(index + 1)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentStep === index + 1
                      ? 'bg-blue-600 text-white'
                      : currentStep > index + 1
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-current/20 text-xs">
                    {currentStep > index + 1 ? '✓' : index + 1}
                  </span>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-zinc-700 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Step {currentStep}: {steps[currentStep - 1].title}
          </h3>
          {steps[currentStep - 1].content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <button
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentStep < steps.length ? (
            <button
              onClick={() => setCurrentStep((s) => Math.min(steps.length, s + 1))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Next Step
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

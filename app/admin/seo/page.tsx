'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  TrendingUp,
  TrendingDown,
  MousePointer,
  Eye,
  Target,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle2,
  ArrowRight,
  Activity,
  Globe,
  Link2,
  Zap,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface Website {
  _id: string;
  name: string;
  domain: string;
  gscConnected?: boolean;
  traffic?: number;
  da?: number;
}

interface SiteHealth {
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  gscConnected: boolean;
  healthScore: number;
  previousHealthScore?: number;
  issueCount: number;
  criticalCount: number;
  clicks: number;
  impressions: number;
  avgPosition: number;
  clicksDelta: number | null;
  impressionsDelta: number | null;
  positionDelta: number | null;
  status: 'healthy' | 'warning' | 'critical' | 'no-data';
}

export default function SEOOverviewPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [siteHealths, setSiteHealths] = useState<SiteHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attention' | 'healthy' | 'no-gsc'>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [websitesRes, fixerRes] = await Promise.all([
        fetch('/api/websites?limit=100&status=active'),
        fetch('/api/seo/fixer'),
      ]);

      const [websitesData, fixerData] = await Promise.all([
        websitesRes.json(),
        fixerRes.json(),
      ]);

      const sites: Website[] = websitesData.success ? websitesData.data : [];
      setWebsites(sites);

      const fixReports = fixerData.success ? fixerData.data : [];
      const fixMap = new Map(fixReports.map((r: Record<string, unknown>) => [r.websiteId, r]));

      // Build health data per site — try to get GSC metrics for connected sites
      const healthPromises = sites.map(async (site) => {
        const fix = fixMap.get(site._id) as Record<string, unknown> | undefined;
        let clicks = 0, impressions = 0, avgPosition = 0;
        let clicksDelta: number | null = null;
        let impressionsDelta: number | null = null;
        let positionDelta: number | null = null;

        if (site.gscConnected) {
          try {
            const trendRes = await fetch(
              `/api/seo/tracker/${site._id}/trends?days=28&compare=true`
            );
            const trendData = await trendRes.json();
            if (trendData.success) {
              const s = trendData.data.summary;
              const c = trendData.data.comparison;
              clicks = s?.totalClicks || 0;
              impressions = s?.totalImpressions || 0;
              avgPosition = s?.avgPosition || 0;
              clicksDelta = c?.clicksDelta ?? null;
              impressionsDelta = c?.impressionsDelta ?? null;
              positionDelta = c?.positionDelta ?? null;
            }
          } catch {
            // GSC fetch failed, leave defaults
          }
        }

        const healthScore = fix ? (fix.healthScore as number) : 0;
        const issueCount = fix ? (fix.issueCount as number) : 0;
        const criticalCount = fix ? (fix.criticalCount as number) : 0;

        let status: SiteHealth['status'] = 'no-data';
        if (!site.gscConnected) {
          status = 'no-data';
        } else if (criticalCount > 0 || healthScore < 40) {
          status = 'critical';
        } else if (
          issueCount > 3 ||
          healthScore < 70 ||
          (clicksDelta !== null && clicksDelta < -20) ||
          (positionDelta !== null && positionDelta > 20)
        ) {
          status = 'warning';
        } else {
          status = 'healthy';
        }

        return {
          websiteId: site._id,
          websiteName: site.name,
          websiteDomain: site.domain,
          gscConnected: !!site.gscConnected,
          healthScore,
          previousHealthScore: fix?.previousHealthScore as number | undefined,
          issueCount,
          criticalCount,
          clicks,
          impressions,
          avgPosition,
          clicksDelta,
          impressionsDelta,
          positionDelta,
          status,
        } as SiteHealth;
      });

      const healths = await Promise.all(healthPromises);
      // Sort: critical first, then warning, then healthy, then no-data
      healths.sort((a, b) => {
        const order = { critical: 0, warning: 1, healthy: 2, 'no-data': 3 };
        return order[a.status] - order[b.status];
      });
      setSiteHealths(healths);
    } catch (error) {
      console.error('Failed to fetch SEO overview:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const gscConnected = siteHealths.filter((s) => s.gscConnected).length;
  const gscNotConnected = siteHealths.filter((s) => !s.gscConnected).length;
  const needsAttention = siteHealths.filter(
    (s) => s.status === 'critical' || s.status === 'warning'
  ).length;
  const totalClicks = siteHealths.reduce((s, h) => s + h.clicks, 0);
  const totalImpressions = siteHealths.reduce((s, h) => s + h.impressions, 0);
  const avgHealth = siteHealths.filter((s) => s.healthScore > 0).length
    ? Math.round(
        siteHealths.filter((s) => s.healthScore > 0).reduce((s, h) => s + h.healthScore, 0) /
          siteHealths.filter((s) => s.healthScore > 0).length
      )
    : 0;

  const filtered = siteHealths.filter((s) => {
    if (filter === 'attention') return s.status === 'critical' || s.status === 'warning';
    if (filter === 'healthy') return s.status === 'healthy';
    if (filter === 'no-gsc') return !s.gscConnected;
    return true;
  });

  const getStatusColor = (status: SiteHealth['status']) => {
    switch (status) {
      case 'critical': return 'border-red-500/50 bg-red-950/20';
      case 'warning': return 'border-amber-500/50 bg-amber-950/10';
      case 'healthy': return 'border-emerald-500/30 bg-emerald-950/10';
      default: return 'border-zinc-800';
    }
  };

  const getStatusBadge = (status: SiteHealth['status']) => {
    switch (status) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-900/40 text-red-400 text-xs rounded-full font-medium">
            <XCircle className="h-3 w-3" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-900/40 text-amber-400 text-xs rounded-full font-medium">
            <AlertTriangle className="h-3 w-3" /> Needs Attention
          </span>
        );
      case 'healthy':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-900/40 text-emerald-400 text-xs rounded-full font-medium">
            <CheckCircle2 className="h-3 w-3" /> Healthy
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full font-medium">
            <AlertCircle className="h-3 w-3" /> No Data
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Search className="h-6 w-6 text-emerald-400" />
                SEO Overview
              </h1>
              <p className="text-zinc-400 mt-1">
                Network-wide health monitoring across {websites.length} websites
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Network Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <Globe className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-400">GSC Connected</p>
            </div>
            <p className="text-3xl font-bold">{gscConnected}<span className="text-lg text-zinc-500">/{websites.length}</span></p>
            {gscNotConnected > 0 && (
              <button
                onClick={() => router.push('/admin/seo/search-console')}
                className="text-xs text-amber-400 mt-2 hover:underline"
              >
                {gscNotConnected} not connected →
              </button>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl">
                <MousePointer className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-sm text-zinc-400">Total Clicks (28d)</p>
            </div>
            <p className="text-3xl font-bold">{formatNumber(totalClicks)}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-purple-500/20 rounded-xl">
                <Eye className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-sm text-zinc-400">Total Impressions (28d)</p>
            </div>
            <p className="text-3xl font-bold">{formatNumber(totalImpressions)}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${avgHealth >= 70 ? 'bg-emerald-500/20' : avgHealth >= 50 ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                <ShieldCheck className={`h-5 w-5 ${avgHealth >= 70 ? 'text-emerald-400' : avgHealth >= 50 ? 'text-amber-400' : 'text-red-400'}`} />
              </div>
              <p className="text-sm text-zinc-400">Avg Health Score</p>
            </div>
            <p className="text-3xl font-bold">{avgHealth}<span className="text-lg text-zinc-500">/100</span></p>
          </div>
        </div>

        {/* Needs Attention Banner */}
        {needsAttention > 0 && (
          <div className="bg-gradient-to-r from-red-950/40 to-amber-950/30 border border-red-900/40 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {needsAttention} website{needsAttention > 1 ? 's' : ''} need{needsAttention === 1 ? 's' : ''} attention
                  </p>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    Traffic drops, ranking issues, or critical SEO problems detected
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFilter('attention')}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
              >
                View All
              </button>
            </div>
          </div>
        )}

        {/* Quick Navigation */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/seo/search-console')}
            className="flex items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl text-left transition-all group"
          >
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Link2 className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Search Console</p>
              <p className="text-xs text-zinc-500 mt-0.5">Manage GSC connections</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-blue-400" />
          </button>

          <button
            onClick={() => router.push('/admin/seo/analytics')}
            className="flex items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 rounded-xl text-left transition-all group"
          >
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <BarChart3 className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Analytics</p>
              <p className="text-xs text-zinc-500 mt-0.5">Deep dive per website</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-purple-400" />
          </button>

          <button
            onClick={() => router.push('/admin/seo/fixer')}
            className="flex items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
          >
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <Zap className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">AI Fixer</p>
              <p className="text-xs text-zinc-500 mt-0.5">AI-powered issue detection</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {[
            { key: 'all' as const, label: 'All Sites', count: siteHealths.length },
            { key: 'attention' as const, label: 'Needs Attention', count: needsAttention },
            { key: 'healthy' as const, label: 'Healthy', count: siteHealths.filter((s) => s.status === 'healthy').length },
            { key: 'no-gsc' as const, label: 'No GSC', count: gscNotConnected },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                filter === tab.key ? 'bg-emerald-500/30' : 'bg-zinc-800'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Website Health Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-lg font-medium">No websites match this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((site) => (
              <button
                key={site.websiteId}
                onClick={() => {
                  if (!site.gscConnected) {
                    router.push('/admin/seo/search-console');
                  } else {
                    router.push(`/admin/seo/analytics?website=${site.websiteId}`);
                  }
                }}
                className={`border rounded-xl p-5 text-left transition-all hover:shadow-lg group bg-zinc-900 ${getStatusColor(site.status)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{site.websiteName}</p>
                      {getStatusBadge(site.status)}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{site.websiteDomain}</p>
                  </div>
                  {site.healthScore > 0 && (
                    <div className="relative flex items-center justify-center ml-3">
                      <svg width="56" height="56" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#27272a" strokeWidth="5" />
                        <circle
                          cx="28" cy="28" r="22"
                          fill="none"
                          stroke={site.healthScore >= 80 ? '#10b981' : site.healthScore >= 60 ? '#f59e0b' : site.healthScore >= 40 ? '#f97316' : '#ef4444'}
                          strokeWidth="5"
                          strokeDasharray={`${(site.healthScore / 100) * 138.2} 138.2`}
                          strokeLinecap="round"
                          transform="rotate(-90 28 28)"
                        />
                        <text x="28" y="28" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="13" fontWeight="bold">
                          {site.healthScore}
                        </text>
                      </svg>
                    </div>
                  )}
                </div>

                {site.gscConnected ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-800/50 rounded-lg p-2.5">
                      <p className="text-xs text-zinc-500 mb-0.5">Clicks</p>
                      <p className="text-sm font-semibold">{formatNumber(site.clicks)}</p>
                      {site.clicksDelta !== null && (
                        <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${
                          site.clicksDelta > 0 ? 'text-emerald-400' : site.clicksDelta < 0 ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {site.clicksDelta > 0 ? <TrendingUp className="h-3 w-3" /> : site.clicksDelta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {site.clicksDelta > 0 ? '+' : ''}{site.clicksDelta}%
                        </p>
                      )}
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2.5">
                      <p className="text-xs text-zinc-500 mb-0.5">Impressions</p>
                      <p className="text-sm font-semibold">{formatNumber(site.impressions)}</p>
                      {site.impressionsDelta !== null && (
                        <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${
                          site.impressionsDelta > 0 ? 'text-emerald-400' : site.impressionsDelta < 0 ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {site.impressionsDelta > 0 ? <TrendingUp className="h-3 w-3" /> : site.impressionsDelta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {site.impressionsDelta > 0 ? '+' : ''}{site.impressionsDelta}%
                        </p>
                      )}
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2.5">
                      <p className="text-xs text-zinc-500 mb-0.5">Avg Position</p>
                      <p className="text-sm font-semibold">{site.avgPosition.toFixed(1)}</p>
                      {site.positionDelta !== null && (
                        <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${
                          site.positionDelta < 0 ? 'text-emerald-400' : site.positionDelta > 0 ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {site.positionDelta < 0 ? <TrendingUp className="h-3 w-3" /> : site.positionDelta > 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {site.positionDelta > 0 ? '+' : ''}{site.positionDelta}%
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg">
                    <Link2 className="h-4 w-4 text-zinc-500" />
                    <p className="text-sm text-zinc-400">GSC not connected — click to set up</p>
                  </div>
                )}

                {site.criticalCount > 0 && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-red-400">
                    <XCircle className="h-3.5 w-3.5" />
                    {site.criticalCount} critical issue{site.criticalCount > 1 ? 's' : ''} &middot; {site.issueCount} total
                  </div>
                )}

                <div className="flex items-center justify-end mt-3">
                  <span className="text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {site.gscConnected ? 'View Analytics' : 'Connect GSC'} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BarChart3, MousePointer, Eye, Target, TrendingUp,
  TrendingDown, Minus, RefreshCw, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface TrendPoint {
  date: string; clicks: number; impressions: number;
  ctr: number; position: number; indexedPages: number;
}

interface Summary {
  totalClicks: number; totalImpressions: number;
  avgPosition: number; avgCTR: number; days: number; dataPoints: number;
}

interface Comparison {
  clicks: number; impressions: number; avgPosition: number;
  clicksDelta: number | null; impressionsDelta: number | null; positionDelta: number | null;
}

interface Website { _id: string; name: string; domain: string; gscConnected?: boolean }

function DeltaBadge({ delta, invert = false }: { delta: number | null; invert?: boolean }) {
  if (delta === null) return <span className="text-zinc-500">—</span>;
  const positive = invert ? delta < 0 : delta > 0;
  const color = positive ? 'text-emerald-400' : delta === 0 ? 'text-zinc-400' : 'text-red-400';
  const Icon = positive ? TrendingUp : delta === 0 ? Minus : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? '+' : ''}{delta}%
    </span>
  );
}

export default function SEOTrackerPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('');
  const [days, setDays] = useState(30);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'clicks' | 'impressions' | 'position' | 'ctr'>('clicks');

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

  const fetchTrends = useCallback(async () => {
    if (!selectedWebsiteId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/seo/tracker/${selectedWebsiteId}/trends?days=${days}&compare=true`
      );
      const data = await res.json();
      if (data.success) {
        const shaped = data.data.trend.map((d: TrendPoint) => ({
          ...d,
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }));
        setTrendData(shaped);
        setSummary(data.data.summary);
        setComparison(data.data.comparison);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedWebsiteId, days]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const METRIC_CONFIG = {
    clicks: { label: 'Clicks', color: '#3b82f6', format: (v: number) => v.toLocaleString() },
    impressions: { label: 'Impressions', color: '#8b5cf6', format: (v: number) => v.toLocaleString() },
    position: { label: 'Avg Position', color: '#10b981', format: (v: number) => v.toFixed(1) },
    ctr: { label: 'CTR', color: '#f59e0b', format: (v: number) => `${v.toFixed(2)}%` },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/seo')} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                  SEO Tracker
                </h1>
                <p className="text-zinc-400 mt-1">Daily performance trends from Google Search Console</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="appearance-none px-4 py-2 pr-8 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  {websites.map((w) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
              <div className="flex bg-zinc-800 rounded-lg p-1">
                {[7, 14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 text-sm rounded-md ${days === d ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <button onClick={fetchTrends} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'clicks' as const, label: 'Total Clicks', value: summary.totalClicks.toLocaleString(), icon: MousePointer, delta: comparison?.clicksDelta },
              { key: 'impressions' as const, label: 'Impressions', value: summary.totalImpressions.toLocaleString(), icon: Eye, delta: comparison?.impressionsDelta },
              { key: 'position' as const, label: 'Avg Position', value: summary.avgPosition.toFixed(1), icon: Target, delta: comparison?.positionDelta, invert: true },
              { key: 'ctr' as const, label: 'Avg CTR', value: `${summary.avgCTR.toFixed(2)}%`, icon: TrendingUp, delta: null },
            ].map((card) => (
              <button
                key={card.key}
                onClick={() => setActiveMetric(card.key)}
                className={`bg-zinc-900 border rounded-xl p-4 text-left transition-all ${
                  activeMetric === card.key
                    ? 'border-blue-500 shadow-[0_0_0_1px_#3b82f6]'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeMetric === card.key ? 'bg-blue-500/20' : 'bg-zinc-800'}`}>
                      <card.icon className={`h-5 w-5 ${activeMetric === card.key ? 'text-blue-400' : 'text-zinc-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400">{card.label}</p>
                      <p className="text-2xl font-bold">{card.value}</p>
                    </div>
                  </div>
                  {card.delta !== null && (
                    <DeltaBadge delta={card.delta ?? null} invert={card.invert} />
                  )}
                </div>
                {comparison && (
                  <p className="text-xs text-zinc-500 mt-2">vs prev {days}d</p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main Trend Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">
              {METRIC_CONFIG[activeMetric].label} Trend
            </h2>
            <div className="flex bg-zinc-800 rounded-lg p-1">
              {(Object.keys(METRIC_CONFIG) as (keyof typeof METRIC_CONFIG)[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMetric(m)}
                  className={`px-3 py-1 text-xs rounded ${activeMetric === m ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  {METRIC_CONFIG[m].label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : trendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-zinc-500">
              No data for this period. Connect Google Search Console to start tracking.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {activeMetric === 'position' ? (
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} reversed />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="position" stroke={METRIC_CONFIG.position.color} strokeWidth={2} dot={false} name="Avg Position" />
                </LineChart>
              ) : (
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={METRIC_CONFIG[activeMetric].color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={METRIC_CONFIG[activeMetric].color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey={activeMetric}
                    stroke={METRIC_CONFIG[activeMetric].color}
                    fill="url(#metricGrad)"
                    strokeWidth={2}
                    dot={false}
                    name={METRIC_CONFIG[activeMetric].label}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Clicks + Impressions Combined */}
        {!isLoading && trendData.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-6">Clicks vs Impressions</h2>
            <ResponsiveContainer width="100%" height={220}>
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
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#71717a', fontSize: 12 }} />
                <Area type="monotone" dataKey="clicks" stroke="#3b82f6" fill="url(#clicksGrad)" strokeWidth={2} dot={false} name="Clicks" />
                <Area type="monotone" dataKey="impressions" stroke="#8b5cf6" fill="url(#impGrad)" strokeWidth={1.5} dot={false} name="Impressions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

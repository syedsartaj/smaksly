'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, AlertTriangle, RefreshCw, Play, ArrowRight,
  TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle,
  AlertCircle, Clock, Activity,
} from 'lucide-react';

interface FixReport {
  _id: string;
  websiteId: string;
  healthScore: number;
  previousHealthScore?: number;
  healthScoreDelta?: number;
  summary: string;
  issueCount: number;
  criticalCount: number;
  highCount: number;
  triggeredAt: string;
  triggeredBy: string;
  website?: { _id: string; name: string; domain: string };
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#27272a" strokeWidth="8" />
        <circle
          cx="40" cy="40" r="34"
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(score / 100) * 213.6} 213.6`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="16" fontWeight="bold">
          {score}
        </text>
      </svg>
    </div>
  );
}

export default function AIFixerPage() {
  const router = useRouter();
  const [reports, setReports] = useState<FixReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/seo/fixer');
      const data = await res.json();
      if (data.success) setReports(data.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRunAll = async () => {
    if (!confirm('Run AI analysis for all active websites? This may take a few minutes.')) return;
    setIsRunningAll(true);
    try {
      const res = await fetch('/api/seo/fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' }),
      });
      const data = await res.json();
      alert(data.message || 'Analysis queued');
    } finally {
      setIsRunningAll(false);
    }
  };

  const totalCritical = reports.reduce((s, r) => s + r.criticalCount, 0);
  const totalIssues = reports.reduce((s, r) => s + r.issueCount, 0);
  const avgScore = reports.length
    ? Math.round(reports.reduce((s, r) => s + r.healthScore, 0) / reports.length)
    : 0;
  const worstSites = [...reports].sort((a, b) => a.healthScore - b.healthScore).slice(0, 3);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                AI Website Fixer
              </h1>
              <p className="text-zinc-400 mt-1">
                Automated Technical SEO + Reliability analysis across all websites
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchReports} className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleRunAll}
                disabled={isRunningAll}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-60"
              >
                {isRunningAll ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Analysis (All)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Network Summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Websites Analysed', value: reports.length, icon: Activity, color: 'blue' },
            { label: 'Avg Health Score', value: `${avgScore}/100`, icon: ShieldCheck, color: avgScore >= 70 ? 'emerald' : avgScore >= 50 ? 'yellow' : 'red' },
            { label: 'Open Issues', value: totalIssues, icon: AlertTriangle, color: 'orange' },
            { label: 'Critical Issues', value: totalCritical, icon: XCircle, color: 'red' },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${s.color}-500/20 rounded-lg`}>
                  <s.icon className={`h-5 w-5 text-${s.color}-400`} />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Worst Performers Banner */}
        {worstSites.length > 0 && worstSites[0].healthScore < 60 && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4">
            <p className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Sites needing immediate attention
            </p>
            <div className="flex items-center gap-4">
              {worstSites.map((s) => (
                <button
                  key={s._id}
                  onClick={() => router.push(`/admin/seo/fixer/${s.websiteId}`)}
                  className="flex items-center gap-3 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-red-900/30 rounded-lg"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: s.healthScore < 40 ? '#ef4444' : '#f97316' }}
                  >
                    {s.healthScore}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{s.website?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-red-400">{s.criticalCount} critical issues</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Website Cards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
            <p className="text-lg font-medium">No analyses run yet</p>
            <p className="text-sm mt-1 mb-6">Click &quot;Run Analysis&quot; to analyse all your websites</p>
            <button onClick={handleRunAll} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white">
              Start Analysis
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {reports.map((report) => (
              <button
                key={report._id}
                onClick={() => router.push(`/admin/seo/fixer/${report.websiteId}`)}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 text-left transition-all hover:shadow-lg group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{report.website?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-zinc-500 truncate">{report.website?.domain}</p>
                  </div>
                  <HealthGauge score={report.healthScore} />
                </div>

                {/* Health score delta */}
                {report.healthScoreDelta !== undefined && (
                  <div className="flex items-center gap-1 mb-3 text-xs">
                    {report.healthScoreDelta > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        +{report.healthScoreDelta} from last run
                      </span>
                    ) : report.healthScoreDelta < 0 ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <TrendingDown className="h-3 w-3" />
                        {report.healthScoreDelta} from last run
                      </span>
                    ) : (
                      <span className="text-zinc-500"><Minus className="h-3 w-3 inline" /> No change</span>
                    )}
                  </div>
                )}

                {/* Issue counts */}
                <div className="flex items-center gap-2 mb-3">
                  {report.criticalCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">
                      <XCircle className="h-3 w-3" />
                      {report.criticalCount} critical
                    </span>
                  )}
                  {report.highCount > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-900/30 text-orange-400 text-xs rounded">
                      {report.highCount} high
                    </span>
                  )}
                  {report.issueCount === 0 && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      No issues
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{report.summary}</p>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {new Date(report.triggeredAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    View Report <ArrowRight className="h-3 w-3" />
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

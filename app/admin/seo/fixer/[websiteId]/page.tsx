'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ShieldCheck, RefreshCw, Play, XCircle, AlertTriangle,
  Info, CheckCircle2, ChevronDown, ChevronUp, Zap, Clock,
  TrendingUp, TrendingDown, Activity, Target,
} from 'lucide-react';

interface FixIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  problem: string;
  reason: string;
  impact: string;
  fixSteps: string[];
  automatable: boolean;
  affectedUrls?: string[];
  detectedMetric?: string;
}

interface AIFixReport {
  _id: string;
  websiteId: string;
  healthScore: number;
  previousHealthScore?: number;
  healthScoreDelta?: number;
  summary: string;
  issues: FixIssue[];
  quickWins: string[];
  longTermImprovements: string[];
  issueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  dataSnapshot: {
    gscClicks: number; gscImpressions: number; gscAvgPosition: number;
    indexedPages: number; crawlErrors: number; lcp: number; cls: number;
    ttfb: number; performanceScore: number; uptimePercent: number;
    avgLatencyMs: number; openIssuesCount: number; rankingDropKeywords: number;
  };
  triggeredAt: string;
  triggeredBy: string;
  tokenCount?: number;
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; icon: typeof XCircle }> = {
  critical: { bg: 'bg-red-950/40 border-red-900/50', text: 'text-red-400', icon: XCircle },
  high: { bg: 'bg-orange-950/30 border-orange-900/40', text: 'text-orange-400', icon: AlertTriangle },
  medium: { bg: 'bg-yellow-950/20 border-yellow-900/30', text: 'text-yellow-400', icon: AlertTriangle },
  low: { bg: 'bg-zinc-900 border-zinc-800', text: 'text-zinc-400', icon: Info },
};

function HealthGaugeLarge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : 'Critical';
  const circumference = 2 * Math.PI * 54;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#27272a" strokeWidth="12" />
        <circle
          cx="70" cy="70" r="54"
          fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="70" y="65" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">{score}</text>
        <text x="70" y="85" textAnchor="middle" fill="#71717a" fontSize="11">/100</text>
      </svg>
      <span className="text-sm font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

function IssueCard({ issue }: { issue: FixIssue }) {
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.low;
  const Icon = style.icon;

  return (
    <div className={`border rounded-xl overflow-hidden ${style.bg}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${style.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold uppercase ${style.text}`}>{issue.severity}</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded capitalize">
              {issue.category.replace(/_/g, ' ')}
            </span>
            {issue.automatable && (
              <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Auto-fixable
              </span>
            )}
            {issue.detectedMetric && (
              <span className="text-xs text-zinc-500">{issue.detectedMetric}</span>
            )}
          </div>
          <p className="font-medium mt-1">{issue.problem}</p>
          <p className="text-sm text-zinc-400 mt-0.5">{issue.reason}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-500 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-zinc-800/50 space-y-3">
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">Impact</p>
            <p className="text-sm text-zinc-300">{issue.impact}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-2">Fix Steps</p>
            <ol className="space-y-1">
              {issue.fixSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-xs flex items-center justify-center text-zinc-400 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          {issue.affectedUrls && issue.affectedUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-1">Affected URLs</p>
              <div className="space-y-0.5">
                {issue.affectedUrls.slice(0, 5).map((url, i) => (
                  <p key={i} className="text-xs text-zinc-500 font-mono truncate">{url}</p>
                ))}
                {issue.affectedUrls.length > 5 && (
                  <p className="text-xs text-zinc-600">+{issue.affectedUrls.length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FixerReportPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<AIFixReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [websiteName, setWebsiteName] = useState('');

  useEffect(() => {
    loadReport();
    fetch(`/api/websites/${websiteId}`)
      .then((r) => r.json())
      .then((d) => d.success && setWebsiteName(d.data.name));
  }, [websiteId]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/seo/fixer/${websiteId}`);
      const data = await res.json();
      if (data.success) setReport(data.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`/api/seo/fixer/${websiteId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      } else {
        alert(data.error || 'Analysis failed');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const filteredIssues = report?.issues.filter((i) =>
    activeTab === 'all' || i.severity === activeTab
  ) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/seo/fixer')} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                  AI Fixer Report
                </h1>
                <p className="text-zinc-400 mt-1">{websiteName || websiteId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {report && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Clock className="h-4 w-4" />
                  Last run: {new Date(report.triggeredAt).toLocaleString()}
                  {report.tokenCount && (
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded">
                      {report.tokenCount} tokens
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={handleRunAnalysis}
                disabled={isRunning}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-60"
              >
                {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isRunning ? 'Analysing...' : 'Re-run Analysis'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!report ? (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center text-zinc-500">
          <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
          <p className="text-lg font-medium">No analysis yet</p>
          <p className="text-sm mb-6">Run an AI analysis to get a health report for this website.</p>
          <button onClick={handleRunAnalysis} disabled={isRunning} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white disabled:opacity-60">
            {isRunning ? 'Running...' : 'Run Analysis'}
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Top Section: Score + Summary + Data Snapshot */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Health Score */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center">
              <HealthGaugeLarge score={report.healthScore} />
              {report.healthScoreDelta !== undefined && (
                <div className={`flex items-center gap-1 text-sm mt-3 ${
                  report.healthScoreDelta > 0 ? 'text-emerald-400' :
                  report.healthScoreDelta < 0 ? 'text-red-400' : 'text-zinc-400'
                }`}>
                  {report.healthScoreDelta > 0 ? <TrendingUp className="h-4 w-4" /> : report.healthScoreDelta < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                  {report.healthScoreDelta > 0 ? '+' : ''}{report.healthScoreDelta} from last run
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                {[
                  { label: 'Critical', value: report.criticalCount, color: 'red' },
                  { label: 'High', value: report.highCount, color: 'orange' },
                  { label: 'Medium', value: report.mediumCount, color: 'yellow' },
                  { label: 'Low', value: report.lowCount, color: 'zinc' },
                ].map((c) => (
                  <div key={c.label} className={`text-center p-2 bg-${c.color}-900/20 rounded`}>
                    <p className={`text-lg font-bold text-${c.color}-400`}>{c.value}</p>
                    <p className="text-xs text-zinc-500">{c.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                AI Summary
              </h2>
              <p className="text-zinc-300 text-sm leading-relaxed">{report.summary}</p>
            </div>

            {/* Data Snapshot */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-400" />
                Data Snapshot (30d)
              </h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Clicks', value: report.dataSnapshot.gscClicks.toLocaleString() },
                  { label: 'Avg Position', value: report.dataSnapshot.gscAvgPosition.toFixed(1) },
                  { label: 'Indexed Pages', value: report.dataSnapshot.indexedPages },
                  { label: 'Crawl Errors', value: report.dataSnapshot.crawlErrors },
                  { label: 'LCP', value: `${report.dataSnapshot.lcp}ms` },
                  { label: 'Uptime', value: `${report.dataSnapshot.uptimePercent}%` },
                  { label: 'Avg Latency', value: `${report.dataSnapshot.avgLatencyMs}ms` },
                  { label: 'Rank Drops', value: report.dataSnapshot.rankingDropKeywords },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-zinc-400">{row.label}</span>
                    <span className="font-mono font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Issues */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Detected Issues ({report.issueCount})</h2>
              <div className="flex bg-zinc-800 rounded-lg p-1">
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 text-sm rounded capitalize ${
                      activeTab === tab ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab}
                    {tab !== 'all' && (
                      <span className="ml-1 text-xs">
                        ({report[`${tab}Count` as 'criticalCount' | 'highCount' | 'mediumCount' | 'lowCount']})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-600" />
                <p>No {activeTab === 'all' ? '' : activeTab} issues detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} />
                ))}
              </div>
            )}
          </div>

          {/* Quick Wins + Long Term */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                <Zap className="h-5 w-5" />
                Quick Wins
                <span className="text-xs text-zinc-500 font-normal">Low effort, high impact</span>
              </h2>
              {report.quickWins.length === 0 ? (
                <p className="text-zinc-500 text-sm">No quick wins identified for this website.</p>
              ) : (
                <ul className="space-y-3">
                  {report.quickWins.map((win, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {win}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2 text-blue-400">
                <TrendingUp className="h-5 w-5" />
                Long-Term Improvements
              </h2>
              {report.longTermImprovements.length === 0 ? (
                <p className="text-zinc-500 text-sm">No long-term improvements identified.</p>
              ) : (
                <ul className="space-y-3">
                  {report.longTermImprovements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-blue-900/40 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

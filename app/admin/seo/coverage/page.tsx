'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSearch, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, Search, ExternalLink, Clock, Smartphone, Monitor,
  Send, X, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Website {
  _id: string;
  name: string;
  domain: string;
}

interface CoverageSummary {
  total: number;
  indexed: number;
  notIndexed: number;
}

interface VerdictBreakdown {
  PASS: number;
  FAIL: number;
  NEUTRAL: number;
  UNKNOWN: number;
}

interface CoverageBreakdownItem {
  _id: string;
  count: number;
}

interface WebsiteStat {
  _id: string;
  total: number;
  indexed: number;
  notIndexed: number;
  websiteName: string;
  websiteDomain: string;
}

interface AggregateData {
  summary: CoverageSummary;
  verdictBreakdown: VerdictBreakdown;
  coverageBreakdown: CoverageBreakdownItem[];
  websiteStats: WebsiteStat[];
  lastScanAt: { lastInspectedAt: string } | null;
}

interface URLEntry {
  _id: string;
  url: string;
  verdict: string;
  coverageState: string;
  robotsTxtState: string;
  indexingState: string;
  pageFetchState: string;
  crawledAs: string;
  lastCrawlTime: string;
  mobileUsability: string;
  lastInspectedAt: string;
  inspectionCount: number;
}

interface PerSiteData {
  urls: URLEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: CoverageSummary;
  verdictBreakdown: VerdictBreakdown;
  coverageBreakdown: CoverageBreakdownItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COVERAGE_COLORS: Record<string, string> = {
  'Submitted and indexed': '#10b981',
  'Crawled - currently not indexed': '#eab308',
  'Discovered - currently not indexed': '#f59e0b',
  'Not found (404)': '#ef4444',
  'Soft 404': '#f43f5e',
  'Page with redirect': '#f97316',
  'Duplicate without user-selected canonical': '#f87171',
  'Duplicate, Google chose different canonical than user': '#fca5a5',
  'Excluded by noindex tag': '#71717a',
  'Blocked by robots.txt': '#dc2626',
  'Server error (5xx)': '#b91c1c',
  'Alternate page with proper canonical tag': '#60a5fa',
};

const COVERAGE_TAILWIND: Record<string, string> = {
  'Submitted and indexed': 'bg-emerald-500',
  'Crawled - currently not indexed': 'bg-yellow-500',
  'Discovered - currently not indexed': 'bg-amber-500',
  'Not found (404)': 'bg-red-500',
  'Soft 404': 'bg-rose-500',
  'Page with redirect': 'bg-orange-500',
  'Duplicate without user-selected canonical': 'bg-red-400',
  'Duplicate, Google chose different canonical than user': 'bg-red-300',
  'Excluded by noindex tag': 'bg-zinc-500',
  'Blocked by robots.txt': 'bg-red-600',
  'Server error (5xx)': 'bg-red-700',
  'Alternate page with proper canonical tag': 'bg-blue-400',
};

const VERDICT_BADGE: Record<string, { bg: string; text: string }> = {
  PASS: { bg: 'bg-emerald-900/40', text: 'text-emerald-400' },
  FAIL: { bg: 'bg-red-900/40', text: 'text-red-400' },
  NEUTRAL: { bg: 'bg-yellow-900/40', text: 'text-yellow-400' },
  UNKNOWN: { bg: 'bg-zinc-800', text: 'text-zinc-400' },
};

const ALL_COVERAGE_STATES = [
  'Submitted and indexed',
  'Crawled - currently not indexed',
  'Discovered - currently not indexed',
  'Not found (404)',
  'Soft 404',
  'Page with redirect',
  'Duplicate without user-selected canonical',
  'Excluded by noindex tag',
  'Blocked by robots.txt',
  'Server error (5xx)',
];

const ALL_VERDICTS = ['PASS', 'FAIL', 'NEUTRAL', 'UNKNOWN'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getColor(state: string): string {
  return COVERAGE_COLORS[state] ?? '#a1a1aa';
}

function getTwBg(state: string): string {
  return COVERAGE_TAILWIND[state] ?? 'bg-zinc-400';
}

function pct(n: number, total: number): string {
  if (!total) return '0';
  return ((n / total) * 100).toFixed(1);
}

function relativeDate(iso: string): string {
  if (!iso) return '--';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function truncateUrl(url: string, max = 60): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (path.length <= max) return path;
    return path.slice(0, max - 3) + '...';
  } catch {
    return url.length > max ? url.slice(0, max - 3) + '...' : url;
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
    >
      <p className="text-sm text-zinc-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold text-${color}-400`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const v = VERDICT_BADGE[verdict] ?? VERDICT_BADGE.UNKNOWN;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${v.bg} ${v.text}`}>
      {verdict === 'PASS' && <CheckCircle2 className="h-3 w-3" />}
      {verdict === 'FAIL' && <XCircle className="h-3 w-3" />}
      {verdict}
    </span>
  );
}

function MobileBadge({ status }: { status: string }) {
  const pass = status === 'PASS';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${pass ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
      <Smartphone className="h-3 w-3" />
      {status}
    </span>
  );
}

function CrawledAsBadge({ agent }: { agent: string }) {
  const mobile = agent?.toUpperCase().includes('MOBILE');
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
      {mobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
      {mobile ? 'Mobile' : 'Desktop'}
    </span>
  );
}

// Scan confirmation modal
function ScanModal({
  websiteName,
  onConfirm,
  onClose,
}: {
  websiteName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Scan Now</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>
        <p className="text-sm text-zinc-400 mb-2">
          This will discover all pages from GSC &amp; sitemaps, then inspect up to{' '}
          <span className="text-white font-medium">50 URLs</span> for{' '}
          <span className="text-white font-medium">{websiteName}</span>.
        </p>
        <p className="text-xs text-zinc-500 mb-6">
          Uses Google API quota (2,000/day). Each inspection consumes one quota unit.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <FileSearch className="h-4 w-4" />
            Start Scan
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Scan progress overlay
function ScanProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
      >
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-4" />
        <p className="font-semibold text-lg mb-2">Scanning URLs...</p>
        <p className="text-sm text-zinc-400">
          Inspecting URL {current} of {total}
        </p>
        <div className="w-full bg-zinc-800 rounded-full h-2 mt-4">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </motion.div>
    </div>
  );
}

// Indexing results modal
function IndexingResultsModal({
  results,
  onClose,
}: {
  results: { url: string; success: boolean; message?: string }[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[70vh] overflow-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Indexing Results</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-zinc-800/50">
              {r.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate text-zinc-300">{r.url}</p>
                {r.message && <p className="text-xs text-zinc-500">{r.message}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PageCoveragePage() {
  // State — global
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Aggregate view
  const [aggData, setAggData] = useState<AggregateData | null>(null);

  // Per-site view
  const [siteData, setSiteData] = useState<PerSiteData | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filterState, setFilterState] = useState('');
  const [filterVerdict, setFilterVerdict] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // Scan
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);
  const [scanError, setScanError] = useState('');

  // Indexing
  const [isRequestingIndexing, setIsRequestingIndexing] = useState(false);
  const [indexingResults, setIndexingResults] = useState<{ url: string; success: boolean; message?: string }[] | null>(null);

  // Dropdown open
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  // ------ Fetch websites ------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/domains');
        const data = await res.json();
        if (data.success) {
          setWebsites(Array.isArray(data.data) ? data.data : data.data?.websites ?? []);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // ------ Fetch coverage data ------
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!selectedWebsiteId) {
        // Aggregate
        const res = await fetch('/api/seo/coverage');
        const json = await res.json();
        if (json.success) {
          setAggData(json.data);
          setSiteData(null);
        }
      } else {
        // Per-site
        const params = new URLSearchParams({
          websiteId: selectedWebsiteId,
          page: String(page),
          limit: String(limit),
        });
        if (filterState) params.set('coverageState', filterState);
        if (filterVerdict) params.set('verdict', filterVerdict);
        if (searchQuery) params.set('search', searchQuery);
        const res = await fetch(`/api/seo/coverage?${params}`);
        const json = await res.json();
        if (json.success) {
          setSiteData(json.data);
          setAggData(null);
        }
      }
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [selectedWebsiteId, page, limit, filterState, filterVerdict, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset filters when switching website
  useEffect(() => {
    setPage(1);
    setFilterState('');
    setFilterVerdict('');
    setSearchQuery('');
    setSelectedUrls(new Set());
  }, [selectedWebsiteId]);

  // ------ Scan now ------
  const handleScan = async () => {
    setShowScanModal(false);
    const wsId = selectedWebsiteId || websites[0]?._id;
    if (!wsId) return;

    setScanProgress({ current: 0, total: 10 });
    setScanError('');
    try {
      const res = await fetch('/api/seo/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId: wsId }),
      });
      const json = await res.json();

      if (!json.success) {
        setScanError(json.error || 'Scan failed. Make sure GSC is connected for this website.');
        setScanProgress(null);
        return;
      }

      const results = json.data?.results || [];
      const total = results.length || 1;
      for (let i = 1; i <= total; i++) {
        setScanProgress({ current: i, total });
        await new Promise((r) => setTimeout(r, 200));
      }

      // Auto-select the scanned website to show results
      if (!selectedWebsiteId) {
        setSelectedWebsiteId(wsId);
      }
    } catch {
      setScanError('Network error. Please try again.');
    }
    setScanProgress(null);
    fetchData();
  };

  // ------ Request indexing ------
  const handleRequestIndexing = async () => {
    if (selectedUrls.size === 0 || !selectedWebsiteId) return;
    setIsRequestingIndexing(true);
    try {
      const res = await fetch('/api/seo/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: selectedWebsiteId,
          urls: Array.from(selectedUrls),
          type: 'URL_UPDATED',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIndexingResults(json.data?.results ?? [{ url: 'Batch', success: true, message: json.message ?? 'Submitted' }]);
      } else {
        setIndexingResults([{ url: 'Error', success: false, message: json.error ?? 'Request failed' }]);
      }
      setSelectedUrls(new Set());
    } catch {
      setIndexingResults([{ url: 'Error', success: false, message: 'Network error' }]);
    }
    setIsRequestingIndexing(false);
  };

  // ------ Derived ------
  const summary: CoverageSummary = aggData?.summary ?? siteData?.summary ?? { total: 0, indexed: 0, notIndexed: 0 };
  const coverageBreakdown: CoverageBreakdownItem[] = aggData?.coverageBreakdown ?? siteData?.coverageBreakdown ?? [];
  const maxBreakdownCount = useMemo(
    () => Math.max(...coverageBreakdown.map((c) => c.count), 1),
    [coverageBreakdown],
  );
  const selectedWebsite = websites.find((w) => w._id === selectedWebsiteId);
  const lastScanned = aggData?.lastScanAt?.lastInspectedAt;

  const pieData = [
    { name: 'Indexed', value: summary.indexed },
    { name: 'Not Indexed', value: summary.notIndexed },
  ];
  const PIE_COLORS = ['#10b981', '#ef4444'];

  // ------ Coverage breakdown click -> filter ------
  const handleBreakdownClick = (state: string) => {
    if (!selectedWebsiteId) return; // can't filter aggregate
    setFilterState((prev) => (prev === state ? '' : state));
    setPage(1);
  };

  // ------ Toggle URL selection ------
  const toggleUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAllUrls = () => {
    if (!siteData) return;
    if (selectedUrls.size === siteData.urls.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(siteData.urls.map((u) => u.url)));
    }
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Scan modal */}
      <AnimatePresence>
        {showScanModal && (
          <ScanModal
            websiteName={selectedWebsite?.name ?? 'selected website'}
            onConfirm={handleScan}
            onClose={() => setShowScanModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Scan progress */}
      {scanProgress && <ScanProgress current={scanProgress.current} total={scanProgress.total} />}

      {/* Scan error */}
      {scanError && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 flex items-center justify-between">
          <span>{scanError}</span>
          <button onClick={() => setScanError('')} className="text-red-400 hover:text-red-300 ml-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Indexing results */}
      <AnimatePresence>
        {indexingResults && (
          <IndexingResultsModal results={indexingResults} onClose={() => setIndexingResults(null)} />
        )}
      </AnimatePresence>

      {/* ---- Header ---- */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileSearch className="h-6 w-6 text-emerald-400" />
                Page Coverage
              </h1>
              <p className="text-zinc-400 mt-1 text-sm">Google Search Console indexing status</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Website selector */}
              <div className="relative">
                <button
                  onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm min-w-[180px] justify-between"
                >
                  <span className="truncate">{selectedWebsite?.name ?? 'All Websites'}</span>
                  <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${wsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {wsDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-60 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-40 max-h-64 overflow-auto">
                    <button
                      onClick={() => { setSelectedWebsiteId(''); setWsDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 ${!selectedWebsiteId ? 'text-emerald-400 font-medium' : 'text-zinc-300'}`}
                    >
                      All Websites
                    </button>
                    {websites.map((ws) => (
                      <button
                        key={ws._id}
                        onClick={() => { setSelectedWebsiteId(ws._id); setWsDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 ${selectedWebsiteId === ws._id ? 'text-emerald-400 font-medium' : 'text-zinc-300'}`}
                      >
                        <span className="block truncate">{ws.name}</span>
                        <span className="block text-xs text-zinc-500">{ws.domain}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scan now */}
              <button
                onClick={() => setShowScanModal(true)}
                disabled={!!scanProgress}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm disabled:opacity-60"
              >
                {scanProgress ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                Scan Now
              </button>

              {/* Refresh */}
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Last scanned */}
          {lastScanned && (
            <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last scanned {relativeDate(lastScanned)}
            </p>
          )}
        </div>
      </div>

      {/* ---- Body ---- */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* ---- Row 1: Stat cards ---- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Pages" value={summary.total.toLocaleString()} color="zinc" />
              <StatCard
                label="Indexed"
                value={summary.indexed.toLocaleString()}
                sub={`${pct(summary.indexed, summary.total)}% of total`}
                color="emerald"
              />
              <StatCard
                label="Not Indexed"
                value={summary.notIndexed.toLocaleString()}
                sub={`${pct(summary.notIndexed, summary.total)}% of total`}
                color="red"
              />
            </div>

            {/* ---- Row 2: Coverage Issues Breakdown ---- */}
            {coverageBreakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Coverage Issues Breakdown</h2>
                <div className="space-y-2">
                  {coverageBreakdown.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => handleBreakdownClick(item._id)}
                      className={`w-full flex items-center gap-3 text-left group rounded-lg px-3 py-2 transition-colors ${
                        filterState === item._id ? 'bg-zinc-800 ring-1 ring-emerald-600' : 'hover:bg-zinc-800/50'
                      } ${!selectedWebsiteId ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className={`w-3 h-3 rounded-full shrink-0 ${getTwBg(item._id)}`} />
                      <span className="text-sm text-zinc-300 flex-1 truncate">{item._id}</span>
                      <span className="text-sm font-mono text-zinc-400">{item.count.toLocaleString()}</span>
                      <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(item.count / maxBreakdownCount) * 100}%`,
                            backgroundColor: getColor(item._id),
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ---- Row 3: Pie chart ---- */}
            {summary.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Indexed vs Not Indexed</h2>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={3}
                        animationDuration={600}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                        itemStyle={{ color: '#e4e4e7' }}
                        formatter={(value: number, name: string) => [`${value.toLocaleString()} (${pct(value, summary.total)}%)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" /> Indexed ({summary.indexed.toLocaleString()})
                  </span>
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full bg-red-500" /> Not Indexed ({summary.notIndexed.toLocaleString()})
                  </span>
                </div>
              </motion.div>
            )}

            {/* ---- Row 4 (Aggregate): Per-Website Table ---- */}
            {!selectedWebsiteId && aggData?.websiteStats && aggData.websiteStats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold text-zinc-300">Per-Website Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                        <th className="text-left px-5 py-3 font-medium">Website</th>
                        <th className="text-left px-5 py-3 font-medium">Domain</th>
                        <th className="text-right px-5 py-3 font-medium">Total</th>
                        <th className="text-right px-5 py-3 font-medium">Indexed</th>
                        <th className="text-right px-5 py-3 font-medium">Not Indexed</th>
                        <th className="px-5 py-3 font-medium text-left">% Indexed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {aggData.websiteStats.map((ws) => {
                        const indexedPct = ws.total ? (ws.indexed / ws.total) * 100 : 0;
                        return (
                          <tr
                            key={ws._id}
                            className="hover:bg-zinc-800/30 cursor-pointer"
                            onClick={() => setSelectedWebsiteId(ws._id)}
                          >
                            <td className="px-5 py-3 font-medium text-zinc-200">{ws.websiteName}</td>
                            <td className="px-5 py-3 text-zinc-400">{ws.websiteDomain}</td>
                            <td className="px-5 py-3 text-right text-zinc-300">{ws.total.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right text-emerald-400">{ws.indexed.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right text-red-400">{ws.notIndexed.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                    style={{ width: `${indexedPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-400 font-mono">{indexedPct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ---- Per-Site: Filters & URL Table ---- */}
            {selectedWebsiteId && siteData && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Filter className="h-4 w-4" />
                    Filters:
                  </div>

                  {/* Coverage state dropdown */}
                  <select
                    value={filterState}
                    onChange={(e) => { setFilterState(e.target.value); setPage(1); }}
                    className="bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="">All Coverage States</option>
                    {ALL_COVERAGE_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Verdict dropdown */}
                  <select
                    value={filterVerdict}
                    onChange={(e) => { setFilterVerdict(e.target.value); setPage(1); }}
                    className="bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="">All Verdicts</option>
                    {ALL_VERDICTS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>

                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search URLs..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="w-full bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 placeholder-zinc-500"
                    />
                  </div>

                  {/* Bulk indexing */}
                  {selectedUrls.size > 0 && (
                    <button
                      onClick={handleRequestIndexing}
                      disabled={isRequestingIndexing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {isRequestingIndexing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Request Indexing ({selectedUrls.size})
                    </button>
                  )}
                </div>

                {/* URL Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                          <th className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={siteData.urls.length > 0 && selectedUrls.size === siteData.urls.length}
                              onChange={toggleAllUrls}
                              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-600"
                            />
                          </th>
                          <th className="text-left px-4 py-3 font-medium">URL</th>
                          <th className="text-left px-4 py-3 font-medium">Verdict</th>
                          <th className="text-left px-4 py-3 font-medium">Coverage State</th>
                          <th className="text-left px-4 py-3 font-medium">Last Crawl</th>
                          <th className="text-left px-4 py-3 font-medium">Crawled As</th>
                          <th className="text-left px-4 py-3 font-medium">Mobile</th>
                          <th className="text-left px-4 py-3 font-medium">Inspected</th>
                          <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {siteData.urls.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-12 text-zinc-500">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                              No URLs found matching your filters
                            </td>
                          </tr>
                        ) : (
                          siteData.urls.map((entry) => (
                            <tr key={entry._id} className="hover:bg-zinc-800/30">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedUrls.has(entry.url)}
                                  onChange={() => toggleUrl(entry.url)}
                                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-600"
                                />
                              </td>
                              <td className="px-4 py-3 max-w-[260px]">
                                <a
                                  href={entry.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-zinc-300 hover:text-emerald-400 flex items-center gap-1 group"
                                  title={entry.url}
                                >
                                  <span className="truncate">{truncateUrl(entry.url)}</span>
                                  <ExternalLink className="h-3 w-3 text-zinc-600 group-hover:text-emerald-400 shrink-0" />
                                </a>
                              </td>
                              <td className="px-4 py-3">
                                <VerdictBadge verdict={entry.verdict} />
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-2 text-xs text-zinc-400">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${getTwBg(entry.coverageState)}`} />
                                  <span className="truncate max-w-[180px]">{entry.coverageState}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                                {relativeDate(entry.lastCrawlTime)}
                              </td>
                              <td className="px-4 py-3">
                                <CrawledAsBadge agent={entry.crawledAs} />
                              </td>
                              <td className="px-4 py-3">
                                <MobileBadge status={entry.mobileUsability} />
                              </td>
                              <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                                {relativeDate(entry.lastInspectedAt)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {entry.verdict !== 'PASS' && (
                                    <button
                                      onClick={() => {
                                        setSelectedUrls(new Set([entry.url]));
                                        handleRequestIndexing();
                                      }}
                                      className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 hover:bg-blue-900/20 rounded"
                                      title="Request Indexing"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {siteData.pagination && siteData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500">
                        Showing {(siteData.pagination.page - 1) * siteData.pagination.limit + 1}
                        {' - '}
                        {Math.min(siteData.pagination.page * siteData.pagination.limit, siteData.pagination.total)}
                        {' of '}
                        {siteData.pagination.total.toLocaleString()} URLs
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="p-2 hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: Math.min(siteData.pagination.totalPages, 7) }, (_, i) => {
                          const totalPages = siteData.pagination.totalPages;
                          let pageNum: number;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if (page <= 4) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = page - 3 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-8 h-8 text-xs rounded-lg ${
                                page === pageNum
                                  ? 'bg-emerald-600 text-white font-medium'
                                  : 'hover:bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setPage((p) => Math.min(siteData.pagination.totalPages, p + 1))}
                          disabled={page >= siteData.pagination.totalPages}
                          className="p-2 hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {!isLoading && summary.total === 0 && (
              <div className="text-center py-20 text-zinc-500">
                <FileSearch className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                <p className="text-lg font-medium">No coverage data yet</p>
                <p className="text-sm mt-1 mb-6">Run a scan to inspect your pages in Google Search Console</p>
                <button
                  onClick={() => setShowScanModal(true)}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium"
                >
                  Scan Now
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

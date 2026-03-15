'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Globe,
  FileText,
  DollarSign,
  ShoppingCart,
  KeyRound,
  Activity,
  Users,
  ArrowUpRight,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  PenLine,
  CalendarDays,
  Server,
  Zap,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  websites: { total: number; active: number; pending: number };
  content: {
    total: number;
    published: number;
    draft: number;
    scheduled: number;
    aiGenerated: number;
    manualCount: number;
    aiRatio: number;
    thisWeek: number;
    thisMonth: number;
    byType: Record<string, number>;
    monthlyTrend: { _id: string; count: number; published: number; words: number }[];
  };
  guestPosts: { total: number; published: number; pending: number; expiring: number; expired: number };
  keywords: { total: number };
  revenue: { totalRevenue: number; pendingOrders: number; totalOrders: number; avgOrderValue: number };
  partners: { active: number };
  network: { avgDa: number; avgDr: number; totalTraffic: number; avgTraffic: number; gscConnected: number };
  uptime: { avgUptime: number; totalChecks: number; downCount: number; avgLatency: number };
  domains: {
    expiringSoon: number;
    expired: number;
    providers: { name: string; count: number }[];
  };
  alerts: { type: string; severity: string; message: string; link: string }[];
  recentActivity: {
    _id: string;
    title: string;
    status: string;
    type: string;
    websiteId: { name: string; domain: string };
    createdAt: string;
    isAiGenerated: boolean;
  }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCurrencyFull(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function monthLabel(id: string): string {
  const [y, m] = id.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

const typeLabels: Record<string, string> = {
  blog_post: 'Blog Post',
  guest_post: 'Guest Post',
  page: 'Page',
  landing_page: 'Landing Page',
};

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.06 } },
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-emerald-400">{payload[0].value} posts</p>
    </div>
  );
}

// ─── Circular Gauge ──────────────────────────────────────────────────────────

function CircularGauge({ value, max = 100, size = 120, strokeWidth = 8, color }: {
  value: number; max?: number; size?: number; strokeWidth?: number; color: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

// ─── Mini Circular Progress ──────────────────────────────────────────────────

function MiniCircle({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const size = 48;
  const sw = 4;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {value}
      </span>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
      <SkeletonCard className="h-24" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="h-96" />
        <SkeletonCard className="h-96" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
      <SkeletonCard className="h-64" />
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

const gradients: Record<string, { bg: string; text: string; from: string; to: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', from: 'from-emerald-500/20', to: 'to-emerald-500/5' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    from: 'from-blue-500/20',    to: 'to-blue-500/5' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  from: 'from-purple-500/20',  to: 'to-purple-500/5' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   from: 'from-amber-500/20',   to: 'to-amber-500/5' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    from: 'from-cyan-500/20',    to: 'to-cyan-500/5' },
  green:   { bg: 'bg-green-500/10',   text: 'text-green-400',   from: 'from-green-500/20',   to: 'to-green-500/5' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    from: 'from-rose-500/20',    to: 'to-rose-500/5' },
};

function StatCard({ icon: Icon, label, value, subtitle, subtitleColor, color, link, delay }: {
  icon: any; label: string; value: string; subtitle: string;
  subtitleColor?: string; color: string; link?: string; delay: number;
}) {
  const g = gradients[color] || gradients.emerald;
  const inner = (
    <motion.div
      variants={fadeUp}
      className={`relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:scale-[1.01] transition-all cursor-pointer overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${g.from} ${g.to} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${g.from} ${g.to} ${g.text} mb-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold font-mono text-white">{value}</p>
        <p className={`text-xs mt-1 ${subtitleColor || 'text-zinc-500'}`}>{subtitle}</p>
      </div>
    </motion.div>
  );

  if (link) return <Link href={link}>{inner}</Link>;
  return inner;
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load dashboard');
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-zinc-400">{error || 'Failed to load dashboard data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    websites, content, guestPosts, keywords, revenue, partners,
    network, uptime, domains, alerts, recentActivity,
  } = data;

  const sortedAlerts = [...(alerts || [])].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  const trendData = (content.monthlyTrend || []).map((m) => ({
    name: monthLabel(m._id),
    count: m.count,
    published: m.published,
  }));

  const contentPending = Math.max(0, content.total - content.published - content.draft - content.scheduled);
  const totalProviderCount = (domains.providers || []).reduce((s, p) => s + p.count, 0);

  // Uptime gauge color
  const uptimeColor = uptime.avgUptime >= 99 ? '#34d399' : uptime.avgUptime >= 95 ? '#facc15' : '#f87171';

  const hasRevenue = revenue.totalRevenue > 0 || revenue.totalOrders > 0;

  // Content type bars
  const maxTypeCount = Math.max(...Object.values(content.byType || {}), 1);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-zinc-950">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Overview of your SEO network and operations.</p>
      </motion.div>

      {/* ── Section 1: Top Stats ─────────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6"
      >
        <StatCard icon={Globe} label="Websites" value={websites.total.toLocaleString()}
          subtitle={`+${websites.active} active`} color="emerald" link="/admin/websites" delay={0} />
        <StatCard icon={FileText} label="Posts" value={content.total.toLocaleString()}
          subtitle={`+${content.thisWeek} this week`} color="blue" link="/admin/posts" delay={1} />
        <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(revenue.totalRevenue)}
          subtitle={`${revenue.pendingOrders} pending orders`} color="purple" link="/admin/revenue" delay={2} />
        <StatCard icon={ShoppingCart} label="Orders" value={revenue.totalOrders.toLocaleString()}
          subtitle={`avg ${formatCurrency(revenue.avgOrderValue)}`} color="amber" delay={3} />
        <StatCard icon={KeyRound} label="Keywords" value={formatNumber(keywords.total)}
          subtitle="tracked" color="cyan" link="/admin/keywords" delay={4} />
        <StatCard icon={Activity} label="Uptime" value={`${uptime.avgUptime}%`}
          subtitle={`avg ${uptime.avgLatency}ms latency`} color="green" delay={5} />
        <StatCard icon={Users} label="Guest Posts" value={guestPosts.published.toLocaleString()}
          subtitle={guestPosts.expiring > 0 ? `${guestPosts.expiring} expiring` : 'All good'}
          subtitleColor={guestPosts.expiring > 0 ? 'text-yellow-400' : 'text-zinc-500'}
          color="rose" link="/admin/guest-posts" delay={6} />
      </motion.div>

      {/* ── Section 2: Network Health ────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Network Health</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-zinc-800/40 rounded-lg p-4">
              <MiniCircle value={network.avgDa} color="#34d399" />
              <div>
                <p className="text-xs text-zinc-500">Avg DA</p>
                <p className="text-lg font-bold font-mono text-white">{network.avgDa}<span className="text-xs text-zinc-500">/100</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-zinc-800/40 rounded-lg p-4">
              <MiniCircle value={network.avgDr} color="#60a5fa" />
              <div>
                <p className="text-xs text-zinc-500">Avg DR</p>
                <p className="text-lg font-bold font-mono text-white">{network.avgDr}<span className="text-xs text-zinc-500">/100</span></p>
              </div>
            </div>
            <div className="bg-zinc-800/40 rounded-lg p-4">
              <p className="text-xs text-zinc-500">Total Traffic</p>
              <p className="text-lg font-bold font-mono text-white">{formatNumber(network.totalTraffic)}<span className="text-xs text-zinc-500 ml-1">monthly</span></p>
            </div>
            <div className="bg-zinc-800/40 rounded-lg p-4">
              <p className="text-xs text-zinc-500">GSC Connected</p>
              <p className="text-lg font-bold font-mono text-white">{network.gscConnected}<span className="text-xs text-zinc-500 ml-1">of {websites.total}</span></p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section 3: Content + Revenue ─────────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Content Overview */}
        <motion.div variants={fadeUp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Content Overview</h2>

          {/* Content Status Bar */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Content Status</p>
            <div className="flex rounded-full overflow-hidden h-3 bg-zinc-800">
              {content.published > 0 && (
                <div className="bg-emerald-500" style={{ width: `${(content.published / content.total) * 100}%` }}
                  title={`Published: ${content.published}`} />
              )}
              {content.draft > 0 && (
                <div className="bg-zinc-500" style={{ width: `${(content.draft / content.total) * 100}%` }}
                  title={`Draft: ${content.draft}`} />
              )}
              {content.scheduled > 0 && (
                <div className="bg-blue-500" style={{ width: `${(content.scheduled / content.total) * 100}%` }}
                  title={`Scheduled: ${content.scheduled}`} />
              )}
              {contentPending > 0 && (
                <div className="bg-amber-500" style={{ width: `${(contentPending / content.total) * 100}%` }}
                  title={`Pending: ${contentPending}`} />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Published {content.published}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" /> Draft {content.draft}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Scheduled {content.scheduled}</span>
              {contentPending > 0 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending {contentPending}</span>
              )}
            </div>
          </div>

          {/* AI vs Manual */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">AI vs Manual</p>
            <div className="flex rounded-full overflow-hidden h-3 bg-zinc-800">
              <div className="bg-emerald-500" style={{ width: `${content.aiRatio}%` }} />
              <div className="bg-zinc-600" style={{ width: `${100 - content.aiRatio}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-emerald-400" /> {content.aiRatio}% AI Generated ({content.aiGenerated})</span>
              <span>{content.manualCount} manual</span>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Monthly Trend</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} fill="url(#emeraldGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Content by Type */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">By Type</p>
            <div className="space-y-2">
              {Object.entries(content.byType || {}).map(([key, count]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-24 truncate">{typeLabels[key] || key}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-2">
                    <div className="bg-emerald-500/70 h-2 rounded-full transition-all" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right: Revenue & Partners */}
        <motion.div variants={fadeUp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Revenue &amp; Partners</h2>

          {hasRevenue ? (
            <>
              <div className="bg-zinc-800/40 rounded-lg p-5 text-center">
                <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
                <p className="text-4xl font-bold font-mono text-white">{formatCurrencyFull(revenue.totalRevenue)}</p>
                <p className="text-xs text-zinc-500 mt-1">from {revenue.totalOrders} orders</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/40 rounded-lg p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Avg Order Value</p>
                  <p className="text-xl font-bold font-mono text-white">{formatCurrency(revenue.avgOrderValue)}</p>
                </div>
                <div className="bg-zinc-800/40 rounded-lg p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Active Partners</p>
                  <p className="text-xl font-bold font-mono text-white">{partners.active}</p>
                </div>
              </div>

              {revenue.pendingOrders > 0 && (
                <Link href="/admin/orders?status=pending"
                  className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 hover:bg-amber-500/15 transition-colors">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-amber-400">{revenue.pendingOrders} pending orders</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-400" />
                </Link>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">No revenue data yet</p>
              <p className="text-zinc-600 text-xs mt-1">Revenue will appear here once orders come in.</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Section 4: Alerts + Domains/Uptime ───────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Alerts & Quick Actions */}
        <motion.div variants={fadeUp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Alerts</h2>

          {sortedAlerts.length > 0 ? (
            <div className="space-y-2">
              {sortedAlerts.map((alert, i) => (
                <Link key={i} href={alert.link}
                  className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/60 transition-colors group">
                  {alert.severity === 'critical' && <div className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/30" />}
                  {alert.severity === 'warning' && <div className="w-2 h-2 rounded-full bg-yellow-500 ring-2 ring-yellow-500/30" />}
                  {alert.severity === 'info' && <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />}
                  <span className="text-sm text-zinc-300 flex-1">{alert.message}</span>
                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 py-4 text-center">No alerts right now</p>
          )}

          <div>
            <h3 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/posts/new"
                className="flex items-center gap-2 p-3 bg-zinc-800/40 rounded-lg hover:bg-zinc-800 transition-colors text-sm text-white">
                <PenLine className="h-4 w-4 text-emerald-400" /> Write Post
              </Link>
              <Link href="/admin/posts/new?mode=ai"
                className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-colors text-sm text-white">
                <Sparkles className="h-4 w-4 text-emerald-400" /> Generate with AI
              </Link>
              <Link href="/admin/domains"
                className="flex items-center gap-2 p-3 bg-zinc-800/40 rounded-lg hover:bg-zinc-800 transition-colors text-sm text-white">
                <Globe className="h-4 w-4 text-blue-400" /> View Domains
              </Link>
              <Link href="/admin/posts/calendar"
                className="flex items-center gap-2 p-3 bg-zinc-800/40 rounded-lg hover:bg-zinc-800 transition-colors text-sm text-white">
                <CalendarDays className="h-4 w-4 text-purple-400" /> Content Calendar
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Right: Domains & Uptime */}
        <motion.div variants={fadeUp} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Uptime &amp; Domains</h2>

          {/* Uptime Gauge */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <CircularGauge value={uptime.avgUptime} size={100} strokeWidth={7} color={uptimeColor} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold font-mono text-white">{uptime.avgUptime}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-zinc-500">Avg Latency</p>
                <p className="text-sm font-mono text-white">{uptime.avgLatency}ms</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Down Incidents (30d)</p>
                <p className={`text-sm font-mono ${uptime.downCount > 0 ? 'text-red-400' : 'text-white'}`}>{uptime.downCount}</p>
              </div>
            </div>
          </div>

          {/* Domains */}
          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Domains Expiring Soon</span>
              <span className={`text-sm font-mono ${domains.expiringSoon > 0 ? 'text-yellow-400' : 'text-white'}`}>
                {domains.expiringSoon}
              </span>
            </div>
            {domains.expired > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Expired</span>
                <span className="text-sm font-mono text-red-400">{domains.expired}</span>
              </div>
            )}

            {(domains.providers || []).length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-zinc-500 mb-2">Providers</p>
                <div className="space-y-2">
                  {domains.providers.map((p) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-20 truncate">{p.name}</span>
                      <div className="flex-1 bg-zinc-800 rounded-full h-2">
                        <div className="bg-blue-500/60 h-2 rounded-full" style={{ width: `${totalProviderCount > 0 ? (p.count / totalProviderCount) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-mono text-zinc-400 w-6 text-right">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Section 5: Recent Activity ───────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Recent Activity</h2>
          <Link href="/admin/posts" className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
            View all
          </Link>
        </div>

        {(recentActivity || []).length > 0 ? (
          <div className="space-y-1">
            {recentActivity.slice(0, 10).map((item) => {
              const statusColors: Record<string, string> = {
                published: 'bg-emerald-500',
                draft: 'bg-zinc-500',
                scheduled: 'bg-blue-500',
              };
              const typeBadgeColors: Record<string, string> = {
                blog_post: 'bg-blue-500/10 text-blue-400',
                guest_post: 'bg-purple-500/10 text-purple-400',
                page: 'bg-zinc-700 text-zinc-300',
                landing_page: 'bg-amber-500/10 text-amber-400',
              };

              return (
                <Link key={item._id} href={`/admin/posts/${item._id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${statusColors[item.status] || 'bg-zinc-600'}`} />

                  {/* Title */}
                  <span className="text-sm text-zinc-300 truncate flex-1 min-w-0">
                    {item.title?.length > 50 ? `${item.title.slice(0, 50)}...` : item.title}
                  </span>

                  {/* Type badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${typeBadgeColors[item.type] || 'bg-zinc-700 text-zinc-400'}`}>
                    {typeLabels[item.type] || item.type}
                  </span>

                  {/* AI badge */}
                  {item.isAiGenerated && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </span>
                  )}

                  {/* Website */}
                  <span className="text-xs text-zinc-600 truncate max-w-[100px] hidden md:block">
                    {item.websiteId?.name || item.websiteId?.domain}
                  </span>

                  {/* Time */}
                  <span className="text-xs text-zinc-600 whitespace-nowrap">{relativeTime(item.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500">No recent activity</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

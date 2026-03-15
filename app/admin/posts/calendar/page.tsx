'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  X,
  FileText,
  Sparkles,
  Globe,
  Clock,
  CheckCircle2,
  FileEdit,
  BarChart3,
  TrendingUp,
  Eye,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Website {
  _id: string;
  name: string;
  domain: string;
}

interface CalendarPost {
  _id: string;
  title: string;
  status: 'published' | 'draft' | 'scheduled' | 'pending_review';
  type: string;
  websiteId: { _id: string; name: string } | null;
  categoryId: { _id: string; name: string; color: string } | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  isAiGenerated: boolean;
  wordCount: number;
}

type ViewMode = 'month' | 'week';

type CalendarData = Record<string, CalendarPost[]>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; textColor: string; bgColor: string }> = {
  published: { label: 'Published', dotColor: 'bg-emerald-400', textColor: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/20' },
  scheduled: { label: 'Scheduled', dotColor: 'bg-blue-400', textColor: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/20' },
  draft: { label: 'Draft', dotColor: 'bg-zinc-500', textColor: 'text-zinc-400', bgColor: 'bg-zinc-400/10 border-zinc-400/20' },
  pending_review: { label: 'In Review', dotColor: 'bg-yellow-400', textColor: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/20' },
};

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: Date[] = [];
  const start = new Date(year, month, 1 - startOffset);

  // Always show 6 weeks = 42 cells for consistent grid
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  let mondayOffset = day - 1;
  if (mondayOffset < 0) mondayOffset = 6;
  const monday = new Date(date);
  monday.setDate(monday.getDate() - mondayOffset);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return <span className={`inline-block w-2 h-2 rounded-full ${cfg.dotColor} shrink-0`} />;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.bgColor} ${cfg.textColor}`}>
      {cfg.label}
    </span>
  );
}

function PostPill({ post, onClick }: { post: CalendarPost; onClick: () => void }) {
  const isGuest = post.type === 'guest_post';
  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight text-left w-full truncate transition-colors ${
        isGuest
          ? 'border border-purple-400/40 bg-purple-400/5 text-purple-300 hover:bg-purple-400/10'
          : `${cfg.bgColor} ${cfg.textColor} border hover:brightness-125`
      }`}
    >
      {post.categoryId?.color && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: post.categoryId.color }} />
      )}
      <span className="truncate">{post.title}</span>
    </button>
  );
}

function WeekPostCard({ post }: { post: CalendarPost }) {
  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  return (
    <Link href={`/admin/posts/${post._id}`}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600 transition-all cursor-pointer group"
      >
        <div className="flex items-start gap-2 mb-1.5">
          {post.categoryId?.color && (
            <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: post.categoryId.color }} />
          )}
          <p className="text-xs text-zinc-200 font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {post.title}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={post.status} />
          {post.websiteId && (
            <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{post.websiteId.name}</span>
          )}
          {post.isAiGenerated && <Sparkles className="w-3 h-3 text-amber-400/60" />}
        </div>
      </motion.div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Day Detail Panel
// ---------------------------------------------------------------------------

function DayDetailPanel({
  date,
  posts,
  onClose,
}: {
  date: Date;
  posts: CalendarPost[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto shadow-2xl"
    >
      <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/posts/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Post
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {posts.length === 0 && (
          <div className="py-12 text-center">
            <CalendarDays className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No posts on this day</p>
            <Link
              href="/admin/posts/new"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Post
            </Link>
          </div>
        )}
        {posts.map((post) => {
          const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
          return (
            <Link key={post._id} href={`/admin/posts/${post._id}`}>
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-all cursor-pointer group">
                <div className="flex items-start gap-2.5">
                  {post.categoryId?.color && (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: post.categoryId.color }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium group-hover:text-white transition-colors line-clamp-2">{post.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge status={post.status} />
                      {post.websiteId && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <Globe className="w-3 h-3" />
                          {post.websiteId.name}
                        </span>
                      )}
                      {post.categoryId && (
                        <span className="text-[10px] text-zinc-500">{post.categoryId.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {post.wordCount?.toLocaleString() || 0} words
                      </span>
                      <span className="capitalize">{post.type?.replace(/_/g, ' ')}</span>
                      {post.isAiGenerated && (
                        <span className="flex items-center gap-1 text-amber-400/60">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 mt-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ContentCalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendar, setCalendar] = useState<CalendarData>({});
  const [websites, setWebsites] = useState<Website[]>([]);
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ---- Date navigation ----

  const goNext = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, [viewMode]);

  const goPrev = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'month') return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, [viewMode]);

  const goToday = useCallback(() => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  // ---- Computed date ranges ----

  const { startDate, endDate, headerLabel } = useMemo(() => {
    if (viewMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return {
        startDate: start,
        endDate: end,
        headerLabel: `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`,
      };
    }
    const week = getWeekDays(currentDate);
    return {
      startDate: week[0],
      endDate: week[6],
      headerLabel: formatDateRange(week[0], week[6]),
    };
  }, [currentDate, viewMode]);

  // ---- Grid data ----

  const monthGrid = useMemo(() => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const weekGrid = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // ---- Fetch websites ----

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/domains');
        const data = await res.json();
        if (data.success) setWebsites(data.data || data.domains || []);
      } catch {}
    })();
  }, []);

  // ---- Fetch calendar ----

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      // Extend range slightly for month grid edge days
      const s = new Date(startDate);
      s.setDate(s.getDate() - 7);
      const e = new Date(endDate);
      e.setDate(e.getDate() + 7);

      const params = new URLSearchParams({
        startDate: toDateKey(s),
        endDate: toDateKey(e),
      });
      if (websiteFilter) params.set('websiteId', websiteFilter);

      const res = await fetch(`/api/content/calendar?${params}`);
      const data = await res.json();
      if (data.calendar) setCalendar(data.calendar);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, websiteFilter]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // ---- Stats ----

  const stats = useMemo(() => {
    const monthStart = toDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const monthEnd = toDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
    let totalPosts = 0;
    let scheduledCount = 0;
    const siteCounts: Record<string, { name: string; count: number }> = {};
    const daysWithPosts = new Set<string>();

    for (const [dateKey, posts] of Object.entries(calendar)) {
      if (dateKey >= monthStart && dateKey <= monthEnd) {
        totalPosts += posts.length;
        daysWithPosts.add(dateKey);
        for (const p of posts) {
          if (p.status === 'scheduled') scheduledCount++;
          if (p.websiteId) {
            const sid = p.websiteId._id;
            if (!siteCounts[sid]) siteCounts[sid] = { name: p.websiteId.name, count: 0 };
            siteCounts[sid].count++;
          }
        }
      }
    }

    const weeksInMonth = Math.ceil(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() / 7);
    const avgPerWeek = weeksInMonth > 0 ? (totalPosts / weeksInMonth).toFixed(1) : '0';

    let mostActive = { name: '—', count: 0 };
    for (const s of Object.values(siteCounts)) {
      if (s.count > mostActive.count) mostActive = s;
    }

    return { totalPosts, scheduledCount, avgPerWeek, mostActive };
  }, [calendar, currentDate]);

  // ---- Selected day posts ----

  const selectedDayPosts = useMemo(() => {
    if (!selectedDay) return [];
    return calendar[toDateKey(selectedDay)] || [];
  }, [selectedDay, calendar]);

  // ---- Render ----

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CalendarDays className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Content Calendar</h1>
                <p className="text-xs text-zinc-500">Plan and visualize content across all sites</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'month' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'week' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Website filter */}
              <select
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none cursor-pointer max-w-[180px]"
              >
                <option value="">All Websites</option>
                {websites.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-semibold text-white min-w-[180px] text-center">{headerLabel}</h2>
              <button
                onClick={goNext}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goToday}
                className="ml-2 px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 hover:text-white hover:border-zinc-600 transition-colors"
              >
                Today
              </button>
            </div>

            {isLoading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-zinc-800/50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-6 overflow-x-auto">
            <StatItem icon={<FileText className="w-3.5 h-3.5" />} label="Posts this month" value={String(stats.totalPosts)} />
            <StatItem icon={<Clock className="w-3.5 h-3.5" />} label="Scheduled" value={String(stats.scheduledCount)} color="text-blue-400" />
            <StatItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="Avg posts/week" value={stats.avgPerWeek} />
            <StatItem
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              label="Most active"
              value={stats.mostActive.count > 0 ? `${stats.mostActive.name} (${stats.mostActive.count})` : '—'}
              color="text-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
        <AnimatePresence mode="wait">
          {viewMode === 'month' ? (
            <motion.div
              key={`month-${currentDate.getMonth()}-${currentDate.getFullYear()}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center text-[11px] font-medium text-zinc-500 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 border-l border-t border-zinc-800/50">
                {monthGrid.map((day, idx) => {
                  const key = toDateKey(day);
                  const posts = calendar[key] || [];
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(day, today);
                  const maxVisible = 3;
                  const overflow = posts.length - maxVisible;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDay(day)}
                      className={`relative min-h-[100px] p-1.5 border-r border-b border-zinc-800/50 cursor-pointer transition-colors group ${
                        isCurrentMonth ? 'bg-zinc-950 hover:bg-zinc-900/50' : 'bg-zinc-950/40'
                      } ${isToday ? 'ring-1 ring-inset ring-emerald-400/40' : ''}`}
                    >
                      <span
                        className={`text-[11px] font-medium leading-none ${
                          isToday
                            ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white'
                            : isCurrentMonth
                            ? 'text-zinc-400'
                            : 'text-zinc-700'
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      <div className="mt-1 space-y-0.5">
                        {posts.slice(0, maxVisible).map((post) => (
                          <PostPill
                            key={post._id}
                            post={post}
                            onClick={() => setSelectedDay(day)}
                          />
                        ))}
                        {overflow > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedDay(day); }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 pl-1.5 transition-colors"
                          >
                            +{overflow} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`week-${toDateKey(weekGrid[0])}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-7 gap-3">
                {weekGrid.map((day, idx) => {
                  const key = toDateKey(day);
                  const posts = calendar[key] || [];
                  const isToday = isSameDay(day, today);

                  return (
                    <div key={idx} className="min-h-[300px]">
                      {/* Day header */}
                      <div
                        className={`text-center pb-2 mb-2 border-b ${
                          isToday ? 'border-emerald-400/30' : 'border-zinc-800'
                        }`}
                      >
                        <div className={`text-[11px] font-medium ${isToday ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {DAYS_FULL[idx]}
                        </div>
                        <div
                          className={`text-lg font-semibold mt-0.5 ${
                            isToday
                              ? 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white'
                              : 'text-zinc-300'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </div>

                      {/* Post cards */}
                      <div className="space-y-2">
                        {posts.map((post) => (
                          <WeekPostCard key={post._id} post={post} />
                        ))}
                        {posts.length === 0 && (
                          <div className="py-4 text-center">
                            <p className="text-[10px] text-zinc-700">No posts</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Day Detail side panel */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedDay(null)}
            />
            <DayDetailPanel
              date={selectedDay}
              posts={selectedDayPosts}
              onClose={() => setSelectedDay(null)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-8">
        <div className="flex items-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Published</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-500" /> Draft</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-purple-400/60" /> Guest Post</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Item
// ---------------------------------------------------------------------------

function StatItem({
  icon,
  label,
  value,
  color = 'text-zinc-200',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-zinc-500">{icon}</span>
      <span className="text-[11px] text-zinc-500">{label}:</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

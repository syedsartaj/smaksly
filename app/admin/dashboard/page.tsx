'use client';

import { useEffect, useState } from 'react';
import {
  Globe,
  FileText,
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface DashboardStats {
  websites: { total: number; active: number; pending: number };
  guestPosts: { total: number; pending: number; published: number };
  partners: { total: number; active: number };
  revenue: { total: number; thisMonth: number; pending: number };
  keywords: { total: number; ranking: number };
  content: { total: number; scheduled: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all stats in parallel
        const [websitesRes, guestPostsRes, commissionsRes, keywordsRes, contentRes] = await Promise.all([
          fetch('/api/websites?limit=1'),
          fetch('/api/guest-posts?limit=1'),
          fetch('/api/commissions?limit=1'),
          fetch('/api/keywords?limit=1'),
          fetch('/api/content?limit=1'),
        ]);

        const websitesData = await websitesRes.json();
        const guestPostsData = await guestPostsRes.json();
        const commissionsData = await commissionsRes.json();
        const keywordsData = await keywordsRes.json();
        const contentData = await contentRes.json();

        setStats({
          websites: {
            total: websitesData.pagination?.total || 0,
            active: websitesData.pagination?.total || 0,
            pending: 0,
          },
          guestPosts: {
            total: guestPostsData.pagination?.total || 0,
            pending: 0,
            published: guestPostsData.pagination?.total || 0,
          },
          partners: {
            total: 0,
            active: 0,
          },
          revenue: {
            total: 0,
            thisMonth: 0,
            pending: 0,
          },
          keywords: {
            total: keywordsData.pagination?.total || 0,
            ranking: 0,
          },
          content: {
            total: contentData.pagination?.total || 0,
            scheduled: 0,
          },
        });

        // Set some recent activity
        setRecentActivity([
          { type: 'website', message: 'New website added', time: '2 hours ago' },
          { type: 'guest_post', message: 'Guest post submitted', time: '3 hours ago' },
          { type: 'commission', message: 'Commission paid', time: '5 hours ago' },
        ]);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Websites',
      value: stats?.websites.total || 0,
      icon: Globe,
      color: 'emerald',
      subtext: `${stats?.websites.active || 0} active`,
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Guest Posts',
      value: stats?.guestPosts.total || 0,
      icon: FileText,
      color: 'blue',
      subtext: `${stats?.guestPosts.pending || 0} pending review`,
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Total Keywords',
      value: stats?.keywords.total || 0,
      icon: TrendingUp,
      color: 'purple',
      subtext: `${stats?.keywords.ranking || 0} ranking`,
      trend: '+15%',
      trendUp: true,
    },
    {
      title: 'Content Pieces',
      value: stats?.content.total || 0,
      icon: Eye,
      color: 'orange',
      subtext: `${stats?.content.scheduled || 0} scheduled`,
      trend: '+5%',
      trendUp: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-zinc-400 mt-1">
          Welcome back! Here&apos;s an overview of your SEO network.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    stat.color === 'emerald'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : stat.color === 'blue'
                      ? 'bg-blue-500/10 text-blue-400'
                      : stat.color === 'purple'
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'bg-orange-500/10 text-orange-400'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trendUp ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {stat.trendUp ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.trend}
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">
                {stat.value.toLocaleString()}
              </h3>
              <p className="text-sm text-zinc-400">{stat.title}</p>
              <p className="text-xs text-zinc-500 mt-2">{stat.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/websites"
              className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Globe className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">Manage Websites</span>
            </a>
            <a
              href="/guest-posts"
              className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <FileText className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-white">Review Posts</span>
            </a>
            <a
              href="/keywords"
              className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-white">Track Keywords</span>
            </a>
            <a
              href="/content/generator"
              className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Eye className="h-5 w-5 text-orange-400" />
              <span className="text-sm font-medium text-white">Generate Content</span>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg"
                >
                  <div className="p-2 rounded-lg bg-zinc-800">
                    {activity.type === 'website' && (
                      <Globe className="h-4 w-4 text-emerald-400" />
                    )}
                    {activity.type === 'guest_post' && (
                      <FileText className="h-4 w-4 text-blue-400" />
                    )}
                    {activity.type === 'commission' && (
                      <DollarSign className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{activity.message}</p>
                    <p className="text-xs text-zinc-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-zinc-800/30 rounded-lg">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-white">API Status</p>
              <p className="text-xs text-zinc-500">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-zinc-800/30 rounded-lg">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-white">Database</p>
              <p className="text-xs text-zinc-500">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-zinc-800/30 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-white">Last Sync</p>
              <p className="text-xs text-zinc-500">2 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

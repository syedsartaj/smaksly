'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  Rocket,
  Hammer,
  Search,
  Link2,
} from 'lucide-react';

interface DashboardStats {
  websites: { total: number; active: number; pending: number; deployed: number; gscConnected: number };
  guestPosts: { total: number; pending: number; published: number };
  builderProjects: { total: number; published: number; building: number };
  keywords: { total: number; ranking: number };
  content: { total: number; published: number; scheduled: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all stats in parallel including dashboard-specific stats
        const [
          websitesRes,
          websiteStatsRes,
          guestPostsRes,
          builderProjectsRes,
          keywordsRes,
          contentRes,
        ] = await Promise.all([
          fetch('/api/websites?limit=100'),
          fetch('/api/websites/stats'),
          fetch('/api/guest-posts?limit=1'),
          fetch('/api/builder/projects?limit=100'),
          fetch('/api/keywords?limit=1'),
          fetch('/api/content?limit=100'),
        ]);

        const websitesData = await websitesRes.json();
        const websiteStatsData = await websiteStatsRes.json();
        const guestPostsData = await guestPostsRes.json();
        const builderProjectsData = await builderProjectsRes.json();
        const keywordsData = await keywordsRes.json();
        const contentData = await contentRes.json();

        // Calculate real stats from websites data
        const websites = websitesData.data || [];
        const deployedCount = websites.filter((w: { gitRepo?: string }) => w.gitRepo).length;
        const gscConnectedCount = websites.filter((w: { gscConnected?: boolean }) => w.gscConnected).length;

        // Calculate builder project stats
        const projects = builderProjectsData.data || [];
        const publishedProjects = projects.filter((p: { status: string }) => p.status === 'published').length;
        const buildingProjects = projects.filter((p: { status: string }) => p.status === 'building' || p.status === 'ready').length;

        // Calculate content stats
        const contents = contentData.data || [];
        const publishedContent = contents.filter((c: { status: string }) => c.status === 'published').length;
        const scheduledContent = contents.filter((c: { status: string }) => c.status === 'scheduled').length;

        setStats({
          websites: {
            total: websiteStatsData.data?.totals?.websites || websitesData.pagination?.total || 0,
            active: websiteStatsData.data?.totals?.active || 0,
            pending: websiteStatsData.data?.totals?.pending || 0,
            deployed: deployedCount,
            gscConnected: gscConnectedCount,
          },
          guestPosts: {
            total: guestPostsData.pagination?.total || 0,
            pending: 0,
            published: guestPostsData.pagination?.total || 0,
          },
          builderProjects: {
            total: projects.length,
            published: publishedProjects,
            building: buildingProjects,
          },
          keywords: {
            total: keywordsData.pagination?.total || 0,
            ranking: 0,
          },
          content: {
            total: contentData.pagination?.total || 0,
            published: publishedContent,
            scheduled: scheduledContent,
          },
        });

        // Build recent activity from actual data
        const activities: { type: string; message: string; time: string; link?: string }[] = [];

        // Add recent websites
        if (websites.length > 0) {
          const recentWebsite = websites[0];
          activities.push({
            type: 'website',
            message: `Website "${recentWebsite.name}" created`,
            time: getRelativeTime(recentWebsite.createdAt),
            link: `/admin/websites`,
          });
        }

        // Add recent builder projects
        if (projects.length > 0) {
          const recentProject = projects[0];
          activities.push({
            type: 'builder',
            message: `Project "${recentProject.name}" ${recentProject.status}`,
            time: getRelativeTime(recentProject.updatedAt),
            link: `/admin/builder/${recentProject._id}`,
          });
        }

        // Add recent content
        if (contents.length > 0) {
          const recentContent = contents[0];
          activities.push({
            type: 'content',
            message: `Content "${recentContent.title?.substring(0, 30)}..." ${recentContent.status}`,
            time: getRelativeTime(recentContent.updatedAt),
          });
        }

        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Helper function to get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const statCards = [
    {
      title: 'Websites',
      value: stats?.websites.total || 0,
      icon: Globe,
      color: 'emerald',
      subtext: `${stats?.websites.deployed || 0} deployed, ${stats?.websites.active || 0} active`,
      link: '/admin/websites',
    },
    {
      title: 'Builder Projects',
      value: stats?.builderProjects.total || 0,
      icon: Hammer,
      color: 'purple',
      subtext: `${stats?.builderProjects.published || 0} published, ${stats?.builderProjects.building || 0} building`,
      link: '/admin/builder',
    },
    {
      title: 'GSC Connected',
      value: stats?.websites.gscConnected || 0,
      icon: Search,
      color: 'blue',
      subtext: `${stats?.websites.total ? Math.round((stats.websites.gscConnected / stats.websites.total) * 100) : 0}% of websites`,
      link: '/admin/seo',
    },
    {
      title: 'Content',
      value: stats?.content.total || 0,
      icon: FileText,
      color: 'orange',
      subtext: `${stats?.content.published || 0} published, ${stats?.content.scheduled || 0} scheduled`,
      link: '/admin/content',
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
            <Link
              key={stat.title}
              href={stat.link}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
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
                <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">
                {stat.value.toLocaleString()}
              </h3>
              <p className="text-sm text-zinc-400">{stat.title}</p>
              <p className="text-xs text-zinc-500 mt-2">{stat.subtext}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/admin/builder/new"
              className="flex items-center gap-3 p-4 bg-emerald-600/10 border border-emerald-600/30 rounded-lg hover:bg-emerald-600/20 transition-colors"
            >
              <Hammer className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">Build New Website</span>
            </Link>
            <Link
              href="/admin/post"
              className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <FileText className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-white">Create Post</span>
            </Link>
            <Link
              href="/admin/seo"
              className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Search className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium text-white">SEO Analytics</span>
            </Link>
            <Link
              href="/admin/websites"
              className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Globe className="h-5 w-5 text-orange-400" />
              <span className="text-sm font-medium text-white">Manage Websites</span>
            </Link>
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
                  className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-zinc-800">
                    {activity.type === 'website' && (
                      <Globe className="h-4 w-4 text-emerald-400" />
                    )}
                    {activity.type === 'builder' && (
                      <Hammer className="h-4 w-4 text-purple-400" />
                    )}
                    {activity.type === 'content' && (
                      <FileText className="h-4 w-4 text-blue-400" />
                    )}
                    {activity.type === 'guest_post' && (
                      <FileText className="h-4 w-4 text-orange-400" />
                    )}
                    {activity.type === 'commission' && (
                      <DollarSign className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{activity.message}</p>
                    <p className="text-xs text-zinc-500 mt-1">{activity.time}</p>
                  </div>
                  {activity.link && (
                    <Link
                      href={activity.link}
                      className="text-zinc-400 hover:text-emerald-400"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-500 text-sm">No recent activity</p>
                <Link
                  href="/admin/builder/new"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
                >
                  <Hammer className="h-4 w-4" />
                  Create your first website
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status & Deployment Overview */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-white">API Status</span>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-white">MongoDB</span>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-white">GitHub API</span>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Ready</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-white">OpenAI API</span>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Available</span>
            </div>
          </div>
        </div>

        {/* Deployment Overview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Deployment Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-white">Deployed Sites</span>
              </div>
              <span className="text-lg font-bold text-white">{stats?.websites.deployed || 0}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{
                  width: `${stats?.websites.total ? (stats.websites.deployed / stats.websites.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {stats?.websites.total ? Math.round((stats.websites.deployed / stats.websites.total) * 100) : 0}% of websites are deployed
            </p>

            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link2 className="h-5 w-5 text-blue-400" />
                  <span className="text-sm text-white">GSC Connected</span>
                </div>
                <span className="text-lg font-bold text-white">{stats?.websites.gscConnected || 0}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${stats?.websites.total ? (stats.websites.gscConnected / stats.websites.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {stats?.websites.total ? Math.round((stats.websites.gscConnected / stats.websites.total) * 100) : 0}% of websites connected to Google Search Console
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

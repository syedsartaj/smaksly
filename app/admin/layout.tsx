'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  LayoutDashboard,
  Search,
  Key,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Layout,
  Wand2,
  BookOpen,
  Mail,
  Globe,
  FileText,
  Bell,
  AlertTriangle,
  Clock,
  PenLine,
  FolderTree,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'SEO Control',
    href: '/admin/seo',
    icon: Search,
    children: [
      { name: 'Overview', href: '/admin/seo' },
      { name: 'Search Console', href: '/admin/seo/search-console' },
      { name: 'Analytics', href: '/admin/seo/analytics' },
      { name: 'AI Fixer', href: '/admin/seo/fixer' },
    ],
  },
  {
    name: 'Keywords',
    href: '/admin/keywords',
    icon: Key,
    children: [
      { name: 'Research', href: '/admin/keywords' },
      { name: 'Groups', href: '/admin/keywords/groups' },
      { name: 'Rankings', href: '/admin/keywords/rankings' },
    ],
  },
  {
    name: 'Website Builder',
    href: '/admin/builder',
    icon: Wand2,
    badge: 'AI',
  },
  {
    name: 'Templates',
    href: '/admin/templates',
    icon: Layout,
  },
  {
    name: 'Email',
    href: '/admin/email',
    icon: Mail,
  },
  {
    name: 'Posts',
    href: '/admin/posts',
    icon: PenLine,
    children: [
      { name: 'All Posts', href: '/admin/posts' },
      { name: 'Write New', href: '/admin/posts/new' },
      { name: 'Generate with AI', href: '/admin/posts/new?mode=ai' },
      { name: 'Calendar', href: '/admin/posts/calendar' },
    ],
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: FolderTree,
  },
  {
    name: 'Domains',
    href: '/admin/domains',
    icon: Globe,
  },
  {
    name: 'Guest Posts',
    href: '/admin/guest-posts',
    icon: FileText,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Redirect to login if not authenticated after hydration
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // Fetch notifications
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [hydrated, isAuthenticated]);

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notification-dropdown]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showNotifications]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800">
          {isSidebarOpen && (
            <Link href="/admin/dashboard" className="text-xl font-bold text-white">
              <span className="text-emerald-400">Smak</span>sly
            </Link>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.includes(item.name);

              return (
                <li key={item.name}>
                  {hasChildren ? (
                    <>
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {isSidebarOpen && (
                          <>
                            <span className="flex-1 text-left">{item.name}</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </>
                        )}
                      </button>
                      {isSidebarOpen && isExpanded && (
                        <ul className="mt-1 ml-8 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  pathname === child.href
                                    ? 'text-emerald-400'
                                    : 'text-zinc-500 hover:text-white'
                                }`}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-emerald-600/20 text-emerald-400'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {isSidebarOpen && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email || ''}</p>
              </div>
            )}
            {isSidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top bar with notification bell */}
        <div className="sticky top-0 z-40 flex items-center justify-end h-14 px-6 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800/50">
          <div className="relative" data-notification-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
              }}
              className="relative p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-zinc-500">{unreadCount} unread</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={
                          n.type === 'domain_expiry'
                            ? '/admin/domains'
                            : '/admin/guest-posts'
                        }
                        onClick={() => setShowNotifications(false)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 ${
                          !n.isRead ? 'bg-zinc-800/30' : ''
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                          n.severity === 'critical'
                            ? 'bg-red-500/20 text-red-400'
                            : n.severity === 'warning'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {n.severity === 'critical' ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{n.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{n.message}</p>
                        </div>
                        {!n.isRead && (
                          <div className="mt-2 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </Link>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-zinc-800 flex justify-between">
                    <Link
                      href="/admin/domains"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      View Domains
                    </Link>
                    <Link
                      href="/admin/guest-posts"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      View Guest Posts
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

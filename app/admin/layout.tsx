'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  Search,
  FileText,
  Users,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings,
  FolderTree,
  Key,
  Zap,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Layout,
  Palette,
  PenTool,
  Wand2,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Websites',
    href: '/admin/websites',
    icon: Globe,
    badge: '1000+',
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: FolderTree,
  },
  {
    name: 'SEO Control',
    href: '/admin/seo',
    icon: Search,
    children: [
      { name: 'Overview', href: '/admin/seo' },
      { name: 'Search Console', href: '/admin/seo/search-console' },
      { name: 'Analytics', href: '/admin/seo/analytics' },
      { name: 'Rankings', href: '/admin/seo/rankings' },
      { name: 'Indexing', href: '/admin/seo/indexing' },
    ],
  },
  {
    name: 'Keywords',
    href: '/admin/keywords',
    icon: Key,
  },
  {
    name: 'Content',
    href: '/admin/content',
    icon: FileText,
    children: [
      { name: 'All Content', href: '/admin/content' },
      { name: 'Scheduled', href: '/admin/content/scheduled' },
      { name: 'AI Generator', href: '/admin/content/generator' },
    ],
  },
  {
    name: 'Guest Posts',
    href: '/admin/guest-posts',
    icon: Zap,
    children: [
      { name: 'Submissions', href: '/admin/guest-posts' },
      { name: 'Pending Review', href: '/admin/guest-posts/pending' },
      { name: 'Published', href: '/admin/guest-posts/published' },
      { name: 'Expiring Soon', href: '/admin/guest-posts/expiring' },
    ],
  },
  {
    name: 'Partners',
    href: '/admin/partners',
    icon: Users,
  },
  {
    name: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Commissions',
    href: '/admin/commissions',
    icon: DollarSign,
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
    name: 'Create Post',
    href: '/admin/post',
    icon: PenTool,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
              A
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin</p>
                <p className="text-xs text-zinc-500 truncate">admin@smaksly.com</p>
              </div>
            )}
            {isSidebarOpen && (
              <button className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
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
        {children}
      </main>
    </div>
  );
}

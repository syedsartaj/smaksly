'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Trash2,
  Globe,
  TrendingUp,
  Link as LinkIcon,
  Clock,
  DollarSign,
  FileText,
  Settings,
  BarChart3,
  Check,
  X,
} from 'lucide-react';
import { formatNumber, formatPrice } from '@/lib/utils';

interface WebsiteDetail {
  _id: string;
  name: string;
  domain: string;
  customDomain?: string;
  niche: string;
  categoryId: string;
  category?: { name: string; slug: string };
  tags: string[];
  description: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';

  // SEO
  da: number;
  dr: number;
  traffic: number;
  organicKeywords: number;
  referringDomains: number;
  spamScore: number;

  // Guest Posts
  acceptsGuestPosts: boolean;
  guestPostPrice: number;
  featuredPostPrice?: number;
  doFollow: boolean;
  turnaroundDays: number;
  maxLinksPerPost: number;
  minWordCount: number;
  maxWordCount: number;
  contentGuidelines: string;
  prohibitedTopics: string[];

  // Publishing
  autoPublish: boolean;
  dailyPostLimit: number;
  weeklyPostLimit: number;
  requireApproval: boolean;

  // Deployment
  vercelId?: string;
  gitRepo?: string;

  // GSC
  gscConnected: boolean;
  gaConnected: boolean;

  // Metadata
  country: string;
  language: string;

  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function WebsiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [website, setWebsite] = useState<WebsiteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'guest-posts' | 'content' | 'settings'>('overview');

  useEffect(() => {
    const fetchWebsite = async () => {
      try {
        const res = await fetch(`/api/websites/${id}`);
        const data = await res.json();
        if (data.success) {
          setWebsite(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch website:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebsite();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this website?')) return;

    try {
      const res = await fetch(`/api/websites/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/websites');
      } else {
        alert(data.error || 'Failed to delete website');
      }
    } catch (error) {
      console.error('Failed to delete website:', error);
      alert('Failed to delete website');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Website not found</p>
          <Link href="/websites" className="text-emerald-400 hover:text-emerald-300">
            Back to websites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/websites"
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{website.name}</h1>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[website.status]}`}>
                  {website.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-zinc-400">
                <Globe className="h-4 w-4" />
                <a
                  href={`https://${website.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 flex items-center gap-1"
                >
                  {website.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/websites/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-zinc-800"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(['overview', 'seo', 'guest-posts', 'content', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
                  activeTab === tab
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="col-span-2 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-400">Domain Authority</div>
                  <div className="text-3xl font-bold text-blue-400">{website.da}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-400">Domain Rating</div>
                  <div className="text-3xl font-bold text-purple-400">{website.dr}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-400">Monthly Traffic</div>
                  <div className="text-3xl font-bold text-emerald-400">{formatNumber(website.traffic)}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-400">Keywords</div>
                  <div className="text-3xl font-bold text-orange-400">{formatNumber(website.organicKeywords)}</div>
                </div>
              </div>

              {/* Description */}
              {website.description && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-3">Description</h3>
                  <p className="text-zinc-400">{website.description}</p>
                </div>
              )}

              {/* Tags */}
              {website.tags.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {website.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Guest Post Info */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  Guest Posts
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Accepts Guest Posts</span>
                    {website.acceptsGuestPosts ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : (
                      <X className="h-5 w-5 text-zinc-500" />
                    )}
                  </div>
                  {website.acceptsGuestPosts && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Price</span>
                        <span className="font-medium">{formatPrice(website.guestPostPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Link Type</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${website.doFollow ? 'bg-emerald-900/30 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {website.doFollow ? 'DoFollow' : 'NoFollow'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Turnaround</span>
                        <span>{website.turnaroundDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Word Count</span>
                        <span>{website.minWordCount} - {website.maxWordCount}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Info */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Niche</span>
                    <span>{website.niche}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Category</span>
                    <span>{website.category?.name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Country</span>
                    <span>{website.country}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Language</span>
                    <span>{website.language}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">GSC Connected</span>
                    {website.gscConnected ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">GA Connected</span>
                    {website.gaConnected ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4">Timestamps</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Created</span>
                    <span>{new Date(website.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Updated</span>
                    <span>{new Date(website.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="text-center text-zinc-400 py-12">
            SEO metrics and analytics will be shown here.
            <br />
            Connect Google Search Console to see data.
          </div>
        )}

        {activeTab === 'guest-posts' && (
          <div className="text-center text-zinc-400 py-12">
            Guest post submissions and management will be shown here.
          </div>
        )}

        {activeTab === 'content' && (
          <div className="text-center text-zinc-400 py-12">
            Published content and scheduled posts will be shown here.
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="text-center text-zinc-400 py-12">
            Website settings and configuration will be shown here.
          </div>
        )}
      </div>
    </div>
  );
}

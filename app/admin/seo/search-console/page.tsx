'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  Globe,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  X,
} from 'lucide-react';

interface Website {
  _id: string;
  name: string;
  domain: string;
  gscConnected?: boolean;
}

export default function SearchConsolePage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'connected' | 'not-connected'>('all');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState(true);
  const [copied, setCopied] = useState(false);

  const serviceAccountEmail =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL || 'your-service-account@project.iam.gserviceaccount.com';

  const fetchWebsites = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/websites?limit=100&status=active');
      const data = await res.json();
      if (data.success) setWebsites(data.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  const handleVerify = async (website: Website) => {
    setVerifyingId(website._id);
    try {
      const res = await fetch(
        `/api/seo/metrics?websiteId=${website._id}&period=7d&dimension=date`
      );
      const data = await res.json();

      if (data.success) {
        await fetch(`/api/websites/${website._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gscConnected: true }),
        });
        setWebsites((prev) =>
          prev.map((w) => (w._id === website._id ? { ...w, gscConnected: true } : w))
        );
        setConnectingId(null);
      } else {
        alert(
          data.error ||
            'Verification failed. Make sure you added the service account with Full permission.'
        );
      }
    } catch {
      alert('Verification failed. Please try again.');
    } finally {
      setVerifyingId(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connected = websites.filter((w) => w.gscConnected);
  const notConnected = websites.filter((w) => !w.gscConnected);

  const filtered = websites.filter((w) => {
    const matchesSearch =
      !searchQuery ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'connected' && w.gscConnected) ||
      (filter === 'not-connected' && !w.gscConnected);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Link2 className="h-6 w-6 text-blue-400" />
                Google Search Console
              </h1>
              <p className="text-zinc-400 mt-1">
                Manage GSC connections for all your websites
              </p>
            </div>
            <button
              onClick={fetchWebsites}
              className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl">
                <Globe className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total Websites</p>
                <p className="text-3xl font-bold">{websites.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-emerald-900/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Connected</p>
                <p className="text-3xl font-bold text-emerald-400">{connected.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-amber-900/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 rounded-xl">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Not Connected</p>
                <p className="text-3xl font-bold text-amber-400">{notConnected.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Guide */}
        <div className="bg-zinc-900 border border-blue-900/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedGuide(!expandedGuide)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold">How to Connect Google Search Console</p>
                <p className="text-sm text-zinc-400 mt-0.5">Step-by-step guide to grant access</p>
              </div>
            </div>
            {expandedGuide ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </button>

          {expandedGuide && (
            <div className="border-t border-zinc-800 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
                    <h3 className="font-medium">Open Search Console</h3>
                  </div>
                  <p className="text-sm text-zinc-400 ml-9">
                    Go to Google Search Console and select your website property. If not verified yet, verify using DNS or HTML file.
                  </p>
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 ml-9 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Google Search Console
                  </a>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">2</span>
                    <h3 className="font-medium">Add Service Account</h3>
                  </div>
                  <p className="text-sm text-zinc-400 ml-9">
                    Go to <strong>Settings → Users and permissions</strong> and add this email as a <strong>Full</strong> user:
                  </p>
                  <div className="ml-9 flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
                    <code className="flex-1 text-emerald-400 text-xs break-all">
                      {serviceAccountEmail}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 hover:bg-zinc-700 rounded transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">3</span>
                    <h3 className="font-medium">Verify Connection</h3>
                  </div>
                  <p className="text-sm text-zinc-400 ml-9">
                    After adding the service account, click the <strong>&quot;Connect&quot;</strong> button next to your website below and verify.
                  </p>
                  <div className="ml-9 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg text-xs text-amber-300">
                    It may take a few minutes for Google to grant access after adding the service account.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search websites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'connected' as const, label: 'Connected' },
              { key: 'not-connected' as const, label: 'Not Connected' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Website List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                  <th className="px-5 py-3">Website</th>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">GSC Property</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((website) => (
                  <tr
                    key={website._id}
                    className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium">{website.name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-zinc-400">{website.domain}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {website.gscConnected ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/30 text-emerald-400 text-xs rounded-full font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full font-medium">
                          <XCircle className="h-3.5 w-3.5" />
                          Not Connected
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <a
                        href={`https://search.google.com/search-console/users?resource_id=sc-domain:${website.domain.replace(/^https?:\/\//, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Open GSC <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {website.gscConnected ? (
                        <span className="text-xs text-zinc-500">Active</span>
                      ) : connectingId === website._id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleVerify(website)}
                            disabled={verifyingId === website._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg disabled:opacity-50"
                          >
                            {verifyingId === website._id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Verify
                          </button>
                          <button
                            onClick={() => setConnectingId(null)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConnectingId(website._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg ml-auto"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Connect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                <p>No websites match your search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

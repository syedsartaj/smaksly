'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, AlertTriangle, XCircle, Search, Edit2, X,
  Calendar, Building2, ChevronDown, Check, Loader2, RefreshCw,
} from 'lucide-react';

interface Domain {
  _id: string;
  name: string;
  domain: string;
  customDomain?: string;
  status: string;
  domainProvider?: string;
  domainExpiryDate?: string;
  niche?: string;
  da?: number;
  traffic?: number;
  createdAt: string;
  expiryStatus: 'ok' | 'warning' | 'critical' | 'expired' | 'unknown';
}

const DOMAIN_PROVIDERS = [
  'Hostinger',
  'GoDaddy',
  'Namecheap',
  'Google Domains',
  'Cloudflare',
  'AWS Route 53',
  'Other',
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ok: { label: 'OK', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  warning: { label: 'Expiring', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  expired: { label: 'Expired', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  unknown: { label: 'Unknown', color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/30' },
};

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(date: string | undefined): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(date: string | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getRowBorderClass(expiryStatus: string): string {
  if (expiryStatus === 'expired' || expiryStatus === 'critical') return 'border-l-red-500';
  if (expiryStatus === 'warning') return 'border-l-yellow-500';
  return 'border-l-transparent';
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDomain, setEditDomain] = useState<Domain | null>(null);
  const [editProvider, setEditProvider] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupProgress, setLookupProgress] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/domains');
      const data = await res.json();
      if (data.domains) setDomains(data.domains);
    } catch (err) {
      console.error('Failed to fetch domains:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const filtered = useMemo(() => {
    if (!search.trim()) return domains;
    const q = search.toLowerCase();
    return domains.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.domain.toLowerCase().includes(q) ||
        (d.customDomain && d.customDomain.toLowerCase().includes(q)) ||
        (d.niche && d.niche.toLowerCase().includes(q))
    );
  }, [domains, search]);

  const stats = useMemo(() => {
    const total = domains.length;
    const expiringSoon = domains.filter((d) => d.expiryStatus === 'warning' || d.expiryStatus === 'critical').length;
    const expired = domains.filter((d) => d.expiryStatus === 'expired').length;
    return { total, expiringSoon, expired };
  }, [domains]);

  const openEditModal = (domain: Domain) => {
    setEditDomain(domain);
    setEditProvider(domain.domainProvider || '');
    setEditExpiry(domain.domainExpiryDate ? domain.domainExpiryDate.split('T')[0] : '');
    setSaveMessage(null);
    setProviderDropdownOpen(false);
  };

  const handleSave = async () => {
    if (!editDomain) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/domains/${editDomain._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainProvider: editProvider || undefined,
          domainExpiryDate: editExpiry || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSaveMessage({ type: 'success', text: 'Domain updated successfully' });
      await fetchDomains();
      setTimeout(() => setEditDomain(null), 800);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to update domain' });
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch WHOIS data for all domains via RDAP
  const handleFetchAll = async () => {
    setIsLookingUp(true);
    setLookupProgress('Looking up domain info...');
    try {
      const res = await fetch('/api/admin/domains/rdap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.summary) {
        setLookupProgress(
          `Done! Updated ${data.summary.updated} of ${data.summary.total} domains${data.summary.skipped ? `, ${data.summary.skipped} skipped (Vercel subdomains)` : ''}${data.summary.errors ? `, ${data.summary.errors} errors` : ''}`
        );
      }
      await fetchDomains();
      setTimeout(() => setLookupProgress(''), 5000);
    } catch {
      setLookupProgress('Failed to fetch WHOIS data');
      setTimeout(() => setLookupProgress(''), 3000);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Refresh single domain
  const handleRefreshSingle = async (websiteId: string) => {
    setRefreshingId(websiteId);
    try {
      await fetch('/api/admin/domains/rdap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId }),
      });
      await fetchDomains();
    } catch {}
    setRefreshingId(null);
  };

  const statCards = [
    {
      label: 'Total Domains',
      value: stats.total,
      icon: Globe,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Expiring Soon',
      value: stats.expiringSoon,
      icon: AlertTriangle,
      gradient: 'from-yellow-500 to-amber-600',
    },
    {
      label: 'Expired',
      value: stats.expired,
      icon: XCircle,
      gradient: 'from-red-500 to-rose-600',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Domains</h1>
          <p className="text-zinc-400">Monitor and manage all your domain registrations</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">{card.label}</p>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search Bar + WHOIS Fetch */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search domains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition"
            />
          </div>
          <button
            onClick={handleFetchAll}
            disabled={isLookingUp}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLookingUp ? 'animate-spin' : ''}`} />
            {isLookingUp ? 'Fetching...' : 'Fetch from WHOIS'}
          </button>
        </div>

        {/* Lookup Progress */}
        {lookupProgress && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 flex items-center gap-2"
          >
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            {lookupProgress}
          </motion.div>
        )}

        {/* Domain Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-xl"
          >
            <Globe className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-lg font-medium">
              {search ? 'No domains match your search' : 'No domains found'}
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              {search ? 'Try a different search term' : 'Domains will appear here once websites are added'}
            </p>
          </motion.div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Domain</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Provider</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Expiry</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Niche</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">DA</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Traffic</th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((d, i) => {
                  const displayDomain = d.customDomain || d.domain;
                  const statusCfg = STATUS_CONFIG[d.expiryStatus] || STATUS_CONFIG.unknown;
                  const days = daysUntil(d.domainExpiryDate);

                  return (
                    <motion.tr
                      key={d._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-l-4 ${getRowBorderClass(d.expiryStatus)} hover:bg-zinc-800/30 transition-colors`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-white font-medium text-sm whitespace-nowrap">{displayDomain}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-zinc-300 text-sm whitespace-nowrap">{d.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-zinc-300 text-sm whitespace-nowrap">{d.domainProvider || '--'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm whitespace-nowrap">
                          <span className="text-zinc-300">{formatDate(d.domainExpiryDate)}</span>
                          {days !== null && (
                            <span className={`block text-xs mt-0.5 ${
                              days < 0 ? 'text-red-400' : days <= 30 ? 'text-yellow-400' : 'text-zinc-500'
                            }`}>
                              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-zinc-400 text-sm whitespace-nowrap">{d.niche || '--'}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-zinc-300 text-sm font-mono">{d.da ?? '--'}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-zinc-300 text-sm font-mono whitespace-nowrap">
                          {d.traffic != null ? formatNumber(d.traffic) : '--'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRefreshSingle(d._id)}
                            disabled={refreshingId === d._id}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            title="Refresh from WHOIS"
                          >
                            <RefreshCw className={`w-4 h-4 ${refreshingId === d._id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => openEditModal(d)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                            title="Edit manually"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editDomain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isSaving && setEditDomain(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Edit Domain</h2>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {editDomain.customDomain || editDomain.domain}
                  </p>
                </div>
                <button
                  onClick={() => setEditDomain(null)}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Provider Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Domain Provider
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-left text-sm text-white hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition"
                    >
                      <span className={editProvider ? 'text-white' : 'text-zinc-500'}>
                        {editProvider || 'Select provider...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${providerDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {providerDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-10 mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden"
                        >
                          {DOMAIN_PROVIDERS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setEditProvider(p);
                                setProviderDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                                editProvider === p
                                  ? 'bg-emerald-400/10 text-emerald-400'
                                  : 'text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              {p}
                              {editProvider === p && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Expiry / Renewal Date
                  </label>
                  <input
                    type="date"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition [color-scheme:dark]"
                  />
                </div>

                {/* Save Message */}
                <AnimatePresence>
                  {saveMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                        saveMessage.type === 'success'
                          ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                          : 'bg-red-400/10 text-red-400 border border-red-400/20'
                      }`}
                    >
                      {saveMessage.type === 'success' ? (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      {saveMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditDomain(null)}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

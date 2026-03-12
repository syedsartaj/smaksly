'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FolderOpen,
  Trash2,
  ExternalLink,
  Clock,
  Globe,
  RefreshCw,
  Search,
  Settings,
  X,
  Link,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, BuilderProject } from '@/stores/useBuilderStore';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  description?: string;
}

interface VercelDomain {
  name: string;
  verified: boolean;
  verification?: { type: string; domain: string; value: string }[];
  configuredBy?: string;
  dnsRecords?: DnsRecord[];
}

export default function BuilderProjectsPage() {
  const router = useRouter();
  const { projects, setProjects, isLoadingProjects, setLoadingProjects } = useBuilderStore(useShallow((s) => ({
    projects: s.projects,
    setProjects: s.setProjects,
    isLoadingProjects: s.isLoadingProjects,
    setLoadingProjects: s.setLoadingProjects,
  })));

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<BuilderProject | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteProgress, setDeleteProgress] = useState<string[]>([]);

  // Domain modal state
  const [domainModal, setDomainModal] = useState<BuilderProject | null>(null);
  const [domains, setDomains] = useState<VercelDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, { verified: boolean; message: string } | null>>({});

  const fetchProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch('/api/builder/projects');
      const data = await response.json();

      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  }, [setProjects, setLoadingProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Domain management
  const fetchDomains = async (project: BuilderProject) => {
    setIsLoadingDomains(true);
    setDomainError('');
    try {
      const res = await fetch(`/api/builder/projects/${project._id}/domain`);
      const data = await res.json();
      if (data.success) {
        setDomains(data.data.domains || []);
      } else {
        setDomainError(data.error || 'Failed to fetch domains');
      }
    } catch {
      setDomainError('Failed to fetch domains');
    } finally {
      setIsLoadingDomains(false);
    }
  };

  const openDomainModal = (project: BuilderProject) => {
    setDomainModal(project);
    setNewDomain('');
    setDomainError('');
    setDomains([]);
    setVerifyResult({});
    fetchDomains(project);
  };

  const handleAddDomain = async () => {
    if (!domainModal || !newDomain.trim()) return;
    setIsAddingDomain(true);
    setDomainError('');
    try {
      const res = await fetch(`/api/builder/projects/${domainModal._id}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDomain('');
        fetchDomains(domainModal);
        fetchProjects();
      } else {
        setDomainError(data.error || 'Failed to add domain');
      }
    } catch {
      setDomainError('Failed to add domain');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!domainModal) return;
    if (!confirm(`Remove domain "${domain}"? This will disconnect it from your site.`)) return;
    setRemovingDomain(domain);
    try {
      const res = await fetch(`/api/builder/projects/${domainModal._id}/domain`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDomains(domainModal);
        fetchProjects();
      } else {
        setDomainError(data.error || 'Failed to remove domain');
      }
    } catch {
      setDomainError('Failed to remove domain');
    } finally {
      setRemovingDomain(null);
    }
  };

  const handleVerifyDomain = async (domain: string) => {
    if (!domainModal) return;
    setVerifyingDomain(domain);
    setVerifyResult((prev) => ({ ...prev, [domain]: null }));
    try {
      const res = await fetch(`/api/builder/projects/${domainModal._id}/domain/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyResult((prev) => ({
          ...prev,
          [domain]: { verified: data.data.verified, message: data.data.message },
        }));
        // Refresh domains to update status
        fetchDomains(domainModal);
      } else {
        setVerifyResult((prev) => ({
          ...prev,
          [domain]: { verified: false, message: data.error || 'Verification failed' },
        }));
      }
    } catch {
      setVerifyResult((prev) => ({
        ...prev,
        [domain]: { verified: false, message: 'Failed to verify DNS' },
      }));
    } finally {
      setVerifyingDomain(null);
    }
  };

  // Delete with full cleanup
  const handleDelete = async (project: BuilderProject) => {
    setDeleteModal(project);
    setDeleteConfirmText('');
    setDeleteProgress([]);
  };

  const confirmDelete = async () => {
    if (!deleteModal || deleteConfirmText !== deleteModal.name) return;

    try {
      setIsDeleting(deleteModal._id);
      setDeleteProgress(['Starting deletion...']);

      const response = await fetch(`/api/builder/projects/${deleteModal._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDeleteProgress(data.cleanup || ['Project deleted']);
        setProjects(projects.filter((p) => p._id !== deleteModal._id));
        setTimeout(() => {
          setDeleteModal(null);
          setDeleteProgress([]);
        }, 2000);
      } else {
        setDeleteProgress((prev) => [...prev, `Error: ${data.error}`]);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setDeleteProgress((prev) => [...prev, 'Unexpected error during deletion']);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      !searchQuery ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.website?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-zinc-700 text-zinc-300',
      building: 'bg-yellow-500/20 text-yellow-400',
      ready: 'bg-blue-500/20 text-blue-400',
      published: 'bg-emerald-500/20 text-emerald-400',
      error: 'bg-red-500/20 text-red-400',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Website Builder</h1>
          <p className="text-zinc-400 mt-1">
            Create and manage AI-powered websites
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/builder/new')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="building">Building</option>
          <option value="ready">Ready</option>
          <option value="published">Published</option>
          <option value="error">Error</option>
        </select>
        <button
          onClick={fetchProjects}
          disabled={isLoadingProjects}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Projects Grid */}
      {isLoadingProjects ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
          <p className="text-zinc-400 mb-6">
            {searchQuery || statusFilter
              ? 'Try adjusting your filters'
              : 'Get started by creating your first project'}
          </p>
          {!searchQuery && !statusFilter && (
            <button
              onClick={() => router.push('/admin/builder/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project: BuilderProject) => (
            <div
              key={project._id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
            >
              {/* Project Preview/Header */}
              <div className="h-32 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center relative">
                <Globe className="h-12 w-12 text-emerald-400/50" />
                {project.status === 'published' && project.deploymentUrl && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-emerald-600/80 rounded-full text-[10px] text-white">
                    <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                    Live
                  </div>
                )}
              </div>

              {/* Project Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white truncate flex-1">
                    {project.name}
                  </h3>
                  {getStatusBadge(project.status)}
                </div>

                {project.website && (
                  <p className="text-sm text-zinc-400 mb-1 truncate">
                    {project.website.domain}
                  </p>
                )}

                {project.deploymentUrl && (
                  <p className="text-xs text-emerald-400/70 mb-2 truncate">
                    {project.deploymentUrl}
                  </p>
                )}

                <div className="flex items-center text-xs text-zinc-500 mb-4">
                  <Clock className="h-3 w-3 mr-1" />
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/admin/builder/${project._id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Open
                  </button>

                  {project.status === 'published' && project.vercelProjectId && (
                    <button
                      onClick={() => openDomainModal(project)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                      title="Domain Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}

                  {project.deploymentUrl && (
                    <a
                      href={project.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors"
                      title="View Live Site"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(project)}
                    disabled={isDeleting === project._id}
                    className="p-2 bg-zinc-800 hover:bg-red-600/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Project"
                  >
                    {isDeleting === project._id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Project</h3>
            </div>

            {deleteProgress.length > 0 ? (
              <div className="space-y-2 mb-4">
                {deleteProgress.map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-zinc-300">{msg}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="text-zinc-400 text-sm mb-4">
                  This will permanently delete <strong className="text-white">{deleteModal.name}</strong> and all associated data:
                </p>
                <ul className="text-sm text-zinc-400 space-y-1 mb-4 ml-4 list-disc">
                  {deleteModal.vercelProjectId && <li>Vercel deployment</li>}
                  {deleteModal.gitRepoName && <li>GitHub repository ({deleteModal.gitRepoName})</li>}
                  <li>All blog posts and content</li>
                  <li>All pages, components, and assets</li>
                </ul>
                <p className="text-sm text-zinc-400 mb-3">
                  Type <strong className="text-red-400">{deleteModal.name}</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteModal.name}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 mb-4"
                  autoFocus
                />
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                {deleteProgress.length > 0 ? 'Close' : 'Cancel'}
              </button>
              {deleteProgress.length === 0 && (
                <button
                  onClick={confirmDelete}
                  disabled={deleteConfirmText !== deleteModal.name || isDeleting === deleteModal._id}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting === deleteModal._id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Everything
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Domain Settings Modal */}
      {domainModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Domain Settings</h3>
                  <p className="text-xs text-zinc-500">{domainModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDomainModal(null)}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add Domain */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Add Custom Domain</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => { setNewDomain(e.target.value); setDomainError(''); }}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                />
                <button
                  onClick={handleAddDomain}
                  disabled={isAddingDomain || !newDomain.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </button>
              </div>
              {domainError && (
                <p className="text-red-400 text-xs mt-2">{domainError}</p>
              )}
            </div>

            {/* Domain List */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Current Domains</label>
              {isLoadingDomains ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                </div>
              ) : domains.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  No domains configured
                </div>
              ) : (
                <div className="space-y-3">
                  {domains.map((d) => (
                    <div
                      key={d.name}
                      className="px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{d.name}</span>
                          {d.verified !== false ? (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full flex-shrink-0">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] rounded-full flex-shrink-0">
                              <AlertTriangle className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <button
                            onClick={() => handleVerifyDomain(d.name)}
                            disabled={verifyingDomain === d.name}
                            className="px-2.5 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Verify DNS"
                          >
                            {verifyingDomain === d.name ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Verify
                          </button>
                          <button
                            onClick={() => handleRemoveDomain(d.name)}
                            disabled={removingDomain === d.name}
                            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Remove domain"
                          >
                            {removingDomain === d.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Verification result */}
                      {verifyResult[d.name] && (
                        <div className={`mt-2 px-2.5 py-1.5 rounded text-xs ${
                          verifyResult[d.name]!.verified
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {verifyResult[d.name]!.verified ? <CheckCircle className="h-3 w-3 inline mr-1" /> : <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          {verifyResult[d.name]!.message}
                        </div>
                      )}

                      {/* DNS Records for this domain */}
                      {d.dnsRecords && d.dnsRecords.length > 0 && d.verified === false && (
                        <div className="mt-2.5 p-2.5 bg-zinc-900 rounded border border-zinc-700/50">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">Required DNS Records</p>
                          <div className="space-y-1.5">
                            {d.dnsRecords.map((r, i) => (
                              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                                <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px] w-14 text-center">{r.type}</span>
                                <span className="text-zinc-400">{r.name}</span>
                                <span className="text-zinc-600">&rarr;</span>
                                <span className="text-emerald-400 select-all">{r.value}</span>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(r.value); }}
                                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                                  title="Copy value"
                                >
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DNS Help */}
            {domains.some((d) => d.verified === false) && (
              <div className="mt-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <p className="text-xs text-zinc-400">
                  Add the DNS records shown above at your domain registrar (Cloudflare, GoDaddy, Namecheap, etc.), then click <strong className="text-zinc-300">Verify</strong> to confirm.
                  DNS changes can take up to 48 hours to propagate.
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setDomainModal(null)}
                className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

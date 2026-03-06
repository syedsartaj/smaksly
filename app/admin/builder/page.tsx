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
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, BuilderProject } from '@/stores/useBuilderStore';

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

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(projectId);
      const response = await fetch(`/api/builder/projects/${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setProjects(projects.filter((p) => p._id !== projectId));
      } else {
        alert(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
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
              <div className="h-32 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                <Globe className="h-12 w-12 text-emerald-400/50" />
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
                  <p className="text-sm text-zinc-400 mb-3 truncate">
                    {project.website.domain}
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
                    onClick={() => handleDelete(project._id)}
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
    </div>
  );
}

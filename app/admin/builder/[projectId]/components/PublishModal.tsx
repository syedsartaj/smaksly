'use client';

import { useState } from 'react';
import { X, Upload, RefreshCw, Github, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useBuilderStore } from '@/stores/useBuilderStore';

interface PublishModalProps {
  onClose: () => void;
}

export function PublishModal({ onClose }: PublishModalProps) {
  const { project, pages, setProject } = useBuilderStore();

  const [commitMessage, setCommitMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    gitRepoUrl?: string;
    deploymentUrl?: string;
    commitHash?: string;
    error?: string;
  } | null>(null);

  const pagesWithCode = pages.filter((p) => p.code && p.code.trim().length > 0);

  const handlePublish = async () => {
    if (!project || pagesWithCode.length === 0) return;

    try {
      setIsPublishing(true);
      setPublishResult(null);

      const response = await fetch(`/api/builder/projects/${project._id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitMessage: commitMessage.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPublishResult({
          success: true,
          gitRepoUrl: data.data.gitRepoUrl,
          deploymentUrl: data.data.deploymentUrl,
          commitHash: data.data.commitHash,
        });

        // Update project in store
        if (project) {
          setProject({
            ...project,
            gitRepoUrl: data.data.gitRepoUrl,
            deploymentUrl: data.data.deploymentUrl,
            lastDeployedAt: new Date().toISOString(),
            status: 'published',
          });
        }
      } else {
        setPublishResult({
          success: false,
          error: data.error || 'Failed to publish',
        });
      }
    } catch (error) {
      console.error('Error publishing:', error);
      setPublishResult({
        success: false,
        error: 'Failed to publish. Please try again.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Publish to GitHub</h2>
              <p className="text-sm text-zinc-400">Deploy your website</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Result */}
          {publishResult?.success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-400 mb-3">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Published Successfully!</span>
              </div>

              <div className="space-y-3">
                {publishResult.gitRepoUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">GitHub Repository:</span>
                    <a
                      href={publishResult.gitRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                    >
                      <Github className="h-4 w-4" />
                      View Repo
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {publishResult.deploymentUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Live Site:</span>
                    <a
                      href={publishResult.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                    >
                      View Site
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {publishResult.commitHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Commit:</span>
                    <span className="text-sm text-zinc-300 font-mono">
                      {publishResult.commitHash.slice(0, 7)}
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Vercel will automatically deploy from GitHub. This may take 1-2 minutes.
              </p>
            </div>
          )}

          {/* Error Result */}
          {publishResult?.success === false && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Publish Failed</span>
              </div>
              <p className="text-sm text-red-400/80">{publishResult.error}</p>
            </div>
          )}

          {/* Pre-publish Info */}
          {!publishResult && (
            <>
              {/* Pages Summary */}
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-300">Pages to publish:</span>
                  <span className="text-sm text-white font-medium">
                    {pagesWithCode.length} / {pages.length}
                  </span>
                </div>

                {pagesWithCode.length === 0 ? (
                  <p className="text-sm text-yellow-400">
                    No pages have code yet. Generate content first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pagesWithCode.map((page) => (
                      <span
                        key={page._id}
                        className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded"
                      >
                        {page.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Existing Repo Info */}
              {project?.gitRepoUrl && (
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 text-zinc-300 mb-2">
                    <Github className="h-4 w-4" />
                    <span className="text-sm">Updating existing repository</span>
                  </div>
                  <a
                    href={project.gitRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-white truncate block"
                  >
                    {project.gitRepoUrl}
                  </a>
                </div>
              )}

              {/* Commit Message */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Commit Message (optional)
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Update from Smaksly Builder"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Info */}
              <div className="text-xs text-zinc-500 space-y-1">
                <p>• All pages and components will be pushed to GitHub</p>
                <p>• Vercel will automatically deploy from the repository</p>
                <p>• Blog data will be fetched from Smaksly at runtime</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            {publishResult?.success ? 'Close' : 'Cancel'}
          </button>

          {!publishResult?.success && (
            <button
              onClick={handlePublish}
              disabled={isPublishing || pagesWithCode.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Publish
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

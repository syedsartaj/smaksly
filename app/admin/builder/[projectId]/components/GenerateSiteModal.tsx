'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Rocket, CheckCircle, AlertCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore } from '@/stores/useBuilderStore';

interface GenerateSiteModalProps {
  onClose: () => void;
}

interface ProgressState {
  step: string;
  detail: string;
  progress: number;
}

const EXAMPLE_PROMPTS = [
  'Build a digital marketing agency website with home, about, services, portfolio, blog, and contact pages. Modern dark theme with green accents.',
  'Create a restaurant website with menu, about us, reservations, gallery, and contact. Warm elegant design.',
  'Build a SaaS landing page with features, pricing, testimonials, FAQ, and blog. Clean minimal design with blue theme.',
  'Create a personal portfolio website for a photographer with gallery, about, services, and contact pages.',
  'Build an e-commerce style landing page for a clothing brand with collections, about, lookbook, and contact.',
];

export function GenerateSiteModal({ onClose }: GenerateSiteModalProps) {
  const { project, loadProject } =
    useBuilderStore(useShallow((s) => ({
      project: s.project,
      loadProject: s.loadProject,
    })));

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ step: '', detail: '', progress: 0 });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    pagesCount: number;
    componentsCount: number;
    errors: string[];
  } | null>(null);

  // Simulate progress updates (since the API is a single POST, we animate progress)
  useEffect(() => {
    if (!isGenerating) return;

    const steps = [
      { delay: 0, step: 'planning', detail: 'Analyzing your requirements...', progress: 5 },
      { delay: 5000, step: 'planning', detail: 'Creating site architecture...', progress: 10 },
      { delay: 10000, step: 'components', detail: 'Designing Header & Footer...', progress: 18 },
      { delay: 20000, step: 'components', detail: 'Generating navigation & layout...', progress: 28 },
      { delay: 30000, step: 'pages', detail: 'Building Home page...', progress: 35 },
      { delay: 45000, step: 'pages', detail: 'Generating inner pages...', progress: 45 },
      { delay: 60000, step: 'pages', detail: 'Creating content sections...', progress: 55 },
      { delay: 80000, step: 'pages', detail: 'Building more pages...', progress: 65 },
      { delay: 100000, step: 'pages', detail: 'Finalizing pages...', progress: 75 },
      { delay: 120000, step: 'pages', detail: 'Polishing content...', progress: 82 },
      { delay: 140000, step: 'pages', detail: 'Almost done...', progress: 88 },
      { delay: 160000, step: 'pages', detail: 'Wrapping up...', progress: 92 },
    ];

    const timers = steps.map(({ delay, ...state }) =>
      setTimeout(() => setProgress(state), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !project) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setProgress({ step: 'planning', detail: 'Starting...', progress: 2 });

    try {
      const response = await fetch(`/api/builder/projects/${project._id}/generate-site`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setProgress({ step: 'complete', detail: 'Site generated!', progress: 100 });

        setResult({
          pagesCount: data.data.pages.length,
          componentsCount: data.data.components.length,
          errors: data.data.errors || [],
        });

        // Reload the project to get fresh data
        await loadProject(project._id);
      } else {
        setError(data.error || 'Failed to generate site');
      }
    } catch (err) {
      console.error('Error generating site:', err);
      setError('Failed to generate site. Please try again.');
      setProgress({ step: '', detail: '', progress: 0 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Entire Website</h2>
              <p className="text-sm text-zinc-400">
                Describe your website and AI will build all pages
              </p>
            </div>
          </div>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Result View */}
          {result && (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Website Generated!</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Created {result.pagesCount} pages and {result.componentsCount} components
              </p>
              {result.errors.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-left">
                  <p className="text-xs text-yellow-400 font-medium mb-1">Warnings:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-yellow-400/80">- {e}</p>
                  ))}
                </div>
              )}
              <button
                onClick={handleDone}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                Start Editing
              </button>
            </div>
          )}

          {/* Progress View */}
          {isGenerating && !result && (
            <div className="py-8">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-zinc-800" />
                  <div
                    className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{progress.progress}%</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-white font-medium mb-1">
                {progress.step === 'planning' && 'Planning Site Architecture'}
                {progress.step === 'components' && 'Building Components'}
                {progress.step === 'pages' && 'Generating Pages'}
              </p>
              <p className="text-center text-sm text-zinc-400">{progress.detail}</p>
              <div className="mt-6 mx-auto max-w-xs">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
              <p className="text-center text-xs text-zinc-600 mt-4">
                This usually takes 1-3 minutes depending on the number of pages
              </p>
            </div>
          )}

          {/* Input View */}
          {!isGenerating && !result && (
            <>
              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Describe Your Website
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Build a digital marketing agency website with home, about, services, blog, and contact pages. Modern design with green accents and dark theme."
                  rows={5}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Be specific: mention pages you want, design style, colors, industry, and any special features.
                </p>
              </div>

              {/* Project Info */}
              {project && (
                <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500">Project</p>
                    <p className="text-sm text-white">{project.name}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Primary</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: project.settings?.primaryColor || '#10b981' }} />
                        <span className="text-xs text-zinc-400">{project.settings?.primaryColor || '#10b981'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Font</p>
                      <p className="text-sm text-zinc-400">{project.settings?.fontFamily || 'Inter'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Examples */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Example prompts (click to use)</p>
                <div className="space-y-2">
                  {EXAMPLE_PROMPTS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example)}
                      className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs rounded-lg transition-colors text-left"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-400/80">
                  This will replace all existing pages and components in this project. Make sure to publish or save your current work first.
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isGenerating && !result && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || prompt.trim().length < 10}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Sparkles className="h-4 w-4" />
              Generate Website
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

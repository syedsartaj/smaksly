'use client';

import { useState } from 'react';
import { X, Sparkles, RefreshCw, Lightbulb, Image as ImageIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, BuilderMedia } from '@/stores/useBuilderStore';
import MediaPickerInline from '@/components/builder/MediaPickerInline';

interface AIPromptModalProps {
  onClose: () => void;
}

const PROMPT_SUGGESTIONS = [
  {
    category: 'Landing Pages',
    prompts: [
      'Modern landing page with hero section, features grid, testimonials, and CTA',
      'SaaS product landing page with pricing table and FAQ section',
      'Creative agency landing page with portfolio showcase',
    ],
  },
  {
    category: 'Content Pages',
    prompts: [
      'About us page with team section, company history, and values',
      'Contact page with form, map placeholder, and contact info cards',
      'Services page with service cards and pricing information',
    ],
  },
  {
    category: 'Blog Pages',
    prompts: [
      'Blog listing page with grid layout, categories sidebar, and pagination',
      'Blog post template with featured image, author bio, and related posts',
      'Blog category page with filtered posts and breadcrumb navigation',
    ],
  },
];

export function AIPromptModal({ onClose }: AIPromptModalProps) {
  const { currentPage, currentComponent, project, setCode, updatePage, updateComponent, setIsGenerating, generatePreview } =
    useBuilderStore(useShallow((s) => ({
      currentPage: s.currentPage,
      currentComponent: s.currentComponent,
      project: s.project,
      setCode: s.setCode,
      updatePage: s.updatePage,
      updateComponent: s.updateComponent,
      setIsGenerating: s.setIsGenerating,
      generatePreview: s.generatePreview,
    })));

  // Determine if we're generating for a page or component
  const isComponentMode = !currentPage && !!currentComponent;
  const targetName = isComponentMode ? currentComponent?.name : currentPage?.name;
  const targetType = isComponentMode ? currentComponent?.type : currentPage?.type;

  const [prompt, setPrompt] = useState(currentPage?.aiPrompt || '');
  const [isGenerating, setLocalIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<BuilderMedia[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!currentPage && !currentComponent) return;

    try {
      setLocalIsGenerating(true);
      setIsGenerating(true);
      setError(null);
      setWarnings([]);

      let response;

      if (isComponentMode && currentComponent) {
        // Generate component
        response = await fetch(`/api/builder/components/${currentComponent._id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: prompt.trim(),
          }),
        });
      } else if (currentPage) {
        // Prepare media references for the AI
        const mediaReferences = selectedMedia.map((m) => ({
          url: m.url,
          name: m.name,
          alt: m.alt || '',
        }));

        response = await fetch(`/api/builder/pages/${currentPage._id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: prompt.trim(),
            mediaReferences: mediaReferences.length > 0 ? mediaReferences : undefined,
          }),
        });
      } else {
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Update the code in the store
        setCode(data.data.code);

        if (isComponentMode && currentComponent) {
          updateComponent(currentComponent._id, {
            code: data.data.code,
          });
        } else if (currentPage) {
          updatePage(currentPage._id, {
            code: data.data.code,
            aiPrompt: prompt.trim(),
            status: 'generated',
          });
        }

        if (data.data.warnings?.length > 0) {
          setWarnings(data.data.warnings);
        }

        // Close modal - BuilderWorkspace's useEffect will auto-trigger preview
        if (!data.data.warnings?.length) {
          onClose();
        }
      } else {
        setError(data.error || `Failed to generate ${isComponentMode ? 'component' : 'page'}`);
        if (data.errors) {
          setError(`${data.error}: ${data.errors.join(', ')}`);
        }
      }
    } catch (error) {
      console.error(`Error generating ${isComponentMode ? 'component' : 'page'}:`, error);
      setError(`Failed to generate ${isComponentMode ? 'component' : 'page'}. Please try again.`);
    } finally {
      setLocalIsGenerating(false);
      setIsGenerating(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Generate {isComponentMode ? 'Component' : 'Page'} with AI
              </h2>
              <p className="text-sm text-zinc-400">
                Describe the {isComponentMode ? 'component' : 'page'} you want to create
              </p>
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
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Current Target Info */}
          {(currentPage || currentComponent) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Generating for:</span>
              <span className="text-white font-medium">{targetName}</span>
              {currentPage && (
                <span className="text-zinc-600">({currentPage.path})</span>
              )}
              <span className={`px-2 py-0.5 text-xs rounded ${
                isComponentMode
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {targetType}
              </span>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {isComponentMode ? 'Component' : 'Page'} Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isComponentMode
                ? "Describe the component you want to create. For headers, mention logo placement, navigation style, colors..."
                : "Describe the page you want to create. Be specific about sections, layout, features, and any specific content..."}
              rows={5}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
              disabled={isGenerating}
            />
            <p className="mt-2 text-xs text-zinc-500">
              Tip: The more detailed your description, the better the result.
              {currentPage?.type === 'blog-listing' &&
                ' Mention how you want blog cards to look and what filters/features to include.'}
              {isComponentMode && currentComponent?.name.toLowerCase().includes('header') &&
                ' The header will use your site logo from branding settings.'}
              {isComponentMode && currentComponent?.name.toLowerCase().includes('footer') &&
                ' The footer will use your site logo from branding settings.'}
            </p>
          </div>

          {/* Media Selection - Only for pages */}
          {!isComponentMode && project && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4 text-zinc-400" />
                <label className="text-sm font-medium text-zinc-300">
                  Attach Images (optional)
                </label>
              </div>
              <MediaPickerInline
                projectId={project._id}
                selectedMedia={selectedMedia}
                onSelect={setSelectedMedia}
                maxItems={5}
              />
              <p className="mt-2 text-xs text-zinc-500">
                Select images to use in this page. The AI will use these URLs in the generated code.
                Mention how to use each image in your description (e.g., &quot;use image1 as hero background&quot;).
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm font-medium mb-2">Warnings:</p>
              <ul className="text-yellow-400/80 text-sm space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Suggestions</span>
            </div>
            <div className="space-y-4">
              {PROMPT_SUGGESTIONS.map((category) => (
                <div key={category.category}>
                  <p className="text-xs text-zinc-500 mb-2">{category.category}</p>
                  <div className="flex flex-wrap gap-2">
                    {category.prompts.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors text-left"
                      >
                        {suggestion.length > 50
                          ? `${suggestion.slice(0, 50)}...`
                          : suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate {isComponentMode ? 'Component' : 'Page'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

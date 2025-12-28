'use client';

import { useEffect, useRef } from 'react';
import { Smartphone, Tablet, Monitor, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { useBuilderStore } from '@/stores/useBuilderStore';

const VIEWPORT_SIZES = {
  mobile: { width: '375px', label: 'Mobile' },
  tablet: { width: '768px', label: 'Tablet' },
  desktop: { width: '100%', label: 'Desktop' },
};

export function PreviewPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const {
    previewHtml,
    isPreviewLoading,
    previewError,
    viewportSize,
    setViewportSize,
    generatePreview,
    project,
  } = useBuilderStore();

  // Update iframe content when preview HTML changes
  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Preview Header */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4">
        <span className="text-sm text-zinc-400">Preview</span>

        <div className="flex items-center gap-2">
          {/* Viewport Size Buttons */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewportSize('mobile')}
              className={`p-1.5 rounded transition-colors ${
                viewportSize === 'mobile'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Mobile (375px)"
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewportSize('tablet')}
              className={`p-1.5 rounded transition-colors ${
                viewportSize === 'tablet'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Tablet (768px)"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewportSize('desktop')}
              className={`p-1.5 rounded transition-colors ${
                viewportSize === 'desktop'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Desktop (100%)"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => generatePreview()}
            disabled={isPreviewLoading}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors disabled:opacity-50"
            title="Refresh Preview"
          >
            <RefreshCw className={`h-4 w-4 ${isPreviewLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Open in new tab */}
          {project?.deploymentUrl && (
            <a
              href={project.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
              title="Open Live Site"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto bg-zinc-800/50">
        {isPreviewLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <RefreshCw className="h-8 w-8 animate-spin mb-4" />
            <p>Generating preview...</p>
          </div>
        ) : previewError ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400 text-center p-4">
            <AlertCircle className="h-8 w-8 mb-4" />
            <p className="font-medium mb-2">Preview Error</p>
            <p className="text-sm text-zinc-500 max-w-md">{previewError}</p>
            <button
              onClick={() => generatePreview()}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !previewHtml ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center">
            <Monitor className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">No Preview Available</p>
            <p className="text-sm">Generate or edit code to see a preview</p>
          </div>
        ) : (
          <div
            className="bg-white rounded-lg shadow-2xl transition-all duration-300 overflow-hidden"
            style={{
              width: VIEWPORT_SIZES[viewportSize].width,
              maxWidth: '100%',
              height: 'calc(100% - 16px)',
            }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Page Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>

      {/* Viewport Size Indicator */}
      <div className="h-6 border-t border-zinc-800 flex items-center justify-center">
        <span className="text-xs text-zinc-500">
          {VIEWPORT_SIZES[viewportSize].label} ({VIEWPORT_SIZES[viewportSize].width})
        </span>
      </div>
    </div>
  );
}

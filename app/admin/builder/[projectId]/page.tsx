'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Save,
  Upload,
  RefreshCw,
  Settings,
  ChevronLeft,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
// react-resizable-panels removed in favor of flex layout for editor/preview/AI panels
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore } from '@/stores/useBuilderStore';
import { EditorPanel } from './components/EditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { FileTree } from './components/FileTree';
import { AIPromptModal } from './components/AIPromptModal';
import { AIEditPanel } from './components/AIEditPanel';
import { PublishModal } from './components/PublishModal';
import { SettingsModal } from './components/SettingsModal';

export default function BuilderWorkspace() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const {
    project,
    currentPage,
    currentComponent,
    code,
    isDirty,
    isLoadingProjects,
    showFileTree,
    showAIPanel,
    selectedCode,
    isGenerating,
    toggleFileTree,
    toggleAIPanel,
    loadProject,
    loadBranding,
    saveCurrentCode,
    generatePreview,
    setSelectedCode,
  } = useBuilderStore(useShallow((s) => ({
    project: s.project,
    currentPage: s.currentPage,
    currentComponent: s.currentComponent,
    code: s.code,
    isDirty: s.isDirty,
    isLoadingProjects: s.isLoadingProjects,
    showFileTree: s.showFileTree,
    showAIPanel: s.showAIPanel,
    selectedCode: s.selectedCode,
    isGenerating: s.isGenerating,
    toggleFileTree: s.toggleFileTree,
    toggleAIPanel: s.toggleAIPanel,
    loadProject: s.loadProject,
    loadBranding: s.loadBranding,
    saveCurrentCode: s.saveCurrentCode,
    generatePreview: s.generatePreview,
    setSelectedCode: s.setSelectedCode,
  })));

  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load project and branding on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
        .then(() => loadBranding(projectId))
        .catch((error) => {
          console.error('Failed to load project:', error);
        });
    }
  }, [projectId, loadProject, loadBranding]);

  // Generate preview when code changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code) {
        generatePreview();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [code, generatePreview]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const success = await saveCurrentCode();
      if (!success) {
        setSaveError('Failed to save');
      }
    } catch (error) {
      setSaveError('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [saveCurrentCode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (isLoadingProjects) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold text-white">Project not found</h2>
          <p className="text-zinc-400">The project you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/admin/builder')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/builder')}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Back to Projects"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-400" />
          </button>

          <div className="h-6 w-px bg-zinc-800" />

          <button
            onClick={toggleFileTree}
            className={`p-2 rounded-lg transition-colors ${
              showFileTree ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800 text-zinc-400'
            }`}
            title={showFileTree ? 'Hide Files' : 'Show Files'}
          >
            {showFileTree ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>

          <div className="text-sm">
            <span className="text-zinc-400">{project.name}</span>
            {currentPage && (
              <>
                <span className="text-zinc-600 mx-2">/</span>
                <span className="text-white">{currentPage.name}</span>
              </>
            )}
            {currentComponent && (
              <>
                <span className="text-zinc-600 mx-2">/</span>
                <span className="text-purple-400">{currentComponent.name}</span>
                <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                  Component
                </span>
              </>
            )}
          </div>

          {isDirty && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
              Unsaved
            </span>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-red-400 text-sm mr-2">{saveError}</span>
          )}

          {/* AI Generate Button */}
          <button
            onClick={() => setShowAIPromptModal(true)}
            disabled={(!currentPage && !currentComponent) || isGenerating}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </button>

          {/* AI Edit Button */}
          <button
            onClick={toggleAIPanel}
            disabled={(!currentPage && !currentComponent) || !code}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showAIPanel
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Sparkles className="h-4 w-4" />
            AI Edit
            {selectedCode && (
              <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded">
                Selection
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-zinc-800" />

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>

          {/* Media Button */}
          <Link
            href={`/admin/builder/${projectId}/media`}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
            title="Media Library"
          >
            <ImageIcon className="h-4 w-4" />
            Media
          </Link>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors"
            title="Project Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Publish Button */}
          <button
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree - Fixed width sidebar */}
        {showFileTree && (
          <div className="w-64 flex-shrink-0 border-r border-zinc-800">
            <FileTree />
          </div>
        )}

        {/* Editor and Preview Panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className={`${showAIPanel ? 'w-[40%]' : 'w-[55%]'} flex-shrink-0 transition-all duration-200`}>
            <EditorPanel
              onSelectionChange={(selection) => setSelectedCode(selection)}
            />
          </div>

          {/* Resize Handle (visual only) */}
          <div className="w-1 bg-zinc-800 flex-shrink-0" />

          {/* Preview */}
          <div className={`${showAIPanel ? 'flex-1 min-w-0' : 'flex-1'} transition-all duration-200`}>
            <PreviewPanel />
          </div>

          {/* AI Edit Panel */}
          {showAIPanel && (
            <>
              <div className="w-1 bg-zinc-800 flex-shrink-0" />
              <div className="w-[320px] flex-shrink-0 overflow-hidden">
                <AIEditPanel onClose={toggleAIPanel} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAIPromptModal && (
        <AIPromptModal onClose={() => setShowAIPromptModal(false)} />
      )}

      {showPublishModal && (
        <PublishModal onClose={() => setShowPublishModal(false)} />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}

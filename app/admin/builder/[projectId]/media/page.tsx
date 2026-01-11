'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  Grid3X3,
  List,
  Search,
  Loader2,
  FolderPlus,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import { useBuilderStore } from '@/stores/useBuilderStore';
import MediaGrid from './components/MediaGrid';
import MediaList from './components/MediaList';
import CategorySidebar from './components/CategorySidebar';
import UploadModal from './components/UploadModal';
import BrandingSection from './components/BrandingSection';

export default function MediaPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const {
    project,
    media,
    mediaCategories,
    mediaViewMode,
    mediaSearchTerm,
    activeCategory,
    isLoadingMedia,
    isUploadingMedia,
    selectedMediaIds,
    branding,
    loadProject,
    loadMedia,
    loadBranding,
    setMediaViewMode,
    setMediaSearchTerm,
    setActiveCategory,
    deleteMedia,
    clearMediaSelection,
  } = useBuilderStore();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBranding, setShowBranding] = useState(true);
  const [searchInput, setSearchInput] = useState('');

  // Load project if not loaded
  useEffect(() => {
    if (!project || project._id !== projectId) {
      loadProject(projectId);
    }
  }, [projectId, project, loadProject]);

  // Load media and branding on mount
  useEffect(() => {
    if (projectId) {
      loadMedia(projectId);
      loadBranding(projectId);
    }
  }, [projectId, loadMedia, loadBranding]);

  // Reload media when category changes
  useEffect(() => {
    if (projectId) {
      loadMedia(projectId, { category: activeCategory, search: mediaSearchTerm });
    }
  }, [projectId, activeCategory, mediaSearchTerm, loadMedia]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setMediaSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setMediaSearchTerm]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedMediaIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedMediaIds.size} item(s)?`
    );
    if (!confirmed) return;

    for (const mediaId of selectedMediaIds) {
      await deleteMedia(mediaId);
    }
    clearMediaSelection();
  }, [selectedMediaIds, deleteMedia, clearMediaSelection]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/builder/${projectId}`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Builder</span>
            </Link>
            <div className="h-6 w-px bg-zinc-700" />
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-emerald-500" />
              Media Library
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {selectedMediaIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedMediaIds.size})
              </button>
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <CategorySidebar
          categories={mediaCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          totalCount={media.length}
        />

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search media..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMediaViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  mediaViewMode === 'grid'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setMediaViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  mediaViewMode === 'list'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Media Grid/List */}
          {isLoadingMedia ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <ImageIcon className="h-16 w-16 mb-4" />
              <p className="text-lg mb-2">No media found</p>
              <p className="text-sm">Upload your first image to get started</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Media
              </button>
            </div>
          ) : mediaViewMode === 'grid' ? (
            <MediaGrid media={media} projectId={projectId} />
          ) : (
            <MediaList media={media} projectId={projectId} />
          )}

          {/* Branding Section */}
          <div className="mt-8 border-t border-zinc-800 pt-6">
            <button
              onClick={() => setShowBranding(!showBranding)}
              className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-emerald-400 transition-colors"
            >
              {showBranding ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
              Branding Settings
            </button>

            {showBranding && (
              <BrandingSection projectId={projectId} />
            )}
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          projectId={projectId}
          categories={mediaCategories}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}

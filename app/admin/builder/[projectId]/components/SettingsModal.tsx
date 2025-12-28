'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Palette, Type, Save, RefreshCw } from 'lucide-react';
import { useBuilderStore } from '@/stores/useBuilderStore';

interface SettingsModalProps {
  onClose: () => void;
}

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'Raleway',
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { project, setProject, generatePreview } = useBuilderStore();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#06b6d4');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [blogEnabled, setBlogEnabled] = useState(true);
  const [postsPerPage, setPostsPerPage] = useState(9);
  const [blogLayout, setBlogLayout] = useState<'grid' | 'list' | 'masonry'>('grid');

  // Initialize form from project
  useEffect(() => {
    if (project) {
      setSiteName(project.settings?.siteName || '');
      setSiteDescription(project.settings?.siteDescription || '');
      setPrimaryColor(project.settings?.primaryColor || '#10b981');
      setSecondaryColor(project.settings?.secondaryColor || '#06b6d4');
      setFontFamily(project.settings?.fontFamily || 'Inter');
      setBlogEnabled(project.blogConfig?.enabled ?? true);
      setPostsPerPage(project.blogConfig?.postsPerPage || 9);
      setBlogLayout(project.blogConfig?.layout || 'grid');
    }
  }, [project]);

  const handleSave = async () => {
    if (!project) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/builder/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...project.settings,
            siteName: siteName.trim(),
            siteDescription: siteDescription.trim(),
            primaryColor,
            secondaryColor,
            fontFamily,
          },
          blogConfig: {
            enabled: blogEnabled,
            postsPerPage,
            layout: blogLayout,
            showCategories: project.blogConfig?.showCategories ?? true,
            showTags: project.blogConfig?.showTags ?? true,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update project in store
        setProject({
          ...project,
          settings: {
            ...project.settings,
            siteName: siteName.trim(),
            siteDescription: siteDescription.trim(),
            primaryColor,
            secondaryColor,
            fontFamily,
          },
          blogConfig: {
            ...project.blogConfig,
            enabled: blogEnabled,
            postsPerPage,
            layout: blogLayout,
          },
        });

        // Regenerate preview with new settings
        generatePreview();

        onClose();
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <Settings className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Project Settings</h2>
              <p className="text-sm text-zinc-400">Configure your website</p>
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
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Site Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-300">Site Information</h3>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Site Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Site Description</label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Design Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Design</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Type className="h-3 w-3 text-zinc-500" />
                <label className="text-xs text-zinc-500">Font Family</label>
              </div>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Blog Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Blog Settings</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={blogEnabled}
                  onChange={(e) => setBlogEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {blogEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Posts per Page</label>
                  <input
                    type="number"
                    value={postsPerPage}
                    onChange={(e) => setPostsPerPage(parseInt(e.target.value) || 9)}
                    min={1}
                    max={50}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Blog Layout</label>
                  <select
                    value={blogLayout}
                    onChange={(e) => setBlogLayout(e.target.value as typeof blogLayout)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="masonry">Masonry</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Palette, Type, Save, RefreshCw, Globe, Share2, Plus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, LanguageConfig } from '@/stores/useBuilderStore';

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
  const { project, setProject, generatePreview } = useBuilderStore(useShallow((s) => ({
    project: s.project,
    setProject: s.setProject,
    generatePreview: s.generatePreview,
  })));

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

  // SEO state
  const [ogImage, setOgImage] = useState('');
  const [twitterCard, setTwitterCard] = useState<'summary' | 'summary_large_image'>('summary_large_image');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [themeColor, setThemeColor] = useState('#10b981');

  // Language state
  const [languages, setLanguages] = useState<LanguageConfig[]>([]);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangDir, setNewLangDir] = useState<'ltr' | 'rtl'>('ltr');

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

      // SEO
      setOgImage(project.settings?.seoMetadata?.ogImage || '');
      setTwitterCard(project.settings?.seoMetadata?.twitterCard || 'summary_large_image');
      setTwitterHandle(project.settings?.seoMetadata?.twitterHandle || '');
      setThemeColor(project.settings?.seoMetadata?.themeColor || '#10b981');

      // Languages
      setLanguages(project.settings?.languages || [{ code: 'en', name: 'English', direction: 'ltr', isDefault: true }]);
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
            seoMetadata: {
              ogImage: ogImage.trim(),
              twitterCard,
              twitterHandle: twitterHandle.trim(),
              themeColor,
            },
            languages,
            defaultLanguage: languages.find((l) => l.isDefault)?.code || 'en',
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
            seoMetadata: {
              ogImage: ogImage.trim(),
              twitterCard,
              twitterHandle: twitterHandle.trim(),
              themeColor,
            },
            languages,
            defaultLanguage: languages.find((l) => l.isDefault)?.code || 'en',
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

          {/* SEO & Social */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">SEO & Social</h3>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">OpenGraph Image URL</label>
              <input
                type="text"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder="https://example.com/og-image.jpg"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Twitter Card Type</label>
                <select
                  value={twitterCard}
                  onChange={(e) => setTwitterCard(e.target.value as typeof twitterCard)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="summary">Summary</option>
                  <option value="summary_large_image">Large Image</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Twitter Handle</label>
                <input
                  type="text"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  placeholder="@yourhandle"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Theme Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-300">Languages</h3>
              </div>
              <button
                onClick={() => setShowAddLanguage(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>

            {/* Language list */}
            <div className="space-y-2">
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{lang.name}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded">{lang.code}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      lang.direction === 'rtl' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {lang.direction.toUpperCase()}
                    </span>
                    {lang.isDefault && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!lang.isDefault && (
                      <>
                        <button
                          onClick={() => {
                            setLanguages(languages.map((l) => ({ ...l, isDefault: l.code === lang.code })));
                          }}
                          className="text-xs text-zinc-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors"
                        >
                          Set Default
                        </button>
                        <button
                          onClick={() => {
                            setLanguages(languages.filter((l) => l.code !== lang.code));
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-700 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add language form */}
            {showAddLanguage && (
              <div className="px-3 py-3 bg-zinc-800/50 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Language Code</label>
                    <input
                      type="text"
                      value={newLangCode}
                      onChange={(e) => {
                        const code = e.target.value.toLowerCase().slice(0, 5);
                        setNewLangCode(code);
                        // Auto-suggest RTL for known RTL languages
                        const rtlCodes = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'];
                        if (rtlCodes.includes(code)) {
                          setNewLangDir('rtl');
                        } else {
                          setNewLangDir('ltr');
                        }
                        // Auto-fill name
                        const nameMap: Record<string, string> = {
                          en: 'English', ar: 'Arabic', fr: 'French', es: 'Spanish', de: 'German',
                          it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese', ja: 'Japanese',
                          ko: 'Korean', hi: 'Hindi', he: 'Hebrew', fa: 'Persian', ur: 'Urdu',
                          tr: 'Turkish', nl: 'Dutch', pl: 'Polish', sv: 'Swedish',
                        };
                        if (nameMap[code]) setNewLangName(nameMap[code]);
                      }}
                      placeholder="e.g. ar"
                      className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={newLangName}
                      onChange={(e) => setNewLangName(e.target.value)}
                      placeholder="e.g. Arabic"
                      className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Direction</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={newLangDir === 'ltr'}
                        onChange={() => setNewLangDir('ltr')}
                        className="text-emerald-500"
                      />
                      <span className="text-xs text-zinc-300">LTR (Left to Right)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={newLangDir === 'rtl'}
                        onChange={() => setNewLangDir('rtl')}
                        className="text-emerald-500"
                      />
                      <span className="text-xs text-zinc-300">RTL (Right to Left)</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newLangCode.trim() || !newLangName.trim()) return;
                      if (languages.some((l) => l.code === newLangCode)) {
                        alert('Language code already exists');
                        return;
                      }
                      setLanguages([...languages, {
                        code: newLangCode.trim(),
                        name: newLangName.trim(),
                        direction: newLangDir,
                        isDefault: languages.length === 0,
                      }]);
                      setShowAddLanguage(false);
                      setNewLangCode('');
                      setNewLangName('');
                      setNewLangDir('ltr');
                    }}
                    disabled={!newLangCode.trim() || !newLangName.trim()}
                    className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                  >
                    Add Language
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLanguage(false);
                      setNewLangCode('');
                      setNewLangName('');
                    }}
                    className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors"
                  >
                    Cancel
                  </button>
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

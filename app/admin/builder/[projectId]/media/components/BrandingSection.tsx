'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Save, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, BrandingSettings } from '@/stores/useBuilderStore';

interface BrandingSectionProps {
  projectId: string;
}

export default function BrandingSection({ projectId }: BrandingSectionProps) {
  const { branding, saveBranding, loadBranding, media, loadMedia, generatePreview } = useBuilderStore(useShallow((s) => ({
    branding: s.branding,
    saveBranding: s.saveBranding,
    loadBranding: s.loadBranding,
    media: s.media,
    loadMedia: s.loadMedia,
    generatePreview: s.generatePreview,
  })));

  const [formData, setFormData] = useState<BrandingSettings>({
    headerLogo: '',
    footerLogo: '',
    websiteIcon: '',
    indexName: '',
    logoAltText: '',
    siteName: '',
    siteDescription: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      headerLogo: branding.headerLogo || '',
      footerLogo: branding.footerLogo || '',
      websiteIcon: branding.websiteIcon || '',
      indexName: branding.indexName || '',
      logoAltText: branding.logoAltText || '',
      siteName: branding.siteName || '',
      siteDescription: branding.siteDescription || '',
    });
  }, [branding]);

  const handleChange = (field: keyof BrandingSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveBranding(projectId, formData);
    setIsSaving(false);

    // Refresh preview with new branding
    if (success) {
      generatePreview();
    }
  };

  const handleSelectMedia = (field: keyof BrandingSettings, url: string) => {
    handleChange(field, url);
    setShowPicker(null);
  };

  const handleClear = (field: keyof BrandingSettings) => {
    handleChange(field, '');
  };

  const renderImageField = (
    label: string,
    field: 'headerLogo' | 'footerLogo' | 'websiteIcon',
    description: string
  ) => {
    const value = formData[field];

    return (
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">
          {label}
        </label>
        <p className="text-xs text-zinc-500 mb-2">{description}</p>

        {value ? (
          <div className="flex items-start gap-3">
            <div className="w-20 h-20 relative bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
              <Image
                src={value}
                alt={label}
                fill
                className="object-contain"
                sizes="80px"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPicker(field)}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  Select from library
                </button>
                <button
                  onClick={() => handleClear(field)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(field)}
            className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Select from Media Library
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column - Images */}
        <div className="space-y-6">
          {renderImageField(
            'Header Logo',
            'headerLogo',
            'Logo displayed in the website header'
          )}

          {renderImageField(
            'Footer Logo',
            'footerLogo',
            'Logo displayed in the website footer (optional, uses header logo if empty)'
          )}

          {renderImageField(
            'Website Icon (Favicon)',
            'websiteIcon',
            'Small icon shown in browser tabs (recommended: 32x32 or 64x64 px)'
          )}
        </div>

        {/* Right Column - Text */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Site Name
            </label>
            <input
              type="text"
              value={formData.siteName}
              onChange={(e) => handleChange('siteName', e.target.value)}
              placeholder="My Website"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Site Description
            </label>
            <textarea
              value={formData.siteDescription}
              onChange={(e) => handleChange('siteDescription', e.target.value)}
              placeholder="A brief description of your website"
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Index Page Title
            </label>
            <p className="text-xs text-zinc-500 mb-2">
              Title for the homepage (appears in browser tab)
            </p>
            <input
              type="text"
              value={formData.indexName}
              onChange={(e) => handleChange('indexName', e.target.value)}
              placeholder="Home | My Website"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Logo Alt Text
            </label>
            <p className="text-xs text-zinc-500 mb-2">
              Alternative text for logo images (for accessibility)
            </p>
            <input
              type="text"
              value={formData.logoAltText}
              onChange={(e) => handleChange('logoAltText', e.target.value)}
              placeholder="Company Logo"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Branding
            </>
          )}
        </button>
      </div>

      {/* Media Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 rounded-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Select Image</h2>
              <button
                onClick={() => setShowPicker(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {media.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3" />
                  <p>No images in library</p>
                  <p className="text-sm">Upload images first to select them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {media
                    .filter((m) => m.type === 'image')
                    .map((item) => (
                      <button
                        key={item._id}
                        onClick={() =>
                          handleSelectMedia(
                            showPicker as keyof BrandingSettings,
                            item.url
                          )
                        }
                        className="aspect-square relative bg-zinc-800 rounded-lg overflow-hidden border-2 border-zinc-700 hover:border-emerald-500 transition-colors"
                      >
                        <Image
                          src={item.url}
                          alt={item.alt || item.name}
                          fill
                          className="object-cover"
                          sizes="100px"
                        />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

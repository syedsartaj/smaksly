'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Save, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, BuilderMedia } from '@/stores/useBuilderStore';

interface EditMediaModalProps {
  media: BuilderMedia;
  onClose: () => void;
}

export default function EditMediaModal({ media, onClose }: EditMediaModalProps) {
  const { updateMedia } = useBuilderStore(useShallow((s) => ({
    updateMedia: s.updateMedia,
  })));

  const [name, setName] = useState(media.name);
  const [alt, setAlt] = useState(media.alt || '');
  const [caption, setCaption] = useState(media.caption || '');
  const [category, setCategory] = useState(media.category || 'general');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateMedia(media._id, {
      name,
      alt,
      caption,
      category,
    });
    setIsSaving(false);

    if (success) {
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 rounded-xl w-full max-w-2xl mx-4 shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Edit Media</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-2 gap-6">
          {/* Preview */}
          <div>
            <div className="aspect-square relative bg-zinc-800 rounded-lg overflow-hidden mb-3">
              <Image
                src={media.url}
                alt={media.alt || media.name}
                fill
                className="object-contain"
                sizes="300px"
              />
            </div>
            <div className="text-sm text-zinc-500 space-y-1">
              <p>
                <span className="text-zinc-400">File:</span> {media.originalName}
              </p>
              <p>
                <span className="text-zinc-400">Size:</span> {formatFileSize(media.size)}
              </p>
              {media.dimensions && (
                <p>
                  <span className="text-zinc-400">Dimensions:</span>{' '}
                  {media.dimensions.width} x {media.dimensions.height}
                </p>
              )}
              <p>
                <span className="text-zinc-400">Type:</span> {media.mimeType}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Alt Text
              </label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe this image for accessibility"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption for this image"
                rows={2}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="general">General</option>
                <option value="branding">Branding</option>
                <option value="gallery">Gallery</option>
                <option value="products">Products</option>
                <option value="blog">Blog</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

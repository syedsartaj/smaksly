'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, MediaCategory } from '@/stores/useBuilderStore';

interface UploadModalProps {
  projectId: string;
  categories: MediaCategory[];
  onClose: () => void;
}

export default function UploadModal({ projectId, categories, onClose }: UploadModalProps) {
  const { uploadMedia, isUploadingMedia } = useBuilderStore(useShallow((s) => ({
    uploadMedia: s.uploadMedia,
    isUploadingMedia: s.isUploadingMedia,
  })));

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState('general');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadMedia(projectId, selectedFile, category, alt);
    if (result) {
      onClose();
    } else {
      setError('Upload failed. Please try again.');
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 rounded-xl w-full max-w-lg mx-4 shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Upload Media</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Drop zone */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-zinc-500" />
              <p className="text-white font-medium mb-1">
                Drop your image here or click to browse
              </p>
              <p className="text-sm text-zinc-500">JPEG, PNG, GIF, or WebP (max 5MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden">
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* File info */}
              <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                <ImageIcon className="h-8 w-8 text-emerald-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Category */}
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
              {categories
                .filter(
                  (c) =>
                    !['general', 'branding', 'gallery', 'products', 'blog'].includes(c.name)
                )
                .map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Alt text */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Alt Text (optional)
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe this image for accessibility"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
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
            onClick={handleUpload}
            disabled={!selectedFile || isUploadingMedia}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors"
          >
            {isUploadingMedia ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

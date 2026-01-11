'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, X, Image as ImageIcon, Loader2, Copy, CheckCircle } from 'lucide-react';
import { BuilderMedia } from '@/stores/useBuilderStore';

interface MediaPickerInlineProps {
  projectId: string;
  selectedMedia: BuilderMedia[];
  onSelect: (media: BuilderMedia[]) => void;
  maxItems?: number;
}

export default function MediaPickerInline({
  projectId,
  selectedMedia,
  onSelect,
  maxItems = 5,
}: MediaPickerInlineProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [availableMedia, setAvailableMedia] = useState<BuilderMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load media when picker opens
  useEffect(() => {
    if (showPicker && availableMedia.length === 0) {
      loadMedia();
    }
  }, [showPicker]);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/builder/media?projectId=${projectId}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setAvailableMedia(data.data.media);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
    setIsLoading(false);
  };

  const handleAdd = (media: BuilderMedia) => {
    if (selectedMedia.length >= maxItems) return;
    if (selectedMedia.find((m) => m._id === media._id)) return;
    onSelect([...selectedMedia, media]);
    setShowPicker(false);
  };

  const handleRemove = (mediaId: string) => {
    onSelect(selectedMedia.filter((m) => m._id !== mediaId));
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Selected media */}
      <div className="flex flex-wrap gap-2">
        {selectedMedia.map((media) => (
          <div
            key={media._id}
            className="relative group bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700"
          >
            <div className="w-20 h-20 relative">
              <Image
                src={media.url}
                alt={media.alt || media.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <button
              onClick={() => handleRemove(media._id)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3 text-white" />
            </button>
            <div className="p-1.5">
              <p className="text-xs text-white truncate w-16" title={media.name}>
                {media.name}
              </p>
              <button
                onClick={() => handleCopyUrl(media.url)}
                className={`mt-1 flex items-center gap-1 text-xs ${
                  copiedUrl === media.url ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {copiedUrl === media.url ? (
                  <>
                    <CheckCircle className="h-2.5 w-2.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-2.5 w-2.5" />
                    URL
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {/* Add button */}
        {selectedMedia.length < maxItems && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-20 h-28 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Add</span>
          </button>
        )}
      </div>

      {/* Info text */}
      {selectedMedia.length > 0 && (
        <p className="text-xs text-zinc-500">
          {selectedMedia.length} image{selectedMedia.length > 1 ? 's' : ''} selected.
          AI will use these URLs in generated code.
        </p>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 rounded-xl w-full max-w-2xl mx-4 max-h-[70vh] overflow-hidden shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="font-medium text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-emerald-500" />
                Select Image
              </h3>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : availableMedia.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2" />
                  <p>No images uploaded yet</p>
                  <p className="text-sm">Go to Media Library to upload images</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {availableMedia
                    .filter((m) => m.type === 'image')
                    .map((media) => {
                      const isSelected = selectedMedia.some((m) => m._id === media._id);
                      return (
                        <button
                          key={media._id}
                          onClick={() => !isSelected && handleAdd(media)}
                          disabled={isSelected}
                          className={`aspect-square relative rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-emerald-500 opacity-50 cursor-not-allowed'
                              : 'border-zinc-700 hover:border-emerald-500'
                          }`}
                        >
                          <Image
                            src={media.url}
                            alt={media.alt || media.name}
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                              <CheckCircle className="h-6 w-6 text-emerald-500" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

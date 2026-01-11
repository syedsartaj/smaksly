'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, MoreVertical, Pencil, Trash2, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { useBuilderStore, BuilderMedia } from '@/stores/useBuilderStore';
import EditMediaModal from './EditMediaModal';

interface MediaGridProps {
  media: BuilderMedia[];
  projectId: string;
}

export default function MediaGrid({ media, projectId }: MediaGridProps) {
  const { selectedMediaIds, toggleMediaSelection, deleteMedia } = useBuilderStore();
  const [editingMedia, setEditingMedia] = useState<BuilderMedia | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = (url: string, mediaId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(mediaId);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenu(null);
  };

  const truncateUrl = (url: string) => {
    if (url.length <= 35) return url;
    return url.slice(0, 20) + '...' + url.slice(-12);
  };

  const handleDelete = async (mediaId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      await deleteMedia(mediaId);
    }
    setActiveMenu(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {media.map((item) => {
          const isSelected = selectedMediaIds.has(item._id);

          return (
            <div
              key={item._id}
              className={`group relative bg-zinc-900 rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Selection checkbox */}
              <button
                onClick={() => toggleMediaSelection(item._id)}
                className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-zinc-500 bg-zinc-900/80 opacity-0 group-hover:opacity-100'
                }`}
              >
                {isSelected && <Check className="h-4 w-4 text-white" />}
              </button>

              {/* Menu button */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => setActiveMenu(activeMenu === item._id ? null : item._id)}
                  className="w-7 h-7 rounded-md bg-zinc-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zinc-800 transition-all"
                >
                  <MoreVertical className="h-4 w-4 text-zinc-400" />
                </button>

                {/* Dropdown menu */}
                {activeMenu === item._id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setActiveMenu(null)}
                    />
                    <div className="absolute right-0 mt-1 w-40 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 py-1 z-20">
                      <button
                        onClick={() => {
                          setEditingMedia(item);
                          setActiveMenu(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleCopyUrl(item.url, item._id)}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy URL
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setActiveMenu(null)}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                      <hr className="my-1 border-zinc-700" />
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Image */}
              <div className="aspect-square relative bg-zinc-800">
                <Image
                  src={item.url}
                  alt={item.alt || item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                />
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-sm text-white truncate" title={item.name}>
                  {item.name}
                </p>
                <p className="text-xs text-zinc-500 mb-1">
                  {formatFileSize(item.size)}
                  {item.dimensions && ` - ${item.dimensions.width}x${item.dimensions.height}`}
                </p>
                {/* Copy URL button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl(item.url, item._id);
                  }}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                    copiedId === item._id
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                  title={item.url}
                >
                  {copiedId === item._id ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span className="truncate">{truncateUrl(item.url)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingMedia && (
        <EditMediaModal
          media={editingMedia}
          onClose={() => setEditingMedia(null)}
        />
      )}
    </>
  );
}

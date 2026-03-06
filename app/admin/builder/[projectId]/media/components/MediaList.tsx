'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Pencil, Trash2, Copy, ExternalLink } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, BuilderMedia } from '@/stores/useBuilderStore';
import EditMediaModal from './EditMediaModal';

interface MediaListProps {
  media: BuilderMedia[];
  projectId: string;
}

export default function MediaList({ media, projectId }: MediaListProps) {
  const { selectedMediaIds, toggleMediaSelection, deleteMedia } = useBuilderStore(useShallow((s) => ({
    selectedMediaIds: s.selectedMediaIds,
    toggleMediaSelection: s.toggleMediaSelection,
    deleteMedia: s.deleteMedia,
  })));
  const [editingMedia, setEditingMedia] = useState<BuilderMedia | null>(null);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleDelete = async (mediaId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      await deleteMedia(mediaId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="w-10 p-3">
                <span className="sr-only">Select</span>
              </th>
              <th className="w-16 p-3">
                <span className="sr-only">Preview</span>
              </th>
              <th className="text-left p-3 text-sm font-medium text-zinc-400">Name</th>
              <th className="text-left p-3 text-sm font-medium text-zinc-400">Category</th>
              <th className="text-left p-3 text-sm font-medium text-zinc-400">Size</th>
              <th className="text-left p-3 text-sm font-medium text-zinc-400">Dimensions</th>
              <th className="text-left p-3 text-sm font-medium text-zinc-400">Date</th>
              <th className="w-32 p-3 text-right text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {media.map((item) => {
              const isSelected = selectedMediaIds.has(item._id);

              return (
                <tr
                  key={item._id}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/50 ${
                    isSelected ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <td className="p-3">
                    <button
                      onClick={() => toggleMediaSelection(item._id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-600 hover:border-zinc-500'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="w-10 h-10 relative rounded overflow-hidden bg-zinc-800">
                      <Image
                        src={item.url}
                        alt={item.alt || item.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="text-sm text-white truncate max-w-xs" title={item.name}>
                      {item.name}
                    </p>
                    {item.alt && (
                      <p className="text-xs text-zinc-500 truncate max-w-xs" title={item.alt}>
                        {item.alt}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-zinc-400 capitalize">
                      {item.category || 'general'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-zinc-400">{formatFileSize(item.size)}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-zinc-400">
                      {item.dimensions
                        ? `${item.dimensions.width}x${item.dimensions.height}`
                        : '-'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-zinc-400">{formatDate(item.createdAt)}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingMedia(item)}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCopyUrl(item.url)}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Open"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 rounded hover:bg-zinc-700 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

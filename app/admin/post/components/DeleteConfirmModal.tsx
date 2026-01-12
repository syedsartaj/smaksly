'use client';

import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  count: number;
  isDeleting?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Delete Confirmation</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-zinc-300">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">
              {count} blog post{count !== 1 ? 's' : ''}
            </span>
            ?
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            This action cannot be undone. The selected post{count !== 1 ? 's' : ''} will be permanently removed.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

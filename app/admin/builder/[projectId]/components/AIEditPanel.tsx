'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, RefreshCw, Send, Code, Wand2, ImagePlus, Loader2 } from 'lucide-react';
import { useBuilderStore, BuilderMedia } from '@/stores/useBuilderStore';

interface AIEditPanelProps {
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: 'Make it darker', icon: '🌙' },
  { label: 'Make it lighter', icon: '☀️' },
  { label: 'Add more spacing', icon: '↔️' },
  { label: 'Make text larger', icon: '🔤' },
  { label: 'Center the content', icon: '⬛' },
  { label: 'Add hover effects', icon: '✨' },
  { label: 'Improve accessibility', icon: '♿' },
  { label: 'Make it responsive', icon: '📱' },
];

export function AIEditPanel({ onClose }: AIEditPanelProps) {
  const {
    currentPage,
    code,
    selectedCode,
    setCode,
    updatePage,
    generatePreview,
  } = useBuilderStore();

  const [instruction, setInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [availableMedia, setAvailableMedia] = useState<BuilderMedia[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const { project } = useBuilderStore();

  const loadMedia = async () => {
    if (!project) return;
    setIsLoadingMedia(true);
    try {
      const response = await fetch(`/api/builder/media?projectId=${project._id}&limit=30`);
      const data = await response.json();
      if (data.success) {
        setAvailableMedia(data.data.media);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
    setIsLoadingMedia(false);
  };

  const handleInsertImage = (media: BuilderMedia) => {
    const insertText = `Use this image: ${media.url} `;
    setInstruction((prev) => prev + insertText);
    setShowMediaPicker(false);
  };

  const openMediaPicker = () => {
    setShowMediaPicker(true);
    if (availableMedia.length === 0) {
      loadMedia();
    }
  };

  const handleEdit = async (editInstruction?: string) => {
    const instructionToUse = editInstruction || instruction.trim();
    if (!instructionToUse || !currentPage || !code) return;

    try {
      setIsEditing(true);
      setError(null);

      // Add to conversation
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: instructionToUse },
      ]);

      const response = await fetch(`/api/builder/pages/${currentPage._id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: instructionToUse,
          currentCode: code,
          selectedCode: selectedCode?.text || '',
          selectionContext: selectedCode
            ? {
                startLine: selectedCode.startLine,
                endLine: selectedCode.endLine,
              }
            : undefined,
          conversationHistory: conversationHistory.slice(-6),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCode(data.data.code);
        updatePage(currentPage._id, {
          code: data.data.code,
          status: 'edited',
        });

        const warningText = data.data.warnings?.length > 0
          ? `\n⚠ ${data.data.warnings.join(', ')}`
          : '';
        const contextText = selectedCode
          ? `Applied changes to lines ${selectedCode.startLine}-${selectedCode.endLine}.`
          : 'Applied changes to the page.';

        setConversationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: `${contextText}${warningText}` },
        ]);

        setInstruction('');

        // Generate preview
        setTimeout(() => {
          generatePreview();
        }, 100);
      } else {
        setError(data.error || 'Failed to edit code');
        setConversationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      }
    } catch (error) {
      console.error('Error editing code:', error);
      setError('Failed to edit code. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-zinc-300">AI Edit</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="h-4 w-4 text-zinc-400" />
        </button>
      </div>

      {/* Selection Info */}
      {selectedCode && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-purple-500/10">
          <div className="flex items-center gap-2 text-sm text-purple-400 mb-2">
            <Code className="h-4 w-4" />
            <span>Selection Active</span>
          </div>
          <p className="text-xs text-zinc-400">
            Lines {selectedCode.startLine} - {selectedCode.endLine}
          </p>
          <pre className="mt-2 p-2 bg-zinc-800 rounded text-xs text-zinc-300 overflow-hidden max-h-20 overflow-y-auto">
            {selectedCode.text.slice(0, 200)}
            {selectedCode.text.length > 200 && '...'}
          </pre>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs text-zinc-500 mb-2">Quick Actions</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleEdit(action.label)}
              disabled={isEditing}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors disabled:opacity-50"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {conversationHistory.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Wand2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Describe what changes you want</p>
            <p className="text-xs mt-1">
              {selectedCode
                ? 'Changes will apply to selected code'
                : 'Changes will apply to the entire page'}
            </p>
          </div>
        ) : (
          conversationHistory.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-purple-500/20 text-purple-200 ml-4'
                  : 'bg-zinc-800 text-zinc-300 mr-4'
              }`}
            >
              {msg.content}
            </div>
          ))
        )}

        {isEditing && (
          <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
            <RefreshCw className="h-4 w-4 text-purple-400 animate-spin" />
            <span className="text-sm text-zinc-400">Applying changes...</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        {/* Insert Image Button */}
        <button
          onClick={openMediaPicker}
          className="mb-2 flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Insert Image URL
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEdit();
              }
            }}
            placeholder={
              selectedCode
                ? 'Describe changes for selection...'
                : 'Describe changes for the page...'
            }
            disabled={isEditing}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            onClick={() => handleEdit()}
            disabled={!instruction.trim() || isEditing}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Press Enter to apply or click the send button
        </p>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md mx-4 max-h-[60vh] overflow-hidden shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="font-medium text-white text-sm">Insert Image URL</h3>
              <button
                onClick={() => setShowMediaPicker(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto max-h-[45vh]">
              {isLoadingMedia ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                </div>
              ) : availableMedia.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No images uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableMedia
                    .filter((m) => m.type === 'image')
                    .map((media) => (
                      <button
                        key={media._id}
                        onClick={() => handleInsertImage(media)}
                        className="aspect-square relative rounded-lg overflow-hidden border border-zinc-700 hover:border-emerald-500 transition-colors"
                      >
                        <Image
                          src={media.url}
                          alt={media.alt || media.name}
                          fill
                          className="object-cover"
                          sizes="80px"
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

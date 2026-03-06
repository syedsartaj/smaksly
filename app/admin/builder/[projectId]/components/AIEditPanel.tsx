'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  X, Sparkles, RefreshCw, Send, Code, Wand2, ImagePlus, Loader2,
  Undo2, Check, XCircle, ChevronDown, Crosshair, Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useBuilderStore, BuilderMedia } from '@/stores/useBuilderStore';
import { parseSections, extractSectionCode, generateSmartActions, type DetectedSection, type SmartAction } from '@/lib/builder/section-parser';
import { computeDiff, getDiffSummary, type DiffResult } from '@/lib/builder/simple-diff';

interface AIEditPanelProps {
  onClose: () => void;
}

export function AIEditPanel({ onClose }: AIEditPanelProps) {
  const {
    currentPage,
    code,
    selectedCode,
    setCode,
    updatePage,
    project,
    setSelectedCode,
  } = useBuilderStore(useShallow((s) => ({
    currentPage: s.currentPage,
    code: s.code,
    selectedCode: s.selectedCode,
    setCode: s.setCode,
    updatePage: s.updatePage,
    project: s.project,
    setSelectedCode: s.setSelectedCode,
  })));

  // Core state
  const [instruction, setInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);

  // Undo stack (A)
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Section targeting (D)
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [showSectionPicker, setShowSectionPicker] = useState(false);

  // Diff preview (E)
  const [pendingEdit, setPendingEdit] = useState<{
    oldCode: string;
    newCode: string;
    diff: DiffResult;
    instruction: string;
  } | null>(null);

  // Media picker
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [availableMedia, setAvailableMedia] = useState<BuilderMedia[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse sections from current code (D)
  const detectedSections = useMemo(() => {
    if (!code) return [];
    return parseSections(code);
  }, [code]);

  // Generate smart quick actions based on code (C)
  const smartActions = useMemo(() => {
    if (!code) return [];
    return generateSmartActions(code, detectedSections);
  }, [code, detectedSections]);

  const selectedSection = useMemo(() => {
    if (!targetSectionId) return null;
    return detectedSections.find((s) => s.id === targetSectionId) || null;
  }, [targetSectionId, detectedSections]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, isEditing]);

  // Auto-resize textarea (B)
  const handleTextareaInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  // Media loading
  const loadMedia = async () => {
    if (!project) return;
    setIsLoadingMedia(true);
    try {
      const response = await fetch(`/api/builder/media?projectId=${project._id}&limit=30`);
      const data = await response.json();
      if (data.success) {
        setAvailableMedia(data.data.media);
      }
    } catch (err) {
      console.error('Error loading media:', err);
    }
    setIsLoadingMedia(false);
  };

  const handleInsertImage = (media: BuilderMedia) => {
    setInstruction((prev) => prev + `Use this image: ${media.url} `);
    setShowMediaPicker(false);
    textareaRef.current?.focus();
  };

  // === UNDO (A) ===
  const handleUndo = () => {
    if (undoStack.length === 0 || !currentPage) return;
    const previousCode = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setCode(previousCode);
    updatePage(currentPage._id, { code: previousCode, status: 'edited' });
    setConversationHistory((prev) => [
      ...prev,
      { role: 'assistant', content: 'Reverted to previous version.' },
    ]);
  };

  // === MAIN EDIT HANDLER ===
  const handleEdit = async (editInstruction?: string, sectionOverride?: string) => {
    const instructionToUse = editInstruction || instruction.trim();
    if (!instructionToUse || !currentPage || !code) return;

    try {
      setIsEditing(true);
      setError(null);

      // Determine section targeting
      const activeSectionId = sectionOverride || targetSectionId;
      const activeSection = activeSectionId
        ? detectedSections.find((s) => s.id === activeSectionId)
        : null;

      // Build selection from section if no manual selection
      let selectedText = selectedCode?.text || '';
      let selectionCtx = selectedCode
        ? { startLine: selectedCode.startLine, endLine: selectedCode.endLine }
        : undefined;

      if (!selectedText && activeSection) {
        selectedText = extractSectionCode(code, activeSection);
        selectionCtx = { startLine: activeSection.startLine, endLine: activeSection.endLine };
      }

      // Add to conversation
      const displayMsg = activeSection
        ? `[${activeSection.name}] ${instructionToUse}`
        : instructionToUse;
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: displayMsg },
      ]);

      const response = await fetch(`/api/builder/pages/${currentPage._id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: activeSection
            ? `In the "${activeSection.name}" section (lines ${activeSection.startLine}-${activeSection.endLine}): ${instructionToUse}`
            : instructionToUse,
          currentCode: code,
          selectedCode: selectedText,
          selectionContext: selectionCtx,
          conversationHistory: conversationHistory.slice(-6),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show diff preview instead of applying immediately (E)
        const diff = computeDiff(code, data.data.code);
        if (diff.addedCount === 0 && diff.removedCount === 0) {
          setConversationHistory((prev) => [
            ...prev,
            { role: 'assistant', content: 'No changes were needed.' },
          ]);
        } else {
          setPendingEdit({
            oldCode: code,
            newCode: data.data.code,
            diff,
            instruction: instructionToUse,
          });
          const summary = getDiffSummary(diff);
          const warningText = data.data.warnings?.length > 0
            ? `\n Warning: ${data.data.warnings.join(', ')}`
            : '';
          setConversationHistory((prev) => [
            ...prev,
            { role: 'assistant', content: `Changes ready (${summary}). Review and accept below.${warningText}` },
          ]);
        }

        setInstruction('');
        handleTextareaInput();
      } else {
        setError(data.error || 'Failed to edit code');
        setConversationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      }
    } catch (err) {
      console.error('Error editing code:', err);
      setError('Failed to edit code. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  // === DIFF ACCEPT/REJECT (E) ===
  const handleAcceptEdit = () => {
    if (!pendingEdit || !currentPage) return;
    // Push current code to undo stack
    setUndoStack((prev) => [...prev.slice(-9), pendingEdit.oldCode]);
    setCode(pendingEdit.newCode);
    updatePage(currentPage._id, { code: pendingEdit.newCode, status: 'edited' });
    setPendingEdit(null);
  };

  const handleRejectEdit = () => {
    setPendingEdit(null);
    setConversationHistory((prev) => [
      ...prev,
      { role: 'assistant', content: 'Changes discarded.' },
    ]);
  };

  // Clear section targeting when manual selection is active
  useEffect(() => {
    if (selectedCode) {
      setTargetSectionId(null);
    }
  }, [selectedCode]);

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-zinc-300">AI Edit</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Undo Button (A) */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0 || isEditing}
            className="p-1 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30"
            title={`Undo (${undoStack.length} available)`}
          >
            <Undo2 className="h-4 w-4 text-zinc-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Section Targeting (D) */}
      {detectedSections.length > 0 && !selectedCode && (
        <div className="px-4 py-2 border-b border-zinc-800">
          <button
            onClick={() => setShowSectionPicker(!showSectionPicker)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 rounded-lg text-sm transition-colors"
          >
            <div className="flex items-center gap-2">
              <Crosshair className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-zinc-300">
                {selectedSection ? selectedSection.name : 'Target: Entire Page'}
              </span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${showSectionPicker ? 'rotate-180' : ''}`} />
          </button>

          {showSectionPicker && (
            <div className="mt-1.5 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
              <button
                onClick={() => { setTargetSectionId(null); setShowSectionPicker(false); }}
                className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2 ${
                  !targetSectionId ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Code className="h-3 w-3" />
                Entire Page
              </button>
              {detectedSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => { setTargetSectionId(section.id); setShowSectionPicker(false); setSelectedCode(null); }}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                    targetSectionId === section.id ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{section.name}</span>
                    <span className="text-zinc-600 text-[10px]">L{section.startLine}-{section.endLine}</span>
                  </div>
                  {section.preview && (
                    <p className="text-zinc-600 text-[10px] mt-0.5 truncate">{section.preview}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selection Info (manual code selection overrides section targeting) */}
      {selectedCode && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-purple-400">
              <Code className="h-4 w-4" />
              <span>Code Selection</span>
            </div>
            <button
              onClick={() => setSelectedCode(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Lines {selectedCode.startLine} - {selectedCode.endLine}
          </p>
          <pre className="mt-2 p-2 bg-zinc-800 rounded text-xs text-zinc-300 overflow-hidden max-h-16 overflow-y-auto">
            {selectedCode.text.slice(0, 200)}
            {selectedCode.text.length > 200 && '...'}
          </pre>
        </div>
      )}

      {/* Smart Quick Actions (C) */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="h-3 w-3 text-yellow-500" />
          <p className="text-xs text-zinc-500">Quick Actions</p>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {smartActions.slice(0, 8).map((action, i) => (
            <button
              key={i}
              onClick={() => handleEdit(action.instruction, action.targetSection)}
              disabled={isEditing || !!pendingEdit}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors disabled:opacity-50 text-left"
            >
              {action.label}
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
                : selectedSection
                ? `Changes will apply to "${selectedSection.name}" section`
                : 'Changes will apply to the entire page'}
            </p>
            {detectedSections.length > 0 && !selectedCode && !selectedSection && (
              <p className="text-xs mt-2 text-zinc-600">
                Tip: Use the section picker above to target a specific section
              </p>
            )}
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
        <div ref={chatEndRef} />
      </div>

      {/* Diff Preview (E) */}
      {pendingEdit && (
        <div className="border-t border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <span className="text-xs font-medium text-zinc-300">
              Review Changes ({getDiffSummary(pendingEdit.diff)})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRejectEdit}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
              <button
                onClick={handleAcceptEdit}
                className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Accept
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-auto px-2 py-1 font-mono text-[11px] leading-relaxed">
            {pendingEdit.diff.lines.map((line, i) => {
              if (line.type === 'same') {
                // Only show context lines near changes
                const nearChange = pendingEdit.diff.lines.slice(
                  Math.max(0, i - 2), Math.min(pendingEdit.diff.lines.length, i + 3)
                ).some((l) => l.type !== 'same');
                if (!nearChange) return null;
                return (
                  <div key={i} className="text-zinc-600 px-2 whitespace-pre overflow-x-auto">
                    {' '}{line.content}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={`px-2 whitespace-pre overflow-x-auto ${
                    line.type === 'added'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {line.type === 'added' ? '+' : '-'}{line.content}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Input (B - textarea instead of input) */}
      <div className="p-4 border-t border-zinc-800">
        {/* Insert Image Button */}
        <button
          onClick={() => {
            setShowMediaPicker(true);
            if (availableMedia.length === 0) loadMedia();
          }}
          className="mb-2 flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Insert Image URL
        </button>

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(e) => {
              setInstruction(e.target.value);
              handleTextareaInput();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEdit();
              }
            }}
            placeholder={
              selectedCode
                ? 'Describe changes for selection...'
                : selectedSection
                ? `Describe changes for "${selectedSection.name}"...`
                : 'Describe changes for the page...'
            }
            disabled={isEditing || !!pendingEdit}
            rows={1}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 disabled:opacity-50 resize-none overflow-hidden"
          />
          <button
            onClick={() => handleEdit()}
            disabled={!instruction.trim() || isEditing || !!pendingEdit}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isEditing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-600">
          Enter to send, Shift+Enter for new line
          {undoStack.length > 0 && ` · ${undoStack.length} undo${undoStack.length > 1 ? 's' : ''} available`}
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

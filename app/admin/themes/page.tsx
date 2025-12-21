'use client';

import { useState, useRef, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'framer-motion';



interface Block {
  id: string;
  type: 'container' | 'text' | 'image' | 'video' | 'button' | 'heading' | 'divider' | 'spacer';
  parentId: string | null;
  props: Record<string, any>;
}

interface BlockWithChildren extends Block {
  children: BlockWithChildren[];
}

// Available block templates
const BLOCK_TEMPLATES = [
  { type: 'container', label: 'Container', icon: '📦', desc: 'Group elements together' },
  { type: 'heading', label: 'Heading', icon: '📝', desc: 'Large title text' },
  { type: 'text', label: 'Text', icon: '📄', desc: 'Paragraph text' },
  { type: 'image', label: 'Image', icon: '🖼️', desc: 'Add an image' },
  { type: 'video', label: 'Video', icon: '🎬', desc: 'Embed a video' },
  { type: 'button', label: 'Button', icon: '🔘', desc: 'Clickable button' },
  { type: 'divider', label: 'Divider', icon: '➖', desc: 'Horizontal line' },
  { type: 'spacer', label: 'Spacer', icon: '↕️', desc: 'Empty space' },
];

function generatePageTree(blocks: Block[]): BlockWithChildren[] {
  const cloned: BlockWithChildren[] = blocks.map((b) => ({ ...b, children: [] }));

  const findParent = (child: BlockWithChildren, possibleParents: BlockWithChildren[]): BlockWithChildren | null => {
    let parentFound: BlockWithChildren | null = null;

    possibleParents.forEach((possibleParent) => {
      if (
        possibleParent.id !== child.id &&
        possibleParent.type === 'container' &&
        child.props.x >= possibleParent.props.x &&
        child.props.y >= possibleParent.props.y &&
        child.props.x + (child.props.width || 0) <= possibleParent.props.x + (possibleParent.props.width || 0) &&
        child.props.y + (child.props.height || 0) <= possibleParent.props.y + (possibleParent.props.height || 0)
      ) {
        if (!parentFound ||
            possibleParent.props.width * possibleParent.props.height < parentFound.props.width * parentFound.props.height) {
          parentFound = possibleParent;
        }
      }
    });

    return parentFound;
  };

  cloned.forEach((child) => {
    const parent = findParent(child, cloned);
    child.parentId = parent?.id || null;
  });

  const blockMap: Map<string, BlockWithChildren> = new Map(
    cloned.map((b) => [b.id, { ...b, children: [] }])
  );

  cloned.forEach((block) => {
    const mappedBlock = blockMap.get(block.id);
    if (!mappedBlock) return;

    if (block.parentId) {
      const parent = blockMap.get(block.parentId);
      if (parent) parent.children.push(mappedBlock);
    }
  });

  return Array.from(blockMap.values()).filter((b) => !b.parentId);
}

export default function PageBuilder() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonCode, setJsonCode] = useState('');
  const [importJson, setImportJson] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewMode, setPreviewMode] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustContainerSize = useCallback((containerId: string) => {
    setBlocks((prev) => {
      const updated = [...prev];
      const container = updated.find((b) => b.id === containerId);
      if (!container) return prev;

      const children = updated.filter((b) => b.parentId === containerId);
      if (children.length === 0) return prev;

      let maxWidth = 0;
      let maxHeight = 0;
      children.forEach((child) => {
        const rightEdge = (child.props.x || 0) + (child.props.width || 0);
        const bottomEdge = (child.props.y || 0) + (child.props.height || 0);
        if (rightEdge > maxWidth) maxWidth = rightEdge;
        if (bottomEdge > maxHeight) maxHeight = bottomEdge;
      });

      const padding = 10;
      container.props.width = Math.max(container.props.width || 0, maxWidth + padding);
      container.props.height = Math.max(container.props.height || 0, maxHeight + padding);

      return updated;
    });
  }, []);

  const getDefaultProps = (type: Block['type']) => {
    const defaults: Record<string, Record<string, any>> = {
      container: {
        width: 400,
        height: 200,
        backgroundColor: '#f8f8f8',
        x: 50,
        y: 50,
        borderRadius: 8,
        padding: 16,
        shadow: true,
      },
      heading: {
        text: 'Heading Text',
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'left',
        width: 300,
        height: 50,
        x: 50,
        y: 50,
      },
      text: {
        text: 'This is a paragraph of text. Click to edit.',
        fontSize: 16,
        color: '#4a4a4a',
        textAlign: 'left',
        lineHeight: 1.6,
        width: 300,
        height: 80,
        x: 50,
        y: 50,
      },
      image: {
        src: '',
        alt: 'Image',
        objectFit: 'cover',
        width: 300,
        height: 200,
        x: 50,
        y: 50,
        borderRadius: 8,
      },
      video: {
        src: '',
        controls: true,
        autoplay: false,
        width: 400,
        height: 225,
        x: 50,
        y: 50,
        borderRadius: 8,
      },
      button: {
        text: 'Click Me',
        backgroundColor: '#9929EA',
        color: '#ffffff',
        width: 150,
        height: 48,
        x: 50,
        y: 50,
        borderRadius: 8,
        fontSize: 16,
        fontWeight: 'medium',
        actionType: 'link',
        url: '',
      },
      divider: {
        width: 400,
        height: 2,
        backgroundColor: '#e0e0e0',
        x: 50,
        y: 50,
      },
      spacer: {
        width: 400,
        height: 50,
        x: 50,
        y: 50,
      },
    };
    return defaults[type] || {};
  };

  const addBlock = (type: Block['type'], parentId: string | null = null) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      parentId,
      props: getDefaultProps(type),
    };

    setBlocks((prev) => [...prev, newBlock]);
    setSelected(newBlock.id);
  };

  const updateBlock = (id: string, updatedProps: Record<string, any>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, ...updatedProps } } : b
      )
    );

    const block = blocks.find((b) => b.id === id);
    if (block?.parentId) {
      adjustContainerSize(block.parentId);
    }
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => {
      const getAllChildIds = (parentId: string): string[] => {
        const children = prev.filter((b) => b.parentId === parentId);
        return children.reduce<string[]>(
          (acc, child) => [...acc, child.id, ...getAllChildIds(child.id)],
          []
        );
      };

      const allIdsToDelete = [id, ...getAllChildIds(id)];
      return prev.filter((b) => !allIdsToDelete.includes(b.id));
    });

    if (selected === id) setSelected(null);
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    const newBlock: Block = {
      ...block,
      id: Math.random().toString(36).substr(2, 9),
      props: {
        ...block.props,
        x: (block.props.x || 0) + 20,
        y: (block.props.y || 0) + 20,
      },
    };

    setBlocks((prev) => [...prev, newBlock]);
    setSelected(newBlock.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeBlock = blocks.find((b) => b.id === active.id);
    if (!activeBlock) return;

    const overBlock = blocks.find((b) => b.id === over.id);
    if (!overBlock) return;

    if (overBlock.type === 'container') {
      setBlocks((prev: any) =>
        prev.map((b: any) =>
          b.id === active.id
            ? {
                ...b,
                parentId: over.id,
                props: { ...b.props, x: 10, y: 10 },
              }
            : b
        )
      );
    }
  };

  const handleExportJSON = () => {
    const jsonTree = generatePageTree(blocks);
    const json = JSON.stringify(jsonTree, null, 2);
    setJsonCode(json);
    setShowExportModal(true);
  };

  const handleDownloadJSON = () => {
    const jsonTree = generatePageTree(blocks);
    const json = JSON.stringify(jsonTree, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-design-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'JSON file downloaded!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonCode);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const flattenTree = (nodes: BlockWithChildren[], parentId: string | null = null): Block[] => {
    let result: Block[] = [];
    nodes.forEach((node) => {
      const { children, ...block } = node;
      result.push({ ...block, parentId });
      if (children && children.length > 0) {
        result = result.concat(flattenTree(children, block.id));
      }
    });
    return result;
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(importJson);
      const flattened = flattenTree(Array.isArray(parsed) ? parsed : [parsed]);
      setBlocks(flattened);
      setShowImportModal(false);
      setImportJson('');
      setMessage({ type: 'success', text: 'Design imported successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid JSON format' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setImportJson(content);
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to read file' });
      }
    };
    reader.readAsText(file);
  };

  const clearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      setBlocks([]);
      setSelected(null);
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selected);

  const canvasWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  const renderBlocks = (parentId: string | null = null) =>
    blocks
      .filter((b) => b.parentId === parentId)
      .map((block) => (
        <Rnd
          key={block.id}
          size={{ width: block.props.width, height: block.props.height }}
          position={{ x: block.props.x || 0, y: block.props.y || 0 }}
          onDragStop={(e, d) => updateBlock(block.id, { x: d.x, y: d.y })}
          onResizeStop={(e, dir, ref) => {
            updateBlock(block.id, {
              width: ref.offsetWidth,
              height: ref.offsetHeight,
            });
            if (block.parentId) adjustContainerSize(block.parentId);
          }}
          bounds="parent"
          enableResizing={!previewMode}
          disableDragging={previewMode}
          className={`${!previewMode ? 'hover:ring-2 hover:ring-[#9929EA]/50' : ''} ${
            selected === block.id && !previewMode ? 'ring-2 ring-[#9929EA]' : ''
          }`}
          style={{
            borderRadius: block.props.borderRadius || 0,
            boxShadow: block.props.shadow ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
            overflow: 'hidden',
          }}
          onClick={(e: any) => {
            if (previewMode) return;
            e.stopPropagation();
            setSelected(block.id);
          }}
        >
          <div
            ref={(el) => {
              if (block.type === 'container') containerRefs.current[block.id] = el;
            }}
            className="w-full h-full"
            style={{
              backgroundColor: block.props.backgroundColor || 'transparent',
              padding: block.props.padding || 0,
              display: 'flex',
              alignItems: block.type === 'text' || block.type === 'heading' ? 'flex-start' : 'center',
              justifyContent: block.props.textAlign === 'center' ? 'center' : block.props.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            {block.type === 'heading' && (
              <h2
                style={{
                  fontSize: block.props.fontSize,
                  fontWeight: block.props.fontWeight,
                  color: block.props.color,
                  textAlign: block.props.textAlign,
                  width: '100%',
                  margin: 0,
                }}
              >
                {block.props.text}
              </h2>
            )}

            {block.type === 'text' && (
              <p
                style={{
                  fontSize: block.props.fontSize,
                  color: block.props.color,
                  textAlign: block.props.textAlign,
                  lineHeight: block.props.lineHeight,
                  width: '100%',
                  margin: 0,
                }}
              >
                {block.props.text}
              </p>
            )}

            {block.type === 'button' && (
              <button
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: block.props.backgroundColor,
                  color: block.props.color,
                  borderRadius: block.props.borderRadius,
                  fontSize: block.props.fontSize,
                  fontWeight: block.props.fontWeight === 'bold' ? 700 : block.props.fontWeight === 'medium' ? 500 : 400,
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (previewMode && block.props.url) {
                    window.open(block.props.url, '_blank');
                  }
                }}
              >
                {block.props.text}
              </button>
            )}

            {block.type === 'image' && block.props.src ? (
              <img
                src={block.props.src}
                alt={block.props.alt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: block.props.objectFit,
                  borderRadius: block.props.borderRadius,
                }}
              />
            ) : block.type === 'image' && (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                <span className="text-4xl">🖼️</span>
              </div>
            )}

            {block.type === 'video' && block.props.src ? (
              <video
                src={block.props.src}
                controls={block.props.controls}
                autoPlay={block.props.autoplay}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: block.props.borderRadius,
                }}
              />
            ) : block.type === 'video' && (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                <span className="text-4xl">🎬</span>
              </div>
            )}

            {block.type === 'divider' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: block.props.backgroundColor,
                }}
              />
            )}

            {block.type === 'spacer' && (
              <div className="w-full h-full" />
            )}

            {block.type === 'container' && renderBlocks(block.id)}
          </div>
        </Rnd>
      ));

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0C0A1F] via-[#1a1830] to-[#0C0A1F]">
          {/* Left Toolbar */}
          <div className="w-64 bg-[#1C1936]/80 border-r border-[#2d2a4a] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Components</h2>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  previewMode
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-[#2d2a4a] text-gray-300'
                }`}
              >
                {previewMode ? 'Edit' : 'Preview'}
              </button>
            </div>

            {/* Block Templates */}
            <div className="space-y-2 mb-6">
              {BLOCK_TEMPLATES.map((template) => (
                <motion.button
                  key={template.type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addBlock(template.type as Block['type'])}
                  disabled={previewMode}
                  className="w-full p-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-left hover:border-[#9929EA]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <p className="text-white font-medium text-sm">{template.label}</p>
                      <p className="text-gray-500 text-xs">{template.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Canvas Controls */}
            <div className="border-t border-[#2d2a4a] pt-4 mb-4">
              <h3 className="text-gray-400 text-sm font-medium mb-3">Canvas Size</h3>
              <div className="flex gap-2">
                {(['desktop', 'tablet', 'mobile'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setCanvasWidth(size)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      canvasWidth === size
                        ? 'bg-[#9929EA] text-white'
                        : 'bg-[#0C0A1F] text-gray-400 hover:bg-[#2d2a4a]'
                    }`}
                  >
                    {size === 'desktop' ? '💻' : size === 'tablet' ? '📱' : '📲'}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleExportJSON}
                className="w-full px-4 py-2 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Export JSON
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full px-4 py-2 bg-[#2d2a4a] text-white rounded-xl text-sm font-medium hover:bg-[#3d3a5a] transition-colors"
              >
                Import JSON
              </button>
              <button
                onClick={handleDownloadJSON}
                className="w-full px-4 py-2 bg-[#2d2a4a] text-white rounded-xl text-sm font-medium hover:bg-[#3d3a5a] transition-colors"
              >
                Download JSON
              </button>
              <button
                onClick={clearCanvas}
                className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Clear Canvas
              </button>
            </div>

            {/* Layers */}
            {blocks.length > 0 && (
              <div className="border-t border-[#2d2a4a] pt-4 mt-4">
                <h3 className="text-gray-400 text-sm font-medium mb-3">Layers ({blocks.length})</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {blocks.map((block) => (
                    <button
                      key={block.id}
                      onClick={() => setSelected(block.id)}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-colors flex items-center gap-2 ${
                        selected === block.id
                          ? 'bg-[#9929EA]/20 text-[#9929EA]'
                          : 'bg-[#0C0A1F] text-gray-400 hover:bg-[#2d2a4a]'
                      }`}
                    >
                      <span>{BLOCK_TEMPLATES.find((t) => t.type === block.type)?.icon}</span>
                      <span className="truncate">{block.type} - {block.id.slice(0, 5)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 p-6 overflow-auto" onClick={() => setSelected(null)}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div
                className="mx-auto bg-white rounded-xl shadow-2xl transition-all duration-300"
                style={{
                  width: canvasWidths[canvasWidth],
                  minHeight: Math.max(800, ...blocks.map((b) => (b.props.y || 0) + (b.props.height || 0) + 100)),
                  position: 'relative',
                }}
              >
                {blocks.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🎨</span>
                      </div>
                      <h3 className="text-gray-600 font-medium mb-2">Start Building</h3>
                      <p className="text-gray-400 text-sm">Drag components from the left panel</p>
                    </div>
                  </div>
                ) : (
                  renderBlocks()
                )}
              </div>
            </DndContext>
          </div>

          {/* Right Properties Panel */}
          <div className="w-72 bg-[#1C1936]/80 border-l border-[#2d2a4a] p-4 overflow-y-auto">
            <h2 className="text-white font-semibold mb-4">Properties</h2>

            {selectedBlock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm">
                    {BLOCK_TEMPLATES.find((t) => t.type === selectedBlock.type)?.icon}{' '}
                    {selectedBlock.type}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => duplicateBlock(selectedBlock.id)}
                      className="p-1.5 bg-[#2d2a4a] text-gray-300 rounded-lg hover:bg-[#3d3a5a] transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteBlock(selectedBlock.id)}
                      className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-2">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-500 text-xs">Width</label>
                      <input
                        type="number"
                        value={selectedBlock.props.width || 0}
                        onChange={(e) => updateBlock(selectedBlock.id, { width: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs">Height</label>
                      <input
                        type="number"
                        value={selectedBlock.props.height || 0}
                        onChange={(e) => updateBlock(selectedBlock.id, { height: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-2">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-500 text-xs">X</label>
                      <input
                        type="number"
                        value={selectedBlock.props.x || 0}
                        onChange={(e) => updateBlock(selectedBlock.id, { x: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs">Y</label>
                      <input
                        type="number"
                        value={selectedBlock.props.y || 0}
                        onChange={(e) => updateBlock(selectedBlock.id, { y: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                {(selectedBlock.type === 'text' || selectedBlock.type === 'heading' || selectedBlock.type === 'button') && (
                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Text</label>
                    <textarea
                      value={selectedBlock.props.text || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {/* Typography */}
                {(selectedBlock.type === 'text' || selectedBlock.type === 'heading' || selectedBlock.type === 'button') && (
                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Typography</label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-gray-500 text-xs">Font Size</label>
                        <input
                          type="number"
                          value={selectedBlock.props.fontSize || 16}
                          onChange={(e) => updateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs">Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={selectedBlock.props.color || '#000000'}
                            onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                            className="w-10 h-10 rounded-lg border border-[#2d2a4a] cursor-pointer"
                          />
                          <input
                            type="text"
                            value={selectedBlock.props.color || '#000000'}
                            onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                            className="flex-1 px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Background */}
                {(selectedBlock.type === 'container' || selectedBlock.type === 'button' || selectedBlock.type === 'divider') && (
                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Background</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedBlock.props.backgroundColor || '#ffffff'}
                        onChange={(e) => updateBlock(selectedBlock.id, { backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-[#2d2a4a] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedBlock.props.backgroundColor || '#ffffff'}
                        onChange={(e) => updateBlock(selectedBlock.id, { backgroundColor: e.target.value })}
                        className="flex-1 px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Border Radius */}
                {(selectedBlock.type === 'container' || selectedBlock.type === 'button' || selectedBlock.type === 'image' || selectedBlock.type === 'video') && (
                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Border Radius</label>
                    <input
                      type="number"
                      value={selectedBlock.props.borderRadius || 0}
                      onChange={(e) => updateBlock(selectedBlock.id, { borderRadius: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                    />
                  </div>
                )}

                {/* Image/Video Source */}
                {(selectedBlock.type === 'image' || selectedBlock.type === 'video') && (
                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Source URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={selectedBlock.props.src || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { src: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                    />
                  </div>
                )}

                {/* Button Link */}
                {selectedBlock.type === 'button' && (
                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-2">Link URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={selectedBlock.props.url || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { url: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0C0A1F] border border-[#2d2a4a] rounded-lg text-white text-sm"
                    />
                  </div>
                )}

                {/* Container Shadow */}
                {selectedBlock.type === 'container' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBlock.props.shadow || false}
                      onChange={(e) => updateBlock(selectedBlock.id, { shadow: e.target.checked })}
                      className="w-4 h-4 rounded border-[#2d2a4a] bg-[#0C0A1F] text-[#9929EA]"
                    />
                    <label className="text-gray-400 text-sm">Add Shadow</label>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#2d2a4a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">Select an element to edit</p>
              </div>
            )}
          </div>

      {/* Message Toast */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg ${
              message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Export JSON</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-auto mb-4">
                <pre className="bg-[#0C0A1F] p-4 rounded-xl text-green-400 text-sm overflow-auto max-h-[50vh]">
                  {jsonCode}
                </pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyJSON}
                  className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#3d3a5a] transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={handleDownloadJSON}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Download File
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl p-6 w-full max-w-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Import JSON</h2>

              <div className="mb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-[#2d2a4a] rounded-xl text-gray-400 hover:border-[#9929EA] hover:text-[#9929EA] transition-colors"
                >
                  Click to upload JSON file
                </button>
              </div>

              <div className="mb-4">
                <label className="text-gray-400 text-sm block mb-2">Or paste JSON directly:</label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder='[{"type": "container", ...}]'
                  className="w-full h-48 px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white text-sm resize-none font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#3d3a5a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportJSON}
                  disabled={!importJson}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

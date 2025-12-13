'use client';

import { useState, useRef } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Block {
  id: string;
  type: 'container' | 'text' | 'image' | 'video' | 'button';
  parentId: string | null;
  props: Record<string, any>;
}

/** Generate hierarchical JSON tree with children */
interface BlockWithChildren extends Block {
  children: BlockWithChildren[];
}

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
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
const adjustContainerSize = (containerId: string) => {
  setBlocks((prev) => {
    const updated = [...prev];
    const container = updated.find((b) => b.id === containerId);
    if (!container) return prev;

    const children = updated.filter((b) => b.parentId === containerId);
    if (children.length === 0) return prev;

    // Calculate max width and height required
    let maxWidth = 0;
    let maxHeight = 0;
    children.forEach((child) => {
      const rightEdge = (child.props.x || 0) + (child.props.width || 0);
      const bottomEdge = (child.props.y || 0) + (child.props.height || 0);
      if (rightEdge > maxWidth) maxWidth = rightEdge;
      if (bottomEdge > maxHeight) maxHeight = bottomEdge;
    });

    // Add some padding if you want
    const padding = 10;
    container.props.width = Math.max(container.props.width || 0, maxWidth + padding);
    container.props.height = Math.max(container.props.height || 0, maxHeight + padding);

    return updated;
  });
};

  /** Add new block */
  const addBlock = (type: Block['type'], parentId: string | null = null) => {
const newBlock: Block = {
  id: Math.random().toString(36).substr(2, 9),
  type,
  parentId,
  props:
    type === 'container'
      ? { 
          width: 300, 
          height: 150, 
          backgroundColor: '#f8f8f8', 
          x: 0, 
          y: 0, 
          borderRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, 
          clipPath: '', 
          shape: 'rectangle',
          position: 'relative',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          fixedOnTop: false,
          isFixed: false,
          fixedPosition: 'top', // or 'bottom'
          zIndex: 1000,
        }
      : type === 'button'
      ? {
          text: 'Click Me',
          backgroundColor: '#007bff',
          color: '#fff',
          width: 120,
          height: 40,
          x: 0,
          y: 0,
          actionType: 'scroll',
          targetId: null,
          url: '',
          isFixed: false,
          fixedPosition: 'bottom-right',
          zIndex: 1000,
        }
      : type === 'text'
      ? { text: 'New Text', fontSize: 18, color: '#000', x: 0, y: 0 }
      : { src: '', width: 150, height: 100, x: 0, y: 0 },
};

    setBlocks((prev) => [...prev, newBlock]);
    if (type !== 'container') setSelected(newBlock.id);
  };

  /** Update block props */
const updateBlock = (id: string, updatedProps: Record<string, any>) => {
  setBlocks((prev) =>
    prev.map((b) =>
      b.id === id ? { ...b, props: { ...b.props, ...updatedProps } } : b
    )
  );

  const block = blocks.find(b => b.id === id);
  if (block?.parentId) {
    adjustContainerSize(block.parentId);
  }
};

  /** Handle drag end for nesting inside containers */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeBlock = blocks.find((b) => b.id === active.id);
    if (!activeBlock) return;

    const overBlock = blocks.find((b) => b.id === over.id);
    if (!overBlock) return;

    if (overBlock.type === 'container') {
      setBlocks((prev:any) =>
        prev.map((b:any) =>
          b.id === active.id
            ? {
                ...b,
                parentId: over.id,
                props: {
                  ...b.props,
                  x: 10,
                  y: 10,
                },
              }
            : b
        )
      );
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selected);
const deleteBlock = (id: string) => {
  setBlocks((prev) => {
    // Find all blocks to delete recursively
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

  // Clear selection if the deleted block was selected
  if (selected === id) setSelected(null);
};


  /** Recursive rendering */
const renderBlocks = (parentId: string | null = null) =>
  blocks
    .filter((b) => b.parentId === parentId)
    .map((block) => (
      <Rnd
        key={block.id}
        size={{ width: block.props.width, height: block.props.height }}
        position={{ x: block.props.x || 0, y: block.props.y || 0 }}
          // When dragging a block
  onDragStop={(e, d) => {
    updateBlock(block.id, { x: d.x, y: d.y }); // Use d.x / d.y directly
  }}

          onResizeStop={(e, dir, ref) => {
            let width = ref.offsetWidth;
            let height = ref.offsetHeight;

            updateBlock(block.id, { width, height });
            
            // Adjust parent container size if needed
            if (block.parentId) adjustContainerSize(block.parentId);
          }}
        bounds="parent"
        enableResizing={true} // now all blocks can be resized
        className={`relative border ${selected === block.id ? 'border-blue-500' : 'border-gray-300'}`}
        style={{
          backgroundColor: block.props.backgroundColor || 'transparent',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          borderRadius: block.props.clipPath
            ? '0px'
            : block.props.shape === 'circle'
            ? '50%'
            : block.props.shape === 'rounded'
            ? '20px'
            : block.props.shape === 'banner'
            ? '8px'
            : `${block.props.borderRadius?.topLeft || 0}px ${block.props.borderRadius?.topRight || 0}px ${block.props.borderRadius?.bottomRight || 0}px ${block.props.borderRadius?.bottomLeft || 0}px`,
          clipPath: block.props.clipPath || undefined,
position: block.props.isFixed ? 'fixed' : (block.props.position || 'absolute'),
top: block.props.isFixed && (block.props.fixedPosition.includes('top') ? 0 : undefined),
bottom: block.props.isFixed && (block.props.fixedPosition.includes('bottom') ? 0 : undefined),
left: block.props.isFixed && (block.props.fixedPosition.includes('left') ? 0 : block.props.fixedPosition.includes('center') ? '50%' : undefined),
right: block.props.isFixed && (block.props.fixedPosition.includes('right') ? 0 : undefined),
transform: block.props.isFixed && block.props.fixedPosition.includes('center') ? 'translateX(-50%)' : undefined,
zIndex: block.props.isFixed ? block.props.zIndex || 1000 : undefined,
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          setSelected(block.id);
        }}
      >
        <div
          ref={(el) => {
            if (block.type === 'container') containerRefs.current[block.id] = el;
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {block.type === 'text' && (
            <p
              style={{
                fontSize: block.props.fontSize,
                color: block.props.color,
                textAlign: 'center',
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
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
              }}
              onClick={() => {
                if (block.props.actionType === 'scroll' && block.props.targetId) {
                  const targetEl = containerRefs.current[block.props.targetId];
                  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                if (block.props.actionType === 'link' && block.props.url) {
                  window.open(block.props.url, '_blank');
                }
              }}
            >
              {block.props.text}
            </button>
          )}

          {block.type === 'image' && block.props.src && (
            <img src={block.props.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {block.type === 'video' && block.props.src && (
            <video src={block.props.src} style={{ width: '100%', height: '100%' }} controls />
          )}

          {renderBlocks(block.id)}
        </div>
      </Rnd>
    ));


  /** Generate JSON */
  const handleGenerateJSON = () => {
    const jsonTree = generatePageTree(blocks).map(block => {
      const addClipPath = (b: BlockWithChildren): BlockWithChildren => ({
        ...b,
        props: { ...b.props, clipPath: b.props.clipPath || '' },
        children: b.children.map(addClipPath),
      });
      return addClipPath(block);
    });
    console.log('JSON Tree with clip-path:', jsonTree);
    alert('Check console for JSON with clip-path included');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Toolbar */}
      <div className="w-1/5 bg-white border-r p-4 space-y-2 overflow-y-auto">
        <h2 className="font-semibold mb-2">Add Block</h2>
        <Button onClick={() => addBlock('container')}>Add Container</Button>
        <Button
          onClick={() => selectedBlock?.type === 'container' && addBlock('text', selected)}
        >
          Add Text
        </Button>
        <Button
          onClick={() => selectedBlock?.type === 'container' && addBlock('image', selected)}
        >
          Add Image
        </Button>
        <Button
          onClick={() => selectedBlock?.type === 'container' && addBlock('video', selected)}
        >
          Add Video
        </Button>
        <Button
          onClick={() => selectedBlock?.type === 'container' && addBlock('button', selected)}
        >
          Add Button
        </Button>
        <Button
          className="mt-4 bg-green-600 hover:bg-green-700 text-white w-full"
          onClick={handleGenerateJSON}
        >
          Generate JSON
        </Button>

        <h2 className="font-semibold mb-2">Go To Container</h2>
        <div className="flex flex-col gap-2 mb-4">
          {blocks
            .filter(b => b.type === 'container')
            .map(container => (
              <Button
                key={container.id}
                size="sm"
                onClick={() => {
                  const el = containerRefs.current[container.id];
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                {container.id.slice(0, 5)}
              </Button>
            ))}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="flex-1 p-6 overflow-y-auto"
        onClick={() => setSelected(null)}
      >
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div
            id="canvas-area"
            className="relative border-2 border-dashed border-gray-400 bg-white rounded transition-all duration-300"
            style={{
              width: '100%',
              minHeight: `${Math.max(
                800,
                ...blocks.map((b) => (b.props.y || 0) + (b.props.height || 0) + 100)
              )}px`,
              padding: '20px',
              position: 'relative',
            }}
          >
            {blocks.length === 0 ? (
              <p className="text-gray-400 text-center">Add blocks to start</p>
            ) : (
              renderBlocks()
            )}
          </div>
        </DndContext>
      </div>

      {/* Customization Panel */}
      <div className="w-1/4 bg-white border-l p-4 overflow-y-auto">
        <h2 className="font-semibold mb-4">Customize</h2>
        {selectedBlock ? (
          <>
            <p className="mb-2 font-medium">Editing: {selectedBlock.type}</p>

            {/* Width / Height */}
            {'width' in selectedBlock.props && (
              <>
                <label className="block text-sm font-medium">Width</label>
                <Input
                  type="number"
                  value={selectedBlock.props.width}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { width: Number(e.target.value) })
                  }
                  className="mb-2"
                />
                <label className="block text-sm font-medium">Height</label>
                <Input
                  type="number"
                  value={selectedBlock.props.height}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { height: Number(e.target.value) })
                  }
                  className="mb-2"
                />
              </>
            )}

            {/* Text */}
            {selectedBlock.type === 'text' && (
              <>
                <label className="block text-sm font-medium">Text</label>
                <Input
                  value={selectedBlock.props.text}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { text: e.target.value })
                  }
                  className="mb-2"
                />
                <label className="block text-sm font-medium">Font Size</label>
                <Input
                  type="number"
                  value={selectedBlock.props.fontSize}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })
                  }
                  className="mb-2"
                />
                <label className="block text-sm font-medium">Color</label>
                <Input
                  type="color"
                  value={selectedBlock.props.color}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { color: e.target.value })
                  }
                  className="mb-2"
                />
              </>
            )}

            {/* Image / Video */}
            {(selectedBlock.type === 'image' || selectedBlock.type === 'video') && (
              <>
                <label className="block text-sm font-medium">Source URL</label>
                <Input
                  value={selectedBlock.props.src}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { src: e.target.value })
                  }
                  className="mb-2"
                />
              </>
            )}

            {/* Button customization */}
            {selectedBlock.type === 'button' && (
              <>
                <label className="block text-sm font-medium">Text</label>
                <Input
                  value={selectedBlock.props.text}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { text: e.target.value })
                  }
                  className="mb-2"
                />
                <label className="block text-sm font-medium">Background Color</label>
                <Input
                  type="color"
                  value={selectedBlock.props.backgroundColor}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { backgroundColor: e.target.value })
                  }
                  className="mb-2"
                />
                <label className="block text-sm font-medium">Text Color</label>
                <Input
                  type="color"
                  value={selectedBlock.props.color}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { color: e.target.value })
                  }
                  className="mb-2"
                />

                <label className="block text-sm font-medium">Action Type</label>
                <select
                  value={selectedBlock.props.actionType || 'scroll'}
                  onChange={(e) => updateBlock(selectedBlock.id, { actionType: e.target.value })}
                  className="border rounded p-1 mb-2 w-full"
                >
                  <option value="scroll">Scroll to Container</option>
                  <option value="link">Open URL</option>
                </select>

                {selectedBlock.props.actionType === 'scroll' && (
                  <select
                    value={selectedBlock.props.targetId || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { targetId: e.target.value })}
                    className="border rounded p-1 mb-2 w-full"
                  >
                    <option value="">Select Container</option>
                    {blocks.filter(b => b.type === 'container').map(c => (
                      <option key={c.id} value={c.id}>{c.id.slice(0,5)}</option>
                    ))}
                  </select>
                )}

                {selectedBlock.props.actionType === 'link' && (
                  <>
                    <label className="block text-sm font-medium">URL</label>
                    <Input
                      value={selectedBlock.props.url || ''}
                      onChange={(e) => updateBlock(selectedBlock.id, { url: e.target.value })}
                      className="mb-2"
                    />
                  </>
                )}
              </>
            )}

            {/* Container customization (background, shapes, clip-path) */}
            {selectedBlock.type === 'container' && (
              <>
                <label className="block text-sm font-medium">Background</label>
                <Input
                  type="color"
                  value={selectedBlock.props.backgroundColor}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { backgroundColor: e.target.value })
                  }
                  className="mb-2"
                />
                {/* ...shape, clip-path, position, offsets same as before */}
              </>
            )}
            {/* Position Controls */}
{['container', 'text', 'button', 'image', 'video'].includes(selectedBlock.type) && (
  <>
    <label className="block text-sm font-medium mt-2">Position X</label>
    <Input
      type="number"
      value={selectedBlock.props.x || 0}
      onChange={(e) => updateBlock(selectedBlock.id, { x: Number(e.target.value) })}
      className="mb-2"
    />
    <label className="block text-sm font-medium">Position Y</label>
    <Input
      type="number"
      value={selectedBlock.props.y || 0}
      onChange={(e) => updateBlock(selectedBlock.id, { y: Number(e.target.value) })}
      className="mb-2"
    />
  </>
)}
<Button
  className="mt-4 bg-red-600 hover:bg-red-700 text-white w-full"
  onClick={() => deleteBlock(selectedBlock.id)}
>
  Delete
</Button>
{/* Sticky / Fixed Position Controls */}
{['container', 'button'].includes(selectedBlock.type) && (
  <>
    <div className="mt-3 border-t pt-3">
      <label className="block text-sm font-medium mb-1">Fix Position</label>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={!!selectedBlock.props.isFixed}
          onChange={(e) => updateBlock(selectedBlock.id, { isFixed: e.target.checked })}
        />
        <span className="text-sm">Make Fixed</span>
      </div>

      {selectedBlock.props.isFixed && (
        <>
          <label className="block text-sm font-medium mb-1">Fixed Position</label>
          <select
            value={selectedBlock.props.fixedPosition}
            onChange={(e) => updateBlock(selectedBlock.id, { fixedPosition: e.target.value })}
            className="border rounded p-1 mb-2 w-full"
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="top-center">Top Center</option>
            <option value="bottom-center">Bottom Center</option>
          </select>

          <label className="block text-sm font-medium mb-1">Z-Index</label>
          <Input
            type="number"
            value={selectedBlock.props.zIndex || 1000}
            onChange={(e) => updateBlock(selectedBlock.id, { zIndex: Number(e.target.value) })}
            className="mb-2"
          />
        </>
      )}
    </div>
  </>
)}
          </>
        ) : (
          <p className="text-gray-400 text-sm">Select a block to edit</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Youtube from '@tiptap/extension-youtube';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
  type ChangeEvent,
  type ClipboardEvent,
} from 'react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
  Youtube as YoutubeIcon,
  TableIcon,
  Minus,
  Quote,
  CodeSquare,
  Highlighter,
  RemoveFormatting,
  FileCode2,
  Eye,
  ChevronDown,
  X,
  Upload,
  Globe,
  Unlink,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string>;
  autoLinkify?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const URL_REGEX =
  /https?:\/\/[^\s<>"')\]]+/gi;

function linkifyText(text: string): string {
  return text.replace(URL_REGEX, (url) => `<a href="${url}">${url}</a>`);
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function TBtn({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-zinc-700 mx-1 self-center shrink-0" />;
}

// ---------------------------------------------------------------------------
// Heading dropdown
// ---------------------------------------------------------------------------

function HeadingDropdown({
  editor,
}: {
  editor: ReturnType<typeof useEditor>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!editor) return null;

  const current = editor.isActive('heading', { level: 1 })
    ? 'H1'
    : editor.isActive('heading', { level: 2 })
      ? 'H2'
      : editor.isActive('heading', { level: 3 })
        ? 'H3'
        : editor.isActive('heading', { level: 4 })
          ? 'H4'
          : 'Paragraph';

  const items = [
    { label: 'Paragraph', action: () => editor.chain().focus().setParagraph().run() },
    {
      label: 'H1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'H4',
      action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1.5 rounded text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        {current}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 transition-colors ${
                current === item.label
                  ? 'text-emerald-400'
                  : 'text-zinc-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Link popup (inline toolbar popup)
// ---------------------------------------------------------------------------

function LinkPopup({
  editor,
  onClose,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  onClose: () => void;
}) {
  const existingHref = editor.getAttributes('link').href || '';
  const [url, setUrl] = useState(existingHref);

  function handleSet() {
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url, target: '_blank' })
        .run();
    }
    onClose();
  }

  function handleRemove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  }

  return (
    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-xl">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder:text-zinc-500 w-64 outline-none focus:border-emerald-500"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSet();
          if (e.key === 'Escape') onClose();
        }}
        autoFocus
      />
      <button
        type="button"
        onClick={handleSet}
        className="px-3 py-1 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
      >
        Set Link
      </button>
      {existingHref && (
        <button
          type="button"
          onClick={handleRemove}
          className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
          title="Remove link"
        >
          <Unlink className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image modal
// ---------------------------------------------------------------------------

function ImageModal({
  onInsert,
  onClose,
  onImageUpload,
}: {
  onInsert: (src: string, alt: string) => void;
  onClose: () => void;
  onImageUpload?: (file: File) => Promise<string>;
}) {
  const [tab, setTab] = useState<'upload' | 'url'>(onImageUpload ? 'upload' : 'url');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!onImageUpload) return;
    setUploading(true);
    try {
      const uploadedUrl = await onImageUpload(file);
      setUrl(uploadedUrl);
      setTab('url');
    } catch {
      // upload failed silently
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-200">Insert Image</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          {onImageUpload && (
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'upload'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Upload
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'url'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            URL
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {tab === 'upload' && onImageUpload && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploading ? (
                <p className="text-sm text-zinc-400">Uploading...</p>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">
                    Drop an image here or click to browse
                  </p>
                </>
              )}
            </div>
          )}

          {tab === 'url' && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Image URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Alt text</label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (url) onInsert(url, alt);
              onClose();
            }}
            disabled={!url}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// YouTube modal
// ---------------------------------------------------------------------------

function YouTubeModal({
  onInsert,
  onClose,
}: {
  onInsert: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-200">Embed YouTube Video</h3>
          <button type="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <label className="block text-xs text-zinc-400 mb-1">YouTube URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url) {
                onInsert(url);
                onClose();
              }
            }}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (url) onInsert(url);
              onClose();
            }}
            disabled={!url}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Embed
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor component
// ---------------------------------------------------------------------------

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  minHeight = '400px',
  onImageUpload,
  autoLinkify = true,
}: TipTapEditorProps) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(content);
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);

  // Track whether the content prop changed externally
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: autoLinkify,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-emerald-400 underline underline-offset-2 hover:text-emerald-300',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full mx-auto block my-4',
        },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-500/30 rounded px-0.5',
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Youtube.configure({
        HTMLAttributes: {
          class: 'rounded-lg overflow-hidden my-4 mx-auto',
        },
        width: 640,
        height: 360,
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'outline-none',
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items;
        if (items && onImageUpload) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                onImageUpload(file).then((url) => {
                  editor?.chain().focus().setImage({ src: url }).run();
                });
              }
              return true;
            }
          }
        }

        // Handle plain-text paste with URL auto-linkification
        if (autoLinkify) {
          const text = event.clipboardData?.getData('text/plain');
          const html = event.clipboardData?.getData('text/html');
          if (text && !html && URL_REGEX.test(text)) {
            event.preventDefault();
            const linked = linkifyText(text);
            editor?.chain().focus().insertContent(linked).run();
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setHtmlSource(html);
      onChange(html);
    },
  });

  // Sync content prop changes into the editor
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content, { emitUpdate: false });
      setHtmlSource(content);
      isExternalUpdate.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Update editable state
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  // Toggle HTML mode
  const toggleHtmlMode = useCallback(() => {
    if (htmlMode && editor) {
      // Switching from HTML -> Visual: push HTML source into editor
      editor.commands.setContent(htmlSource, { emitUpdate: false });
      onChange(htmlSource);
    } else if (editor) {
      // Switching from Visual -> HTML
      setHtmlSource(editor.getHTML());
    }
    setHtmlMode((v) => !v);
  }, [htmlMode, editor, htmlSource, onChange]);

  if (!editor) return null;

  return (
    <div className="border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900/60">
      {/* ---- Toolbar ---- */}
      {editable && (
        <div className="sticky top-0 z-40 bg-zinc-800/80 backdrop-blur border-b border-zinc-700 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
          {/* Undo / Redo */}
          <TBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </TBtn>

          <Separator />

          {/* Text format */}
          <TBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          >
            <Code className="w-4 h-4" />
          </TBtn>

          <Separator />

          {/* Headings */}
          <HeadingDropdown editor={editor} />

          <Separator />

          {/* Alignment */}
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            <AlignLeft className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            <AlignCenter className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            <AlignRight className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            active={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </TBtn>

          <Separator />

          {/* Lists */}
          <TBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered list"
          >
            <ListOrdered className="w-4 h-4" />
          </TBtn>

          <Separator />

          {/* Insert */}
          <TBtn
            onClick={() => setShowLinkPopup((v) => !v)}
            active={editor.isActive('link')}
            title="Insert link"
          >
            <LinkIcon className="w-4 h-4" />
          </TBtn>
          <TBtn onClick={() => setShowImageModal(true)} title="Insert image">
            <ImageIcon className="w-4 h-4" />
          </TBtn>
          <TBtn onClick={() => setShowYouTubeModal(true)} title="Embed YouTube">
            <YoutubeIcon className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            title="Insert table"
          >
            <TableIcon className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            <Minus className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </TBtn>
          <TBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block"
          >
            <CodeSquare className="w-4 h-4" />
          </TBtn>

          <Separator />

          {/* Highlight */}
          <TBtn
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </TBtn>

          {/* Clear formatting */}
          <TBtn
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title="Clear formatting"
          >
            <RemoveFormatting className="w-4 h-4" />
          </TBtn>

          <Separator />

          {/* Visual / HTML toggle */}
          <div className="ml-auto flex items-center">
            <TBtn onClick={toggleHtmlMode} active={htmlMode} title={htmlMode ? 'Visual mode' : 'HTML mode'}>
              {htmlMode ? (
                <Eye className="w-4 h-4" />
              ) : (
                <FileCode2 className="w-4 h-4" />
              )}
            </TBtn>
          </div>
        </div>
      )}

      {/* ---- Link popup (toolbar-level) ---- */}
      {showLinkPopup && (
        <div className="px-2 py-2 border-b border-zinc-700 bg-zinc-800/60">
          <LinkPopup editor={editor} onClose={() => setShowLinkPopup(false)} />
        </div>
      )}

      {/* ---- Link edit bar (shows when cursor is on a link) ---- */}
      {editor && editable && editor.isActive('link') && (
        <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 shadow-xl mx-4 mb-1">
          <span className="text-xs text-zinc-400 max-w-[200px] truncate">
            {editor.getAttributes('link').href}
          </span>
          <a
            href={editor.getAttributes('link').href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors"
            title="Open link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => setShowLinkPopup(true)}
            className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors"
            title="Edit link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
            className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
            title="Remove link"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ---- Editor / HTML area ---- */}
      {htmlMode ? (
        <textarea
          value={htmlSource}
          onChange={(e) => setHtmlSource(e.target.value)}
          onBlur={() => {
            editor.commands.setContent(htmlSource, { emitUpdate: false });
            onChange(htmlSource);
          }}
          className="w-full bg-zinc-900 text-zinc-300 font-mono text-sm p-4 outline-none resize-y"
          style={{ minHeight }}
          spellCheck={false}
        />
      ) : (
        <div
          className="tiptap-editor-content"
          style={{ minHeight }}
        >
          <EditorContent editor={editor} />
        </div>
      )}

      {/* ---- Image modal ---- */}
      {showImageModal && (
        <ImageModal
          onImageUpload={onImageUpload}
          onInsert={(src, alt) => {
            editor.chain().focus().setImage({ src, alt }).run();
          }}
          onClose={() => setShowImageModal(false)}
        />
      )}

      {/* ---- YouTube modal ---- */}
      {showYouTubeModal && (
        <YouTubeModal
          onInsert={(url) => {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
          }}
          onClose={() => setShowYouTubeModal(false)}
        />
      )}

      {/* ---- Scoped styles ---- */}
      <style jsx global>{`
        .tiptap-editor-content .tiptap {
          padding: 1.5rem;
          color: #e4e4e7;
          min-height: ${minHeight};
        }

        .tiptap-editor-content .tiptap:focus {
          outline: none;
        }

        .tiptap-editor-content .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }

        .tiptap-editor-content .tiptap h1 {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 1.5rem 0 0.75rem;
          color: #fafafa;
        }

        .tiptap-editor-content .tiptap h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 1.25rem 0 0.5rem;
          color: #fafafa;
        }

        .tiptap-editor-content .tiptap h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 1rem 0 0.5rem;
          color: #fafafa;
        }

        .tiptap-editor-content .tiptap h4 {
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 1rem 0 0.5rem;
          color: #e4e4e7;
        }

        .tiptap-editor-content .tiptap p {
          margin: 0.5rem 0;
          line-height: 1.7;
        }

        .tiptap-editor-content .tiptap a {
          color: #34d399;
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }

        .tiptap-editor-content .tiptap a:hover {
          color: #6ee7b7;
        }

        .tiptap-editor-content .tiptap img {
          max-width: 100%;
          border-radius: 0.5rem;
          display: block;
          margin: 1rem auto;
        }

        .tiptap-editor-content .tiptap blockquote {
          border-left: 3px solid #34d399;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #a1a1aa;
          font-style: italic;
        }

        .tiptap-editor-content .tiptap code {
          background: #27272a;
          color: #f87171;
          padding: 0.15rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
        }

        .tiptap-editor-content .tiptap pre {
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }

        .tiptap-editor-content .tiptap pre code {
          background: none;
          color: #e4e4e7;
          padding: 0;
          border-radius: 0;
          font-size: 0.875rem;
        }

        .tiptap-editor-content .tiptap ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .tiptap-editor-content .tiptap ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .tiptap-editor-content .tiptap li {
          margin: 0.25rem 0;
        }

        .tiptap-editor-content .tiptap hr {
          border: none;
          border-top: 1px solid #3f3f46;
          margin: 1.5rem 0;
        }

        .tiptap-editor-content .tiptap table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }

        .tiptap-editor-content .tiptap th,
        .tiptap-editor-content .tiptap td {
          border: 1px solid #3f3f46;
          padding: 0.5rem 0.75rem;
          text-align: left;
        }

        .tiptap-editor-content .tiptap th {
          background: #27272a;
          font-weight: 600;
          color: #fafafa;
        }

        .tiptap-editor-content .tiptap td {
          background: #18181b;
        }

        .tiptap-editor-content .tiptap .tableWrapper {
          overflow-x: auto;
          margin: 1rem 0;
        }

        .tiptap-editor-content .tiptap iframe {
          border-radius: 0.5rem;
          margin: 1rem auto;
          display: block;
          max-width: 100%;
        }

        .tiptap-editor-content .tiptap .selectedCell {
          background: rgba(52, 211, 153, 0.1);
        }
      `}</style>
    </div>
  );
}

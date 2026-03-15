'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Clock,
  Globe,
  Mail,
  FileText,
  Eye,
  Code,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Calendar,
  ChevronDown,
  Loader2,
  Search,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuestPost {
  _id: string;
  title: string;
  body: string;
  status: 'published' | 'draft' | 'expired';
  expiresAt: string;
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  authorName: string;
  schemaMarkup: { type: string; data: { guestEmail: string } };
  wordCount: number;
  createdAt: string;
}

interface Domain {
  _id: string;
  name: string;
  domain: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysRemaining(expiresAt: string): number {
  const now = new Date();
  const exp = new Date(expiresAt);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    draft: 'bg-zinc-700/40 text-zinc-400 border-zinc-600',
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status] ?? map.draft;
}

function linkifyText(text: string): string {
  return text
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-emerald-400 underline">$1</a>')
    .replace(/\n/g, '<br>');
}

function linkifyHtml(html: string): string {
  // Wrap plain-text URLs that are NOT already inside an <a> tag
  // Split by existing tags to avoid double-wrapping
  const parts = html.split(/(<a\b[^>]*>.*?<\/a>)/gi);
  return parts
    .map((part) => {
      if (/^<a\b/i.test(part)) return part;
      return part.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-emerald-400 underline">$1</a>');
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Expiring Banner
// ---------------------------------------------------------------------------

function ExpiringBanner({ posts }: { posts: GuestPost[] }) {
  if (posts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-2"
    >
      {posts.map((p) => {
        const days = daysRemaining(p.expiresAt);
        const isUrgent = days <= 1;
        return (
          <div
            key={p._id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
              isUrgent
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
            }`}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              &ldquo;{p.title}&rdquo; on <span className="font-semibold">{p.websiteName}</span> expires in{' '}
              <span className="font-bold">{days <= 0 ? 'today' : `${days}d`}</span>
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ContentEditor — contentEditable with paste handling + visual/html toggle
// ---------------------------------------------------------------------------

function ContentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [htmlSource, setHtmlSource] = useState(value);

  // Keep local html in sync with external value only when value identity changes
  useEffect(() => {
    setHtmlSource(value);
  }, [value]);

  // Sync visual editor content when switching to visual mode
  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = htmlSource;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    let html = e.clipboardData.getData('text/html');
    if (!html) {
      const text = e.clipboardData.getData('text/plain');
      html = linkifyText(text);
    } else {
      html = linkifyHtml(html);
    }
    document.execCommand('insertHTML', false, html);
    syncFromEditor();
  };

  const syncFromEditor = () => {
    if (editorRef.current) {
      const h = editorRef.current.innerHTML;
      setHtmlSource(h);
      onChange(h);
    }
  };

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    syncFromEditor();
  };

  return (
    <div className="flex flex-col rounded-lg border border-zinc-700 bg-zinc-900/60 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-zinc-700 bg-zinc-800/60 px-3 py-2 flex-wrap">
        <button type="button" onClick={() => execCmd('bold')} className="rounded p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition" title="Bold"><Bold className="h-4 w-4" /></button>
        <button type="button" onClick={() => execCmd('italic')} className="rounded p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition" title="Italic"><Italic className="h-4 w-4" /></button>
        <div className="mx-1 h-5 w-px bg-zinc-700" />
        <button type="button" onClick={() => execCmd('formatBlock', 'h1')} className="rounded p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition" title="Heading 1"><Heading1 className="h-4 w-4" /></button>
        <button type="button" onClick={() => execCmd('formatBlock', 'h2')} className="rounded p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition" title="Heading 2"><Heading2 className="h-4 w-4" /></button>
        <div className="mx-1 h-5 w-px bg-zinc-700" />
        <button type="button" onClick={() => execCmd('insertUnorderedList')} className="rounded p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition" title="Bullet list"><List className="h-4 w-4" /></button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} className="rounded p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition" title="Numbered list"><ListOrdered className="h-4 w-4" /></button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (mode === 'visual') syncFromEditor();
              setMode('visual');
            }}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${mode === 'visual' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Eye className="h-3.5 w-3.5" /> Visual
          </button>
          <button
            type="button"
            onClick={() => {
              syncFromEditor();
              setMode('html');
            }}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${mode === 'html' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Code className="h-3.5 w-3.5" /> HTML
          </button>
        </div>
      </div>

      {/* Editor */}
      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={handlePaste}
          onInput={syncFromEditor}
          className="prose prose-invert prose-sm max-w-none min-h-[240px] px-4 py-3 outline-none focus:ring-1 focus:ring-emerald-500/40 [&_a]:text-emerald-400 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: htmlSource }}
        />
      ) : (
        <textarea
          value={htmlSource}
          onChange={(e) => {
            setHtmlSource(e.target.value);
            onChange(e.target.value);
          }}
          className="min-h-[240px] resize-y bg-transparent px-4 py-3 font-mono text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-emerald-500/40"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WebsiteSelector — searchable dropdown
// ---------------------------------------------------------------------------

function WebsiteSelector({
  domains,
  value,
  onChange,
}: {
  domains: Domain[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = domains.find((d) => d._id === value);

  const filtered = domains.filter((d) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.domain.toLowerCase().includes(q);
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">Website</label>
      <div ref={containerRef} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-left outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <Globe className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span className="text-zinc-200 truncate">{selected.name}</span>
              <span className="text-zinc-500 text-xs truncate">({selected.domain})</span>
            </span>
          ) : (
            <span className="text-zinc-500">Select website...</span>
          )}
          <ChevronDown className={`h-4 w-4 text-zinc-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl overflow-hidden"
            >
              {/* Search input */}
              <div className="p-2 border-b border-zinc-700">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or domain..."
                    className="w-full rounded-md border border-zinc-600 bg-zinc-900 pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-500/50 transition"
                  />
                </div>
              </div>

              {/* Options list */}
              <div className="max-h-52 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-zinc-500">No websites found</div>
                ) : (
                  filtered.map((d) => (
                    <button
                      key={d._id}
                      type="button"
                      onClick={() => {
                        onChange(d._id);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                        value === d._id
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'text-zinc-300 hover:bg-zinc-700/60'
                      }`}
                    >
                      <Globe className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{d.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{d.domain}</p>
                      </div>
                      {value === d._id && (
                        <div className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostModal — Create / Edit
// ---------------------------------------------------------------------------

function PostModal({
  post,
  domains,
  onClose,
  onSaved,
}: {
  post: GuestPost | null;
  domains: Domain[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!post;
  const [saving, setSaving] = useState(false);

  const [websiteId, setWebsiteId] = useState(post?.websiteId ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [guestEmail, setGuestEmail] = useState(post?.schemaMarkup?.data?.guestEmail ?? '');
  const [expiresAt, setExpiresAt] = useState(post?.expiresAt ? post.expiresAt.slice(0, 10) : '');
  const [body, setBody] = useState(post?.body ?? '');

  const handleSubmit = async () => {
    if (!websiteId || !title || !expiresAt) return;
    setSaving(true);
    try {
      const payload = { websiteId, title, body, guestEmail, expiresAt: new Date(expiresAt).toISOString() };
      const url = isEdit ? `/api/admin/guest-posts/${post._id}` : '/api/admin/guest-posts';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isEdit ? { ...payload, status: post.status } : payload) });
      if (res.ok) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-zinc-900 border-l border-zinc-800 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">{isEdit ? 'Edit Guest Post' : 'New Guest Post'}</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 space-y-5 px-6 py-5">
          {/* Website — searchable dropdown */}
          <WebsiteSelector
            domains={domains}
            value={websiteId}
            onChange={setWebsiteId}
          />

          {/* Guest Email */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Guest Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="guest@example.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 pl-10 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Expiry Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 pl-10 pr-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Guest blog title..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Content</label>
            <ContentEditor value={body} onChange={setBody} />
            <p className="mt-1.5 text-xs text-zinc-600">Paste content from Google Docs or any source. URLs will be auto-linked.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !websiteId || !title || !expiresAt}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Post'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeleteDialog
// ---------------------------------------------------------------------------

function DeleteDialog({
  post,
  onClose,
  onDeleted,
}: {
  post: GuestPost;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/guest-posts/${post._id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-100">Delete Guest Post</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Are you sure you want to delete &ldquo;{post.title}&rdquo;? This action cannot be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40 transition"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineExpiryEditor
// ---------------------------------------------------------------------------

function InlineExpiryEditor({
  postId,
  currentDate,
  onUpdated,
}: {
  postId: string;
  currentDate: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentDate.slice(0, 10));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/guest-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: new Date(value).toISOString() }),
      });
      if (res.ok) {
        onUpdated();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-zinc-500 hover:text-emerald-400 transition underline decoration-dotted underline-offset-2"
        title="Click to edit expiry"
      >
        {new Date(currentDate).toLocaleDateString()}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500/50 [color-scheme:dark]"
      />
      <button onClick={save} disabled={saving} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-40 transition">
        {saving ? '...' : 'Save'}
      </button>
      <button onClick={() => setEditing(false)} className="rounded px-1.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function GuestPostsPage() {
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [expiringPosts, setExpiringPosts] = useState<GuestPost[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'expired'>('all');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editPost, setEditPost] = useState<GuestPost | null>(null);
  const [deletePost, setDeletePost] = useState<GuestPost | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const [postsRes, expiringRes] = await Promise.all([
        fetch(`/api/admin/guest-posts?${params.toString()}`),
        fetch('/api/admin/guest-posts?expiring=true'),
      ]);
      const [postsData, expiringData] = await Promise.all([postsRes.json(), expiringRes.json()]);
      setPosts(postsData.posts ?? []);
      setExpiringPosts(expiringData.posts ?? []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/domains');
      const data = await res.json();
      setDomains(data.domains ?? []);
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchDomains();
  }, [fetchPosts, fetchDomains]);

  const filteredPosts = posts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.websiteName?.toLowerCase().includes(q) ||
      p.schemaMarkup?.data?.guestEmail?.toLowerCase().includes(q)
    );
  });

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
    expired: posts.filter((p) => p.status === 'expired').length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Guest Posts</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage guest blog content with auto-expiry</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/20"
          >
            <Plus className="h-4 w-4" />
            New Guest Post
          </button>
        </motion.div>

        {/* Expiring Banner */}
        <ExpiringBanner posts={expiringPosts} />

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Status tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            {(['all', 'published', 'draft', 'expired'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  statusFilter === s
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s} {counts[s] > 0 && <span className="ml-1 text-zinc-600">({counts[s]})</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-10 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
            />
          </div>
        </motion.div>

        {/* Post Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 py-20 text-center"
          >
            <FileText className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">No guest posts found</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            >
              <Plus className="h-4 w-4" />
              Create your first guest post
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post, i) => {
                const days = daysRemaining(post.expiresAt);
                const email = post.schemaMarkup?.data?.guestEmail ?? post.authorName ?? '';
                return (
                  <motion.div
                    key={post._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-700 transition"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug">{post.title}</h3>
                      <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge(post.status)}`}>
                        {post.status}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1.5 text-xs text-zinc-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{post.websiteName ?? post.websiteDomain}</span>
                      </div>
                      {email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          Expires:{' '}
                          <InlineExpiryEditor postId={post._id} currentDate={post.expiresAt} onUpdated={fetchPosts} />
                          {' '}
                          <span className={`font-medium ${days <= 0 ? 'text-red-400' : days <= 3 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                            ({days <= 0 ? 'Expired' : `${days}d left`})
                          </span>
                        </span>
                      </div>
                      {post.wordCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{post.wordCount.toLocaleString()} words</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-2 pt-3 border-t border-zinc-800">
                      <button
                        onClick={() => setEditPost(post)}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeletePost(post)}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showCreate || editPost) && (
          <PostModal
            post={editPost}
            domains={domains}
            onClose={() => {
              setShowCreate(false);
              setEditPost(null);
            }}
            onSaved={fetchPosts}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletePost && (
          <DeleteDialog
            post={deletePost}
            onClose={() => setDeletePost(null)}
            onDeleted={fetchPosts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

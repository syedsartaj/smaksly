'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  X,
  Check,
  AlertTriangle,
  Layers,
  Activity,
  FileText,
  Search,
  ChevronUp,
  Globe,
  BarChart3,
  CheckSquare,
  Square,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  level: number;
  path: string;
  isActive: boolean;
  displayOrder: number;
  websiteCount: number;
  keywordCount: number;
  contentCount: number;
  websiteIds?: string[];
  createdAt: string;
  children?: Category[];
}

interface Website {
  _id: string;
  name: string;
  domain: string;
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  color: string;
  isActive: boolean;
  displayOrder: number;
  metaTitle: string;
  metaDescription: string;
  websiteIds: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRESET_COLORS = [
  { name: 'Emerald', value: '#34d399' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Red', value: '#f87171' },
  { name: 'Yellow', value: '#fbbf24' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Gray', value: '#a1a1aa' },
];

const DEFAULT_FORM: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  color: '#34d399',
  isActive: true,
  displayOrder: 0,
  metaTitle: '',
  metaDescription: '',
  websiteIds: [],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/* ------------------------------------------------------------------ */
/*  Website Multi-Select Component                                     */
/* ------------------------------------------------------------------ */

function WebsiteMultiSelect({
  websites,
  selected,
  onChange,
}: {
  websites: Website[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [wsSearch, setWsSearch] = useState('');

  const filtered = useMemo(() => {
    if (!wsSearch.trim()) return websites;
    const q = wsSearch.toLowerCase();
    return websites.filter(
      (w) => w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q),
    );
  }, [websites, wsSearch]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  };

  const selectedWebsites = websites.filter((w) => selected.includes(w._id));

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1">
        Assign to Websites
      </label>
      <p className="text-[11px] text-zinc-600 mb-2">
        Leave empty for global (available to all websites)
      </p>

      {/* Selected pills */}
      {selectedWebsites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedWebsites.map((w) => (
            <span
              key={w._id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full"
            >
              {w.name || w.domain}
              <button
                type="button"
                onClick={() => toggle(w._id)}
                className="hover:text-emerald-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-1.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
        <input
          type="text"
          placeholder="Search websites..."
          value={wsSearch}
          onChange={(e) => setWsSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50"
        />
      </div>

      {/* Checkbox list */}
      <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 divide-y divide-zinc-700/50">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-600 text-center">
            No websites found
          </div>
        ) : (
          filtered.map((w) => {
            const isSelected = selected.includes(w._id);
            return (
              <button
                key={w._id}
                type="button"
                onClick={() => toggle(w._id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-700/50 transition-colors"
              >
                {isSelected ? (
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">
                    {w.name || w.domain}
                  </div>
                  {w.name && (
                    <div className="text-[11px] text-zinc-500 truncate">{w.domain}</div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Website Badge Component                                            */
/* ------------------------------------------------------------------ */

function WebsiteBadge({
  websiteIds,
  websites,
}: {
  websiteIds?: string[];
  websites: Website[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!websiteIds || websiteIds.length === 0) {
    return (
      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
        Global
      </span>
    );
  }

  const names = websiteIds
    .map((id) => {
      const w = websites.find((ws) => ws._id === id);
      return w ? w.name || w.domain : 'Unknown';
    })
    .filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium cursor-default"
      >
        {websiteIds.length} site{websiteIds.length !== 1 ? 's' : ''}
      </button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.1 }}
            className="absolute z-40 bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl px-3 py-2 min-w-[140px] pointer-events-none"
          >
            <p className="text-[10px] text-zinc-500 font-medium mb-1 uppercase tracking-wider">
              Assigned Websites
            </p>
            {names.map((n, i) => (
              <p key={i} className="text-xs text-zinc-300 whitespace-nowrap">
                {n}
              </p>
            ))}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tree, setTree] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Websites
  const [websites, setWebsites] = useState<Website[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(DEFAULT_FORM);
  const [autoSlug, setAutoSlug] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expand/collapse
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkWebsiteIds, setBulkWebsiteIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Performance section
  const [showPerformance, setShowPerformance] = useState(false);

  /* ---- Fetch ---- */

  const fetchWebsites = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/domains');
      const data = await res.json();
      if (data.domains) setWebsites(data.domains);
    } catch (err) {
      console.error('Failed to fetch websites', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const [flatRes, treeRes] = await Promise.all([
        fetch('/api/categories?activeOnly=false'),
        fetch('/api/categories?tree=true'),
      ]);
      const flatData = await flatRes.json();
      const treeData = await treeRes.json();
      if (flatData.success) setCategories(flatData.data);
      if (treeData.success) setTree(treeData.data);
      // Auto-expand root nodes
      if (treeData.success) {
        setExpanded(new Set(treeData.data.map((c: Category) => c._id)));
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchWebsites();
  }, [fetchCategories, fetchWebsites]);

  /* ---- Stats ---- */

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive).length;
    const withContent = categories.filter((c) => c.contentCount > 0).length;
    const globalCount = categories.filter(
      (c) => !c.websiteIds || c.websiteIds.length === 0,
    ).length;
    return { total, active, withContent, globalCount };
  }, [categories]);

  /* ---- Performance data ---- */

  const performanceData = useMemo(() => {
    const maxContent = Math.max(...categories.map((c) => c.contentCount), 1);
    return [...categories]
      .sort((a, b) => b.contentCount - a.contentCount)
      .slice(0, 20)
      .map((c) => ({
        ...c,
        barWidth: (c.contentCount / maxContent) * 100,
      }));
  }, [categories]);

  /* ---- Search filter ---- */

  const filterTree = useCallback(
    (nodes: Category[]): Category[] => {
      if (!search.trim()) return nodes;
      const q = search.toLowerCase();
      const filter = (items: Category[]): Category[] =>
        items.reduce<Category[]>((acc, node) => {
          const childMatches = node.children ? filter(node.children) : [];
          if (
            node.name.toLowerCase().includes(q) ||
            node.slug.toLowerCase().includes(q) ||
            childMatches.length > 0
          ) {
            acc.push({
              ...node,
              children: childMatches.length > 0 ? childMatches : node.children,
            });
          }
          return acc;
        }, []);
      return filter(nodes);
    },
    [search],
  );

  const displayTree = useMemo(() => filterTree(tree), [filterTree, tree]);

  /* ---- Modal helpers ---- */

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setAutoSlug(true);
    setSeoOpen(false);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat._id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      parentId: cat.parentId || '',
      color: cat.color || '#a1a1aa',
      isActive: cat.isActive,
      displayOrder: cat.displayOrder,
      metaTitle: '',
      metaDescription: '',
      websiteIds: cat.websiteIds || [],
    });
    setAutoSlug(false);
    setSeoOpen(false);
    setModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: autoSlug ? slugify(name) : f.slug,
    }));
  };

  const handleSlugChange = (slug: string) => {
    setAutoSlug(false);
    setForm((f) => ({ ...f, slug }));
  };

  /* ---- Save ---- */

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug || slugify(form.name),
        description: form.description,
        color: form.color,
        isActive: form.isActive,
        displayOrder: form.displayOrder,
        websiteIds: form.websiteIds,
      };
      if (form.parentId) body.parentId = form.parentId;
      if (form.metaTitle) body.metaTitle = form.metaTitle;
      if (form.metaDescription) body.metaDescription = form.metaDescription;

      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchCategories();
      }
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeleteTarget(null);
        fetchCategories();
      }
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Toggle expand ---- */

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* ---- Toggle active ---- */

  const toggleActive = async (cat: Category) => {
    try {
      await fetch(`/api/categories/${cat._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cat.name, isActive: !cat.isActive }),
      });
      fetchCategories();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  /* ---- Selection helpers ---- */

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* ---- Bulk assign ---- */

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const promises = Array.from(selectedIds).map((id) => {
        const cat = categories.find((c) => c._id === id);
        return fetch(`/api/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cat?.name || '',
            websiteIds: bulkWebsiteIds,
          }),
        });
      });
      await Promise.all(promises);
      setBulkAssignOpen(false);
      setBulkWebsiteIds([]);
      clearSelection();
      fetchCategories();
    } catch (err) {
      console.error('Bulk assign failed', err);
    } finally {
      setBulkSaving(false);
    }
  };

  /* ---- Flat list for parent dropdown ---- */

  const flatOptions = useMemo(() => {
    const result: { id: string; label: string; level: number }[] = [];
    const walk = (nodes: Category[]) => {
      for (const n of nodes) {
        if (n._id !== editingId) {
          result.push({ id: n._id, label: n.name, level: n.level });
          if (n.children) walk(n.children);
        }
      }
    };
    walk(tree);
    return result;
  }, [tree, editingId]);

  /* ---- Render tree row ---- */

  const renderNode = (node: Category, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node._id);
    const isSelected = selectedIds.has(node._id);

    return (
      <div key={node._id}>
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="group flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-900/50 transition-colors"
          style={{ paddingLeft: `${depth * 28 + 16}px` }}
        >
          {/* Selection checkbox */}
          <button
            onClick={() => toggleSelect(node._id)}
            className="shrink-0 p-0.5 rounded hover:bg-zinc-800 transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-emerald-400" />
            ) : (
              <Square className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
            )}
          </button>

          {/* Drag handle */}
          <GripVertical className="h-4 w-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0" />

          {/* Expand/collapse */}
          <button
            onClick={() => hasChildren && toggle(node._id)}
            className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors ${
              hasChildren
                ? 'hover:bg-zinc-800 text-zinc-400'
                : 'text-transparent'
            }`}
          >
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              ))}
          </button>

          {/* Color dot */}
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: node.color || '#a1a1aa' }}
          />

          {/* Name & slug */}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-zinc-100 text-sm">{node.name}</span>
            <span className="ml-2 text-xs text-zinc-500">/{node.slug}</span>
          </div>

          {/* Website badge */}
          <WebsiteBadge websiteIds={node.websiteIds} websites={websites} />

          {/* Badges */}
          {node.contentCount > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 tabular-nums">
              {node.contentCount} post{node.contentCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Active toggle */}
          <button
            onClick={() => toggleActive(node)}
            className="shrink-0 p-1 rounded hover:bg-zinc-800 transition-colors"
            title={node.isActive ? 'Active' : 'Inactive'}
          >
            <span
              className={`block h-2.5 w-2.5 rounded-full ${
                node.isActive ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
          </button>

          {/* Edit */}
          <button
            onClick={() => openEdit(node)}
            className="shrink-0 p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setDeleteTarget(node)}
            className="shrink-0 p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {node.children!.map((child) => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderTree className="h-6 w-6 text-emerald-400" />
              Categories
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Organize your content</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-sm rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Categories',
              value: stats.total,
              icon: Layers,
              color: 'text-emerald-400',
            },
            {
              label: 'Active',
              value: stats.active,
              icon: Activity,
              color: 'text-blue-400',
            },
            {
              label: 'With Content',
              value: stats.withContent,
              icon: FileText,
              color: 'text-purple-400',
            },
            {
              label: 'Global',
              value: stats.globalCount,
              icon: Globe,
              color: 'text-amber-400',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
              <span className="text-xl font-bold tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Search + Bulk actions bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-colors"
            />
          </div>

          {/* Bulk actions */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-zinc-400 whitespace-nowrap">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => {
                    setBulkWebsiteIds([]);
                    setBulkAssignOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-500/20 transition-colors whitespace-nowrap"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Assign to Websites
                </button>
                <button
                  onClick={clearSelection}
                  className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tree */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayTree.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <FolderTree className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">No categories yet</p>
              <p className="text-zinc-600 text-sm mb-4">
                Create your first category to start organizing content.
              </p>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-sm rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>
          ) : (
            displayTree.map((node) => renderNode(node))
          )}
        </div>

        {/* ---- Category Performance Section ---- */}
        <div className="mt-8">
          <button
            onClick={() => setShowPerformance((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition-colors mb-4"
          >
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            Category Performance
            {showPerformance ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>

          <AnimatePresence>
            {showPerformance && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_80px_100px_1fr] gap-3 px-4 py-2.5 border-b border-zinc-800 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    <span>Category</span>
                    <span className="text-right">Posts</span>
                    <span className="text-center">Websites</span>
                    <span>Content Volume</span>
                  </div>

                  {performanceData.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-zinc-600">
                      No category data available
                    </div>
                  ) : (
                    performanceData.map((cat) => (
                      <div
                        key={cat._id}
                        className="grid grid-cols-[1fr_80px_100px_1fr] gap-3 items-center px-4 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        {/* Name + color */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: cat.color || '#a1a1aa',
                            }}
                          />
                          <span className="text-sm text-zinc-200 truncate font-medium">
                            {cat.name}
                          </span>
                        </div>

                        {/* Post count */}
                        <span className="text-sm text-zinc-400 text-right tabular-nums">
                          {cat.contentCount}
                        </span>

                        {/* Websites */}
                        <div className="flex justify-center">
                          {!cat.websiteIds || cat.websiteIds.length === 0 ? (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              Global
                            </span>
                          ) : (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                              {cat.websiteIds.length} site
                              {cat.websiteIds.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cat.barWidth}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: cat.color || '#a1a1aa',
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---- Create / Edit Modal ---- */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-semibold">
                  {editingId ? 'Edit Category' : 'New Category'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Web Development"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="auto-generated"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 font-mono"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={3}
                    placeholder="Brief description of this category"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 resize-none"
                  />
                </div>

                {/* Parent */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Parent Category
                  </label>
                  <select
                    value={form.parentId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, parentId: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                  >
                    <option value="">None (root category)</option>
                    {flatOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {'  '.repeat(opt.level)}
                        {opt.level > 0 ? '\u2514 ' : ''}
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Website Assignment */}
                <WebsiteMultiSelect
                  websites={websites}
                  selected={form.websiteIds}
                  onChange={(ids) => setForm((f) => ({ ...f, websiteIds: ids }))}
                />

                {/* Color */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                        className={`h-8 w-8 rounded-lg border-2 transition-all ${
                          form.color === c.value
                            ? 'border-white scale-110'
                            : 'border-transparent hover:border-zinc-600'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Active & Display Order */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={form.displayOrder}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          displayOrder: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 tabular-nums"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <button
                      onClick={() =>
                        setForm((f) => ({ ...f, isActive: !f.isActive }))
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          form.isActive ? 'bg-emerald-400' : 'bg-zinc-600'
                        }`}
                      />
                      {form.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* SEO Section */}
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSeoOpen(!seoOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span>SEO Settings</span>
                    {seoOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <AnimatePresence>
                    {seoOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                              Meta Title
                            </label>
                            <input
                              type="text"
                              value={form.metaTitle}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  metaTitle: e.target.value,
                                }))
                              }
                              placeholder="SEO title"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                              Meta Description
                            </label>
                            <textarea
                              value={form.metaDescription}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  metaDescription: e.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="SEO description"
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400/50 resize-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.name.trim() || saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-medium text-sm rounded-lg transition-colors"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {editingId ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Bulk Assign Modal ---- */}
      <AnimatePresence>
        {bulkAssignOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setBulkAssignOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-lg font-semibold">Bulk Website Assignment</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Assigning to {selectedIds.size} categor
                    {selectedIds.size === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                <button
                  onClick={() => setBulkAssignOpen(false)}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <WebsiteMultiSelect
                  websites={websites}
                  selected={bulkWebsiteIds}
                  onChange={setBulkWebsiteIds}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
                <button
                  onClick={() => setBulkAssignOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={bulkSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
                >
                  {bulkSaving ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Apply Assignment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Delete Confirmation ---- */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100">Delete Category</h3>
                    <p className="text-sm text-zinc-500">
                      &quot;{deleteTarget.name}&quot;
                    </p>
                  </div>
                </div>

                {deleteTarget.children && deleteTarget.children.length > 0 ? (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
                    This category has child categories. Please delete or move all
                    children first.
                  </div>
                ) : (
                  <>
                    {deleteTarget.contentCount > 0 && (
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-300 mb-4">
                        <AlertTriangle className="h-3.5 w-3.5 inline mr-1.5" />
                        This category has {deleteTarget.contentCount} content item
                        {deleteTarget.contentCount !== 1 ? 's' : ''} associated with
                        it.
                      </div>
                    )}
                    <p className="text-sm text-zinc-400">
                      This action cannot be undone. Are you sure?
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                {!(deleteTarget.children && deleteTarget.children.length > 0) && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors"
                  >
                    {deleting ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

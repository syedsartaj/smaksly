'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface FilterState {
  search: string;
  status: string;
  categoryId: string;
  authorName: string;
  startDate: string;
  endDate: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface BlogFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  categories: Category[];
  authors: string[];
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending_review', label: 'Pending Review' },
];

const sortOptions = [
  { value: 'createdAt-desc', label: 'Latest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'publishedAt-desc', label: 'Recently Published' },
];

export default function BlogFilters({
  filters,
  onChange,
  categories,
  authors,
}: BlogFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.categoryId ||
    filters.authorName ||
    filters.startDate ||
    filters.endDate;

  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    onChange({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
  };

  const clearFilters = () => {
    onChange({
      search: '',
      status: '',
      categoryId: '',
      authorName: '',
      startDate: '',
      endDate: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={filters.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Author Filter */}
        <select
          value={filters.authorName}
          onChange={(e) => handleChange('authorName', e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Authors</option>
          {authors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="From date"
          />
          <span className="text-zinc-500">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="To date"
          />
        </div>

        {/* Sort */}
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}

        {/* Filter indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <SlidersHorizontal className="h-3 w-3" />
            Filters active
          </div>
        )}
      </div>
    </div>
  );
}

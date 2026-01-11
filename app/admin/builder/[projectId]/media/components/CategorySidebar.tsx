'use client';

import { Folder, FolderOpen, Images } from 'lucide-react';
import { MediaCategory } from '@/stores/useBuilderStore';

interface CategorySidebarProps {
  categories: MediaCategory[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  totalCount: number;
}

export default function CategorySidebar({
  categories,
  activeCategory,
  onCategoryChange,
  totalCount,
}: CategorySidebarProps) {
  const allCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <aside className="w-56 min-h-[calc(100vh-57px)] bg-zinc-900 border-r border-zinc-800 p-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Categories
      </h2>

      <nav className="space-y-1">
        {/* All category */}
        <button
          onClick={() => onCategoryChange('all')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            activeCategory === 'all'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Images className="h-4 w-4" />
            All Media
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              activeCategory === 'all' ? 'bg-emerald-700' : 'bg-zinc-800'
            }`}
          >
            {allCount}
          </span>
        </button>

        {/* Category list */}
        {categories.map((category) => (
          <button
            key={category.name}
            onClick={() => onCategoryChange(category.name)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              activeCategory === category.name
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              {activeCategory === category.name ? (
                <FolderOpen className="h-4 w-4 flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="truncate capitalize">{category.name}</span>
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                activeCategory === category.name ? 'bg-emerald-700' : 'bg-zinc-800'
              }`}
            >
              {category.count}
            </span>
          </button>
        ))}

        {categories.length === 0 && (
          <p className="text-xs text-zinc-600 px-3 py-2">No categories yet</p>
        )}
      </nav>
    </aside>
  );
}

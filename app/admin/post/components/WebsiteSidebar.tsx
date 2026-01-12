'use client';

import { Search, Globe } from 'lucide-react';

interface Website {
  _id: string;
  name: string;
  domain: string;
}

interface WebsiteSidebarProps {
  websites: Website[];
  selectedId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (websiteId: string) => void;
  isLoading?: boolean;
}

export default function WebsiteSidebar({
  websites,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
  isLoading = false,
}: WebsiteSidebarProps) {
  const filteredWebsites = websites.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900/50">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-400" />
          Websites
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search websites..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Website List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
          </div>
        ) : filteredWebsites.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            {searchQuery ? 'No websites found' : 'No websites available'}
          </div>
        ) : (
          filteredWebsites.map((website) => (
            <button
              key={website._id}
              onClick={() => onSelect(website._id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                selectedId === website._id
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <div className="font-medium truncate text-sm">
                {website.name}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {website.domain}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500 text-center">
        {filteredWebsites.length} of {websites.length} websites
      </div>
    </div>
  );
}

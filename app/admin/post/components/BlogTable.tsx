'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Edit,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  FileText,
} from 'lucide-react';

export interface BlogData {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'published' | 'rejected';
  type: string;
  authorName: string;
  authorBio?: string;
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  } | string;
  wordCount?: number;
  readingTime?: number;
  featuredImage?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  scheduledAt?: string;
  createdAt: string;
  publishedAt?: string;
  websiteId?: {
    _id: string;
    name: string;
    domain: string;
  };
}

interface BlogTableProps {
  data: BlogData[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onEdit: (id: string) => void;
  onDelete: (ids: string[]) => void;
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  pending_review: 'bg-yellow-900/30 text-yellow-400',
  approved: 'bg-blue-900/30 text-blue-400',
  scheduled: 'bg-purple-900/30 text-purple-400',
  published: 'bg-emerald-900/30 text-emerald-400',
  rejected: 'bg-red-900/30 text-red-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  rejected: 'Rejected',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BlogTable({
  data,
  selectedIds,
  onSelect,
  onEdit,
  onDelete,
  isLoading = false,
}: BlogTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(() => {
    const selection: RowSelectionState = {};
    data.forEach((item, index) => {
      if (selectedIds.includes(item._id)) {
        selection[index] = true;
      }
    });
    return selection;
  });

  const columns = useMemo<ColumnDef<BlogData>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <div className="font-medium text-white truncate max-w-[300px]">
              {row.original.title}
            </div>
            <div className="text-xs text-zinc-500 truncate max-w-[300px]">
              /{row.original.slug}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColors[row.original.status] || statusColors.draft
            }`}
          >
            {statusLabels[row.original.status] || row.original.status}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'authorName',
        header: 'Author',
        cell: ({ row }) => (
          <span className="text-zinc-300">{row.original.authorName}</span>
        ),
        size: 120,
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }) => {
          const cat = row.original.categoryId;
          const categoryName = typeof cat === 'object' && cat ? cat.name : '-';
          return <span className="text-zinc-400">{categoryName}</span>;
        },
        size: 120,
      },
      {
        accessorKey: 'wordCount',
        header: 'Words',
        cell: ({ row }) => (
          <span className="text-zinc-400">
            {row.original.wordCount?.toLocaleString() || '-'}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-zinc-400 text-sm">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        size: 100,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onEdit(row.original._id)}
              className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete([row.original._id])}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {row.original.status === 'published' && row.original.websiteId && (
              <a
                href={`https://${row.original.websiteId.domain}/${row.original.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded transition-colors"
                title="View Live"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        ),
        size: 100,
      },
    ],
    [onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);

      // Convert row selection to IDs
      const selectedIndices = Object.keys(newSelection).filter(
        (key) => newSelection[key]
      );
      const ids = selectedIndices.map((index) => data[parseInt(index)]?._id).filter(Boolean);
      onSelect(ids);
    },
    state: {
      rowSelection,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <FileText className="h-12 w-12 mb-4 text-zinc-600" />
        <p className="text-lg font-medium">No blog posts found</p>
        <p className="text-sm">Create your first blog post to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-zinc-800">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`hover:bg-zinc-800/30 transition-colors ${
                row.getIsSelected() ? 'bg-emerald-900/10' : ''
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

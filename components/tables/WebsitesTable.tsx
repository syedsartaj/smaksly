'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import { formatNumber, formatPrice } from '@/lib/utils';

export interface WebsiteTableData {
  _id: string;
  name: string;
  domain: string;
  niche: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  da: number;
  dr: number;
  traffic: number;
  acceptsGuestPosts: boolean;
  guestPostPrice: number;
  doFollow: boolean;
  turnaroundDays: number;
  country: string;
  createdAt: string;
}

interface WebsitesTableProps {
  data: WebsiteTableData[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (ids: string[]) => void;
  onBulkAction?: (action: string, ids: string[], data?: Record<string, unknown>) => void;
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function WebsitesTable({
  data,
  onView,
  onEdit,
  onDelete,
  onBulkAction,
  isLoading = false,
}: WebsitesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<WebsiteTableData>[]>(
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
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-emerald-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Website
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-white">{row.original.name}</div>
            <div className="text-sm text-zinc-400">{row.original.domain}</div>
          </div>
        ),
      },
      {
        accessorKey: 'niche',
        header: 'Niche',
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
            {row.original.niche}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              statusColors[row.original.status]
            }`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'da',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-emerald-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            DA
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.da}</span>
        ),
      },
      {
        accessorKey: 'dr',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-emerald-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            DR
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.dr}</span>
        ),
      },
      {
        accessorKey: 'traffic',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-emerald-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Traffic
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{formatNumber(row.original.traffic)}</span>
        ),
      },
      {
        accessorKey: 'acceptsGuestPosts',
        header: 'Guest Posts',
        cell: ({ row }) => (
          row.original.acceptsGuestPosts ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <X className="h-5 w-5 text-zinc-500" />
          )
        ),
      },
      {
        accessorKey: 'guestPostPrice',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-emerald-400"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Price
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.guestPostPrice > 0
              ? formatPrice(row.original.guestPostPrice)
              : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'doFollow',
        header: 'Link Type',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              row.original.doFollow
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400'
            }`}
          >
            {row.original.doFollow ? 'DoFollow' : 'NoFollow'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.open(`https://${row.original.domain}`, '_blank')}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800"
              title="Visit site"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            {onView && (
              <button
                onClick={() => onView(row.original._id)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800"
                title="View"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(row.original._id)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete([row.original._id])}
                className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-zinc-800"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [onView, onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((row) => row.original._id);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search websites..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
          />
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">
                {selectedIds.length} selected
              </span>
              {onBulkAction && (
                <>
                  <button
                    onClick={() => onBulkAction('enableGuestPosts', selectedIds)}
                    className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                  >
                    Enable Guest Posts
                  </button>
                  <button
                    onClick={() => onBulkAction('updateStatus', selectedIds, { status: 'active' })}
                    className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-md"
                  >
                    Set Active
                  </button>
                </>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(selectedIds)}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-400"
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
            <tbody className="divide-y divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No websites found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-zinc-800/50 ${
                      row.getIsSelected() ? 'bg-emerald-900/20' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-sm text-zinc-300"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-800/30">
          <div className="text-sm text-zinc-400">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-400">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

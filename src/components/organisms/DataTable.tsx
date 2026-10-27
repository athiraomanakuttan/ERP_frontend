import { ReactNode } from 'react';
import { Spinner } from '@/components/atoms/Spinner';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyLabel?: string;
  rowKey: (row: T) => string;
}

export function DataTable<T>({ columns, rows, isLoading, emptyLabel = 'No records found', rowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-3 text-left text-xs font-medium text-subtle">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                <Spinner className="mx-auto" />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-faint">
                  <Inbox className="h-8 w-8" />
                  <p className="text-sm">{emptyLabel}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-surface-hover">
                {columns.map((col) => (
                  <td key={col.header} className={`px-4 py-3 text-body ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

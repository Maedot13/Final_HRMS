import type { ReactNode } from 'react';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

export interface Column<T> {
    key: string;
    header: string;
    render: (row: T) => ReactNode;
    sortable?: boolean;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    emptyMessage?: string;
    keyExtractor: (row: T) => string | number;
}

export function DataTable<T>({
    columns,
    data,
    isLoading = false,
    emptyMessage = 'No data to display',
    keyExtractor,
}: DataTableProps<T>) {
    if (isLoading) {
        return (
            <div className="overflow-x-auto rounded-card border border-[#E5E7EB] bg-white">
                <table className="min-w-full divide-y divide-[#E5E7EB]">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                        {[1, 2, 3].map((i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3">
                                        <Skeleton className="h-5 w-24" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="rounded-card border border-[#E5E7EB] bg-white p-8">
                <EmptyState title={emptyMessage} />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-card border border-[#E5E7EB] bg-white shadow-card">
            <table className="min-w-full divide-y divide-[#E5E7EB]">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                    {data.map((row) => (
                        <tr key={keyExtractor(row)} className="hover:bg-gray-50">
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-3 text-sm text-text-primary">
                                    {col.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

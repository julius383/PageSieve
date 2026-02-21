import type { ColumnDef } from '@tanstack/table-core';
import { formatColumnName } from '../util';

export const createColumns = <TData extends Record<string, unknown>>(data:
    TData[]) => {
    if (data.length === 0) {
        return [];
    }

    const keys = Object.keys(data[0]);

    const columns: ColumnDef<TData>[] = keys.map((key) => ({
        accessorKey: key,
        header: () => formatColumnName(key),
        cell: (info) => info.getValue()
    }));

    return columns;
};

import type { ColumnDef } from '@tanstack/table-core';
import { formatColumnName } from '../util';
import type { ExtractedRow } from '../../types';

export const createColumns = (data: ExtractedRow[]) => {
    if (data.length === 0) {
        return [];
    }

    const keys = Object.keys(data[0]);

    const columns: ColumnDef<ExtractedRow>[] = keys.map((key) => ({
        accessorKey: key,
        header: () => formatColumnName(key),
        cell: (info) => info.getValue(),
    }));

    return columns;
};

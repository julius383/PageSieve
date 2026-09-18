import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import { formatColumnName } from '@/ui/sidebar/util';
import type { ExtractedRow } from '@pagesieve/core/types';
import SortableHeader from './SortableHeader.svelte';

export const createColumns = (data: ExtractedRow[]) => {
    if (data.length === 0) {
        return [];
    }

    const keys = Object.keys(data[0]);

    const columns: ColumnDef<ExtractedRow>[] = keys.map((key) => ({
        accessorKey: key,
        header: ({ column }) =>
            renderComponent(SortableHeader, {
                label: formatColumnName(key),
                column,
            }),
        cell: (info) => info.getValue(),
    }));

    return columns;
};

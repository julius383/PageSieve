import { renderComponent, type ColumnDef } from '@tanstack/svelte-table';
import { formatColumnName } from '@/ui/sidebar/util';
import type { ExtractedRow } from '@pagesieve/core/types';
import SortableHeader from './SortableHeader.svelte';
import type { DataTableFeatures } from './table-features';

export const createColumns = (data: ExtractedRow[]) => {
    if (data.length === 0) {
        return [];
    }

    const keys = Object.keys(data[0]);

    const columns: ColumnDef<DataTableFeatures, ExtractedRow>[] = keys.map((key) => ({
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

import { renderComponent, type ColumnDef } from '@tanstack/svelte-table';
import { formatColumnName } from '@/ui/sidebar/util';
import type { ExtractedRow } from '@pagesieve/core/types';
import ColumnHeader from './ColumnHeader.svelte';
import RowActionsCell from './RowActionsCell.svelte';
import type { DataTableFeatures } from './table-features';

export const createColumns = (data: ExtractedRow[]) => {
    if (data.length === 0) {
        return [];
    }

    const keys = Object.keys(data[0]);

    const columns: ColumnDef<DataTableFeatures, ExtractedRow>[] = keys.map((key) => ({
        id: key,
        accessorKey: key,
        header: ({ column }) =>
            renderComponent(ColumnHeader, {
                label: formatColumnName(key),
                column,
            }),
        cell: (info) => info.getValue(),
        enablePinning: true,
        enableGrouping: true,
        enableSorting: true,
        enableHiding: true,
    }));

    // Add row action menu column
    columns.push({
        id: 'actions',
        header: () => '',
        cell: ({ row }) => renderComponent(RowActionsCell, { row }),
        enableSorting: false,
        enableHiding: false,
        enablePinning: true,
        enableGrouping: false,
        size: 48,
    });

    return columns;
};

<script lang="ts">
    import {
        createTable,
        createTableState,
        FlexRender,
        type SortingState,
        type GroupingState,
        type ColumnPinningState,
        type ColumnOrderState,
        type Column,
    } from '@tanstack/svelte-table';
    import * as Table from '$lib/components/ui/table/index.js';
    import * as Select from '$lib/components/ui/select/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import { ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from '@lucide/svelte';

    import { features, type DataTableFeatures } from './table-features';
    import DebouncedInput from './DebouncedInput.svelte';
    import DataTableViewOptions from './DataTableViewOptions.svelte';
    import GroupedCell from './GroupedCell.svelte';
    import { createColumns } from '@/ui/sidebar/components/results-columns';
    import type { ExtractedRow } from '@pagesieve/core/types';
    import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

    let { data = [] } = $props<{ data: ExtractedRow[] }>();
    const columns = $derived(createColumns(data));

    const pageSizeOptions = [10, 20, 30, 40, 50, Infinity];

    const [sorting, setSorting] = createTableState<SortingState>([]);
    const [grouping, setGrouping] = createTableState<GroupingState>([]);
    const [columnPinning, setColumnPinning] = createTableState<ColumnPinningState>({
        start: [],
        end: ['actions'],
    });
    const [columnOrder, setColumnOrder] = createTableState<ColumnOrderState>([]);

    function getCommonPinningStyles(
        column: Column<DataTableFeatures, ExtractedRow>,
        isSelected = false,
        isHeader = false,
    ): string {
        const isPinned = column.getIsPinned();
        const isLastLeftPinnedColumn = isPinned === 'start' && column.getIsLastColumn('start');
        const isFirstRightPinnedColumn = isPinned === 'end' && column.getIsFirstColumn('end');

        const styles: Array<string> = [];
        if (isLastLeftPinnedColumn) {
            styles.push('box-shadow: -4px 0 4px -4px var(--border) inset');
        } else if (isFirstRightPinnedColumn) {
            styles.push('box-shadow: 4px 0 4px -4px var(--border) inset');
        }
        if (isPinned === 'start') {
            styles.push(`inset-inline-start: ${column.getStart('start')}px`);
        }
        if (isPinned === 'end') {
            styles.push(`inset-inline-end: ${column.getAfter('end')}px`);
        }
        styles.push(`position: ${isPinned ? 'sticky' : 'relative'}`);
        if (isSelected) {
            styles.push('background: var(--muted)');
        } else if (isPinned) {
            styles.push(isHeader ? 'background: var(--accent)' : 'background: var(--background)');
        }
        styles.push(`z-index: ${isPinned ? (isHeader ? 2 : 1) : 0}`);
        return styles.join('; ');
    }

    const table = createTable({
        features,
        get data() {
            return data;
        },
        get columns() {
            return columns;
        },
        state: {
            get sorting() {
                return sorting();
            },
            get grouping() {
                return grouping();
            },
            get columnPinning() {
                return columnPinning();
            },
            get columnOrder() {
                return columnOrder();
            },
        },
        onSortingChange: setSorting,
        onGroupingChange: setGrouping,
        onColumnPinningChange: setColumnPinning,
        onColumnOrderChange: setColumnOrder,
        initialState: {
            pagination: { pageIndex: 0, pageSize: 50 },
            columnPinning: { start: [], end: ['actions'] },
        },
    });

    const pagination = $derived(table.atoms.pagination.get());
    const globalFilter = $derived(table.atoms.globalFilter.get());
</script>

<div class="w-full flex flex-col gap-2">
    {#if data.length > 0}
        <div class="flex items-center gap-2 py-2">
            <DebouncedInput
                value={globalFilter ?? ''}
                onchange={(value) => table.setGlobalFilter(String(value))}
                class="max-w-sm"
                placeholder="Search all columns..."
            />
            <DataTableViewOptions {table} />
        </div>
    {/if}
    <div class="rounded-md border overflow-hidden">
        <ScrollArea orientation="horizontal" type="auto" class="w-full">
            <Table.Root containerClass="overflow-visible">
                <Table.Header class="bg-accent">
                    {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
                        <Table.Row>
                            {#each headerGroup.headers as header (header.id)}
                                <Table.Head
                                    colspan={header.colSpan}
                                    style={`width: ${header.getSize()}px; min-width: ${header.getSize()}px; ${getCommonPinningStyles(header.column, false, true)}`}
                                >
                                    {#if !header.isPlaceholder}
                                        <FlexRender {header} />
                                    {/if}
                                </Table.Head>
                            {/each}
                        </Table.Row>
                    {/each}
                </Table.Header>
                <Table.Body>
                    {#each table.getRowModel().rows as row (row.id)}
                        <Table.Row data-state={row.getIsSelected() && 'selected'}>
                            {#each row.getVisibleCells() as cell (cell.id)}
                                <Table.Cell
                                    style={`width: ${cell.column.getSize()}px; min-width: ${cell.column.getSize()}px; ${getCommonPinningStyles(cell.column, row.getIsSelected(), false)}`}
                                >
                                    {#if cell.getIsGrouped()}
                                        <GroupedCell {cell} {row} />
                                    {:else if !cell.getIsPlaceholder()}
                                        <FlexRender {cell} />
                                    {/if}
                                </Table.Cell>
                            {/each}
                        </Table.Row>
                    {:else}
                        <Table.Row>
                            <Table.Cell
                                colspan={table.getVisibleLeafColumns().length}
                                class="h-24 text-center"
                            >
                                No results.
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
        </ScrollArea>
    </div>

    {#if table.getRowModel().rows.length > 0}
        <div class="flex w-full items-center gap-8 lg:w-fit">
            <div class="items-center gap-2">
                <Label for="rows-per-page" class="text-sm font-medium">Rows per page</Label>
                <Select.Root
                    type="single"
                    value={`${pagination.pageSize}`}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                >
                    <Select.Trigger size="sm" class="w-20">
                        {pagination.pageSize === Infinity ? 'All' : pagination.pageSize}
                    </Select.Trigger>
                    <Select.Content side="top">
                        {#each pageSizeOptions as pageSize (pageSize)}
                            <Select.Item
                                value={`${pageSize}`}
                                label={pageSize === Infinity ? 'All' : `${pageSize}`}
                            />
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>
            <div class="flex w-fit items-center justify-center text-sm font-medium">
                Page {pagination.pageIndex + 1} of
                {table.getPageCount()}
            </div>
            <div class="ms-auto flex items-center gap-2 lg:ms-0">
                <Button
                    variant="outline"
                    class="h-8 w-8 p-0"
                    onclick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span class="sr-only">Go to first page</span>
                    <ChevronsLeft />
                </Button>
                <Button
                    variant="outline"
                    class="size-8"
                    size="icon"
                    onclick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span class="sr-only">Go to previous page</span>
                    <ChevronLeft />
                </Button>
                <Button
                    variant="outline"
                    class="size-8"
                    size="icon"
                    onclick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <span class="sr-only">Go to next page</span>
                    <ChevronRight />
                </Button>
                <Button
                    variant="outline"
                    class="size-8"
                    size="icon"
                    onclick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                >
                    <span class="sr-only">Go to last page</span>
                    <ChevronsRight />
                </Button>
            </div>
        </div>
    {/if}
</div>

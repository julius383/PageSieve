<script lang="ts">
    import {
        createTable,
        createTableState,
        FlexRender,
        type SortingState,
    } from '@tanstack/svelte-table';
    import * as Table from '$lib/components/ui/table/index.js';
    import * as Select from '$lib/components/ui/select/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import {
        ChevronRight,
        ChevronLeft,
        ChevronsLeft,
        ChevronsRight,
        ChevronDown,
    } from '@lucide/svelte';

    import { features } from './table-features';
    import DebouncedInput from './DebouncedInput.svelte';
    import { createColumns } from '@/ui/sidebar/components/results-columns';
    import type { ExtractedRow } from '@pagesieve/core/types';

    let { data = [] } = $props<{ data: ExtractedRow[] }>();
    const columns = $derived(createColumns(data));

    const [sorting, setSorting] = createTableState<SortingState>([]);

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
        },
        onSortingChange: setSorting,
        initialState: {
            pagination: { pageIndex: 0, pageSize: 50 },
        },
    });

    const pagination = $derived(table.atoms.pagination.get());
    const globalFilter = $derived(table.atoms.globalFilter.get());
</script>

<div class="w-full">
    {#if table.getRowModel().rows.length > 0}
        <div class="flex items-center py-4">
            <DebouncedInput
                value={globalFilter ?? ''}
                onchange={(value) => table.setGlobalFilter(String(value))}
                class="max-w-sm"
                placeholder="Search all columns..."
            />
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                        <Button {...props} variant="outline" class="ms-auto">
                            Columns <ChevronDown />
                        </Button>
                    {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" class="w-44">
                    <DropdownMenu.Group>
                        {#each table
                            .getAllColumns()
                            .filter((col) => col.getCanHide()) as column (column.id)}
                            <DropdownMenu.CheckboxItem
                                class="capitalize"
                                bind:checked={
                                    () => column.getIsVisible(), (v) => column.toggleVisibility(!!v)
                                }
                            >
                                {column.id}
                            </DropdownMenu.CheckboxItem>
                        {/each}
                    </DropdownMenu.Group>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    {/if}
    <div class="rounded-md">
        <Table.Root>
            <Table.Header class="bg-accent">
                {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
                    <Table.Row>
                        {#each headerGroup.headers as header (header.id)}
                            <Table.Head colspan={header.colSpan}>
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
                            <Table.Cell>
                                <FlexRender {cell} />
                            </Table.Cell>
                        {/each}
                    </Table.Row>
                {:else}
                    <Table.Row>
                        <Table.Cell colspan={columns.length} class="h-24 text-center">
                            No results.
                        </Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </div>

    {#if table.getRowModel().rows.length > 0}
        <div class="flex w-full items-center gap-8 lg:w-fit">
            <div class="hidden items-center gap-2 lg:flex">
                <Label for="rows-per-page" class="text-sm font-medium">Rows per page</Label>
                <Select.Root
                    type="single"
                    bind:value={() => `${pagination.pageSize}`, (v) => table.setPageSize(Number(v))}
                >
                    <Select.Trigger size="sm" class="w-20" id="rows-per-page">
                        {pagination.pageSize}
                    </Select.Trigger>
                    <Select.Content side="top">
                        {#each [50, 40, 30, 20, 10] as pageSize (pageSize)}
                            <Select.Item value={pageSize.toString()}>
                                {pageSize}
                            </Select.Item>
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
                    class="hidden h-8 w-8 p-0 lg:flex"
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
                    class="hidden size-8 lg:flex"
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

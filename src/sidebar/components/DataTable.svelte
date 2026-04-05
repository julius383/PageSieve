<script lang="ts">
    import { getCoreRowModel } from '@tanstack/table-core';
    import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
    import * as Table from '$lib/components/ui/table/index.js';

    import { createColumns } from './results-columns';
    import type { ExtractedRow } from '../../types';

    let { data = [] } = $props<{ data: ExtractedRow[] }>();
    const columns = $derived(createColumns(data));

    const table = createSvelteTable({
        get data() {
            return data;
        },
        get columns() {
            return columns;
        },
        getCoreRowModel: getCoreRowModel(),
    });
</script>

<div>
    <div class="rounded-md border">
        <Table.Root>
            <Table.Header class="bg-accent">
                {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
                    <Table.Row>
                        {#each headerGroup.headers as header (header.id)}
                            <Table.Head colspan={header.colSpan}>
                                {#if !header.isPlaceholder}
                                    <FlexRender
                                        content={header.column.columnDef.header}
                                        context={header.getContext()}
                                    />
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
                                <FlexRender
                                    content={cell.column.columnDef.cell}
                                    context={cell.getContext()}
                                />
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
</div>

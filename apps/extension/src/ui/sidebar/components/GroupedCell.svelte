<script lang="ts">
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import { FlexRender, type Cell, type Row } from '@tanstack/svelte-table';
    import { Button } from '$lib/components/ui/button/index.js';
    import type { DataTableFeatures } from './table-features';
    import type { ExtractedRow } from '@pagesieve/core/types';

    let {
        cell,
        row,
    }: {
        cell: Cell<DataTableFeatures, ExtractedRow, unknown>;
        row: Row<DataTableFeatures, ExtractedRow>;
    } = $props();
</script>

<Button
    variant="ghost"
    size="sm"
    class="-ml-2 h-7 gap-1 px-2"
    onclick={row.getToggleExpandedHandler()}
    disabled={!row.getCanExpand()}
    style={`padding-left: calc(${row.depth} * 1.5rem + 0.5rem)`}
>
    {#if row.getIsExpanded()}
        <ChevronDown class="size-4" />
    {:else}
        <ChevronRight class="size-4" />
    {/if}
    <FlexRender {cell} />
    <span class="text-muted-foreground text-xs">({row.subRows.length})</span>
</Button>

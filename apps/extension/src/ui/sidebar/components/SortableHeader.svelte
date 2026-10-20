<script lang="ts">
    import type { Column } from '@tanstack/svelte-table';
    import { Button } from '$lib/components/ui/button/index.js';
    import ArrowUp from '@lucide/svelte/icons/arrow-up';
    import ArrowDown from '@lucide/svelte/icons/arrow-down';
    import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
    import type { DataTableFeatures } from './table-features';
    import type { ExtractedRow } from '@pagesieve/core/types';

    let { label, column }: { label: string; column: Column<DataTableFeatures, ExtractedRow> } =
        $props();
</script>

<Button variant="ghost" onclick={column.getToggleSortingHandler()}>
    {label}
    {#if column.getIsSorted() === 'asc'}
        <ArrowUp class="ml-2 size-4" />
    {:else if column.getIsSorted() === 'desc'}
        <ArrowDown class="ml-2 size-4" />
    {:else}
        <ChevronsUpDown class="ml-2 size-4" />
    {/if}
</Button>

<script lang="ts">
    import type { Column } from '@tanstack/table-core';
    import { Button } from '$lib/components/ui/button/index.js';
    import ArrowUp from '@lucide/svelte/icons/arrow-up';
    import ArrowDown from '@lucide/svelte/icons/arrow-down';
    import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';

    let { label, column }: { label: string; column: Column<any, unknown> } = $props();
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

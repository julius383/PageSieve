<script lang="ts">
    import MoreHorizontal from '@lucide/svelte/icons/ellipsis';
    import Code from '@lucide/svelte/icons/code';
    import Copy from '@lucide/svelte/icons/copy';
    import type { Row } from '@tanstack/svelte-table';
    import type { ExtractedRow } from '@pagesieve/core/types';
    import type { DataTableFeatures } from './table-features';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

    let { row }: { row: Row<DataTableFeatures, ExtractedRow> } = $props();

    function copyAsJson() {
        if (row.original) {
            navigator.clipboard.writeText(JSON.stringify(row.original, null, 2));
        }
    }

    function copyAsCsv() {
        if (row.original) {
            const keys = Object.keys(row.original);
            const values = keys.map((k) => {
                const val = row.original[k];
                const str = val === null || val === undefined ? '' : String(val);
                return `"${str.replace(/"/g, '""')}"`;
            });
            navigator.clipboard.writeText(values.join(','));
        }
    }
</script>

{#if !row.getIsGrouped()}
    <DropdownMenu.Root>
        <DropdownMenu.Trigger>
            {#snippet child({ props })}
                <Button {...props} variant="ghost" class="size-8 p-0">
                    <span class="sr-only">Open menu</span>
                    <MoreHorizontal class="size-4" />
                </Button>
            {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <DropdownMenu.Item onclick={copyAsJson}>
                <Code class="mr-2 size-4" />
                Copy as JSON
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={copyAsCsv}>
                <Copy class="mr-2 size-4" />
                Copy as CSV
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
{/if}

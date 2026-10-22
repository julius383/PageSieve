<script lang="ts">
    import ArrowDown from '@lucide/svelte/icons/arrow-down';
    import ArrowUp from '@lucide/svelte/icons/arrow-up';
    import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
    import EyeOff from '@lucide/svelte/icons/eye-off';
    import Group from '@lucide/svelte/icons/group';
    import Pin from '@lucide/svelte/icons/pin';
    import PinOff from '@lucide/svelte/icons/pin-off';
    import Ungroup from '@lucide/svelte/icons/ungroup';
    import type { Column } from '@tanstack/svelte-table';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import { cn } from '$lib/utils.js';
    import type { DataTableFeatures } from './table-features';
    import type { ExtractedRow } from '@pagesieve/core/types';

    let {
        label,
        column,
        class: className,
    }: {
        label: string;
        column: Column<DataTableFeatures, ExtractedRow>;
        class?: string;
    } = $props();

    const canSort = $derived(column.getCanSort());
    const canHide = $derived(column.getCanHide());
    const canPin = $derived(column.getCanPin());
    const canGroup = $derived(column.getCanGroup());

    const sorted = $derived(canSort ? column.getIsSorted() : false);
    const pinned = $derived(canPin ? column.getIsPinned() : false);
    const grouped = $derived(canGroup ? column.getIsGrouped() : false);
</script>

{#if !canSort && !canHide && !canPin && !canGroup}
    <div class={cn(className)}>{label}</div>
{:else}
    <div class={cn('flex items-center gap-2', className)}>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {#snippet child({ props })}
                    <Button
                        {...props}
                        variant="ghost"
                        size="sm"
                        class="group -ml-3 h-8 data-[state=open]:bg-accent"
                    >
                        <span>{label}</span>
                        {#if sorted === 'desc'}
                            <ArrowDown class="ml-2 size-4" />
                        {:else if sorted === 'asc'}
                            <ArrowUp class="ml-2 size-4" />
                        {:else if canSort}
                            <ChevronsUpDown
                                class="ml-2 size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100"
                            />
                        {/if}
                    </Button>
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
                {#if canSort}
                    <DropdownMenu.Item onclick={() => column.toggleSorting(false)}>
                        <ArrowUp class="mr-2 size-3.5 text-muted-foreground/70" />
                        Asc
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onclick={() => column.toggleSorting(true)}>
                        <ArrowDown class="mr-2 size-3.5 text-muted-foreground/70" />
                        Desc
                    </DropdownMenu.Item>
                {/if}
                {#if canGroup}
                    {#if canSort}
                        <DropdownMenu.Separator />
                    {/if}
                    <DropdownMenu.Item onclick={() => column.toggleGrouping()}>
                        {#if grouped}
                            <Ungroup class="mr-2 size-3.5 text-muted-foreground/70" />
                            Ungroup
                        {:else}
                            <Group class="mr-2 size-3.5 text-muted-foreground/70" />
                            Group by
                        {/if}
                    </DropdownMenu.Item>
                {/if}
                {#if canPin}
                    {#if canSort || canGroup}
                        <DropdownMenu.Separator />
                    {/if}
                    <DropdownMenu.Item
                        onclick={() => column.pin('start')}
                        disabled={pinned === 'start'}
                    >
                        <Pin class="mr-2 size-3.5 text-muted-foreground/70" />
                        Pin left
                    </DropdownMenu.Item>
                    {#if pinned}
                        <DropdownMenu.Item onclick={() => column.pin(false)}>
                            <PinOff class="mr-2 size-3.5 text-muted-foreground/70" />
                            Unpin
                        </DropdownMenu.Item>
                    {/if}
                {/if}
                {#if canHide}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onclick={() => column.toggleVisibility(false)}>
                        <EyeOff class="mr-2 size-3.5 text-muted-foreground/70" />
                        Hide
                    </DropdownMenu.Item>
                {/if}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>
{/if}

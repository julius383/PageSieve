<!-- Column visibility + drag-reorderable column list adapted from kitchen-sink-shadcn -->
<script lang="ts">
    import Check from '@lucide/svelte/icons/check';
    import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
    import GripVertical from '@lucide/svelte/icons/grip-vertical';
    import Settings2 from '@lucide/svelte/icons/settings-2';
    import { DragDropProvider } from '@dnd-kit-svelte/svelte';
    import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
    import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
    import { move } from '@dnd-kit/helpers';
    import type { Column, Table } from '@tanstack/svelte-table';
    import type { DataTableFeatures } from './table-features';
    import type { ExtractedRow } from '@pagesieve/core/types';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Command from '$lib/components/ui/command/index.js';
    import * as Popover from '$lib/components/ui/popover/index.js';
    import { cn } from '$lib/utils.js';
    import { formatColumnName } from '@/ui/sidebar/util';

    let { table }: { table: Table<DataTableFeatures, ExtractedRow> } = $props();

    const columnOrder = $derived(table.atoms.columnOrder.get());

    const orderedColumns = $derived(
        [...table.getAllColumns()]
            .sort((a, b) => {
                const order =
                    columnOrder.length > 0 ? columnOrder : table.getAllColumns().map((c) => c.id);
                return order.indexOf(a.id) - order.indexOf(b.id);
            })
            .filter((column) => column.getCanHide() && column.id !== 'actions'),
    );
</script>

<DragDropProvider
    modifiers={[RestrictToVerticalAxis]}
    onDragEnd={(e) => {
        const currentOrder =
            columnOrder.length > 0 ? [...columnOrder] : table.getAllColumns().map((c) => c.id);
        table.setColumnOrder(move(currentOrder, e));
    }}
>
    <Popover.Root>
        <Popover.Trigger>
            {#snippet child({ props })}
                <Button
                    {...props}
                    aria-label="Toggle columns"
                    variant="outline"
                    role="combobox"
                    size="sm"
                    class="ms-auto flex h-8 gap-2 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                    <Settings2 class="size-4" />
                    View
                    <ChevronsUpDown class="ms-auto size-4 opacity-50" />
                </Button>
            {/snippet}
        </Popover.Trigger>
        <Popover.Content align="end" class="w-full max-w-48 p-0">
            <Command.Root>
                <Command.Input placeholder="Search columns..." />
                <Command.List>
                    <Command.Empty>No columns found.</Command.Empty>
                    <Command.Group>
                        {#each orderedColumns as column, index (column.id)}
                            {@render ColumnRow({ column, index })}
                        {/each}
                    </Command.Group>
                    <Command.Separator />
                    <Command.Group>
                        <div class="flex items-center gap-1 p-1">
                            <Command.Item
                                onSelect={() => table.toggleAllColumnsVisible(false)}
                                class="w-full justify-center border text-xs"
                            >
                                Hide All
                            </Command.Item>
                            <Command.Item
                                onSelect={() => table.toggleAllColumnsVisible(true)}
                                class="w-full justify-center border text-xs"
                            >
                                Show All
                            </Command.Item>
                        </div>
                    </Command.Group>
                </Command.List>
            </Command.Root>
        </Popover.Content>
    </Popover.Root>
</DragDropProvider>

{#snippet ColumnRow({
    column,
    index,
}: {
    column: Column<DataTableFeatures, ExtractedRow>;
    index: number;
})}
    {@const sortable = useSortable({ id: column.id, index: () => index })}

    <Command.Item
        aria-selected={column.getIsVisible()}
        data-selected={column.getIsVisible()}
        data-dragging={sortable.isDragging.current}
        class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
        onSelect={() => column.toggleVisibility(!column.getIsVisible())}
        {@attach sortable.ref}
    >
        <Check class={cn('size-4 shrink-0', column.getIsVisible() ? 'opacity-100' : 'opacity-0')} />
        <span class="truncate">{formatColumnName(column.id)}</span>
        <Button
            {@attach sortable.handleRef}
            variant="ghost"
            size="icon"
            class="ms-auto size-6 cursor-grab active:cursor-grabbing"
            onclick={(e) => e.stopPropagation()}
        >
            <GripVertical class="size-3.5" />
        </Button>
    </Command.Item>
{/snippet}

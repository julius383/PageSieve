<script lang="ts">
    import { onMount } from 'svelte';

    import { JsonViewer } from '@kaifronsdal/svelte-json-viewer';

    import * as InputGroup from '$lib/components/ui/input-group/index.js';
    import * as Collapsible from '$lib/components/ui/collapsible/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { buttonVariants } from '$lib/components/ui/button/index.js';

    import { default as dayjs } from 'dayjs';
    import advancedFormat from 'dayjs/plugin/advancedFormat.js';
    dayjs.extend(advancedFormat);

    import EditableInput from './EditableInput.svelte';

    import { Search, Pencil, Trash2, ChevronsUpDownIcon, ArrowUpToLine } from '@lucide/svelte';
    import Button from '$lib/components/ui/button/button.svelte';

    import { allConfigs, refreshConfigs } from '../stores/ui.svelte';
    import { loadConfig } from '../actions';
    import { renameConfig, removeConfig } from '../services/storage';

    import ConfirmDialog from './ConfirmDialog.svelte';

    onMount(() => {
        refreshConfigs();
    });

    let deletingId = $state('');
    let isConfirmOpen = $state(false);

    let editingId = $state(null);
    let newIdValue = $state('');

    function startEditing(item) {
        editingId = item.id;
        newIdValue = item.id;
    }

    function cancelEditing() {
        editingId = null;
        newIdValue = '';
    }

    async function saveRename(oldId: string) {
        if (newIdValue && oldId !== newIdValue) {
            await renameConfig(oldId, newIdValue);
            await refreshConfigs();
        }
        cancelEditing();
    }

    function openDeleteConfirmation(id: string) {
        deletingId = id;
        isConfirmOpen = true;
    }

    async function handleDelete(id: string): Promise<void> {
        // Proceed with destructive operation
        await removeConfig(id);
        await refreshConfigs();
    }
</script>

<InputGroup.Root>
    <InputGroup.Input placeholder="Search..." />
    <InputGroup.Addon>
        <Search />
    </InputGroup.Addon>
    <InputGroup.Addon align="inline-end">
        <InputGroup.Button>Search</InputGroup.Button>
    </InputGroup.Addon>
</InputGroup.Root>

<hr />
<div>
    {#each allConfigs.configs as item (item.id)}
        <div class="p-1 rounded-md mb-2 w-full">
            <Card.Root>
                <Card.Header>
                    <Card.Title class="text-wrap break-all">
                        <EditableInput
                            editing={editingId === item.id}
                            displayValue={item.id}
                            bind:editValue={newIdValue}
                            onSave={() => saveRename(item.id)}
                            onCancel={cancelEditing}
                        />
                    </Card.Title>
                    <Card.Description
                        >Saved on {dayjs(item.updatedAt).format('D MMM YYYY')}</Card.Description
                    >
                    <Card.Action>
                        {#if editingId !== item.id}
                            <div class="flex items-end gap-x-1 flex-start">
                                <Tooltip.Provider>
                                    <Tooltip.Root>
                                        <Tooltip.Trigger>
                                            <Button
                                                onclick={() => startEditing(item)}
                                                variant="outline"
                                                size="icon"
                                            >
                                                <Pencil />
                                            </Button>
                                        </Tooltip.Trigger>
                                        <Tooltip.Content>
                                            <p>Rename config</p>
                                        </Tooltip.Content>
                                    </Tooltip.Root>
                                </Tooltip.Provider>

                                <Button
                                    onclick={() => openDeleteConfirmation(item.id)}
                                    variant="destructive"
                                    size="icon"
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        {/if}
                    </Card.Action>
                </Card.Header>
                <Card.Content>
                    <Collapsible.Root>
                        <div class="flex items-center justify-between space-x-4">
                            <h4 class="text-sm">Show Configuration</h4>
                            <Collapsible.Trigger
                                class={buttonVariants({
                                    variant: 'ghost',
                                    size: 'sm',
                                    class: 'w-9 p-0',
                                })}
                            >
                                <ChevronsUpDownIcon />
                                <span class="sr-only">Toggle</span>
                            </Collapsible.Trigger>
                        </div>
                        <Collapsible.Content>
                            <div class="p-4 rounded-md text-sm overflow-wrap">
                                <JsonViewer value={item} />
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                </Card.Content>
                <Card.Footer>
                    <Button class="w-full" onclick={() => loadConfig(item)}>
                        <ArrowUpToLine />
                        Load Config
                    </Button>
                </Card.Footer>
            </Card.Root>
        </div>
    {/each}
    <ConfirmDialog
        bind:open={isConfirmOpen}
        onConfirm={() => handleDelete(deletingId)}
        onCancel={() => {
            deletingId = '';
        }}
    >
        {#snippet description()}
            This action cannot be undone. This will permanently delete config with id
            <pre class="mt-2 p-2 bg-secondary rounded border">{deletingId}</pre>
        {/snippet}
    </ConfirmDialog>
</div>
<script lang="ts">
    import { onMount } from 'svelte';
    import * as Item from '$lib/components/ui/item/index.js';
    import {
        allSnapshots,
        refreshSnapshots,
        setExtractedData,
    } from '@/ui/sidebar/stores/ui.svelte';
    import { removeSnapshot } from '@/ui/sidebar/services/storage';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import Button from '$lib/components/ui/button/button.svelte';
    import { Trash2, Upload } from '@lucide/svelte';
    import ConfirmDialog from '@/ui/sidebar/components/ConfirmDialog.svelte';
    import { default as dayjs } from 'dayjs';

    let deletingId = $state('');
    let isConfirmOpen = $state(false);

    function openDeleteConfirmation(id: string) {
        deletingId = id;
        isConfirmOpen = true;
    }
    onMount(() => {
        refreshSnapshots();
    });
    async function handleDelete(id: string): Promise<void> {
        // Proceed with destructive operation
        await removeSnapshot(id);
        await refreshSnapshots();
    }
</script>

<Item.Root class="w-full flex-col">
    <Item.Header>Result Snapshots</Item.Header>
    {#each allSnapshots.snapshots as snapshot (snapshot.id)}
        <div class="flex flex-row min-w-4xl text-lg">
            <Item.Content>
                <Item.Title>{snapshot.id}</Item.Title>
                <Item.Description
                    >Saved on {dayjs(snapshot.timestamp).format(
                        'D MMM YYYY hh:mm A',
                    )}</Item.Description
                >
            </Item.Content>

            <Item.Actions class="ml-2">
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button
                                onclick={() => setExtractedData(snapshot.results)}
                                variant="outline"
                                size="icon"
                            >
                                <Upload />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>Load Results</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>

                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button
                                onclick={() => openDeleteConfirmation(snapshot.id)}
                                variant="outline"
                                size="icon"
                            >
                                <Trash2 />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>Delete Snapshot</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            </Item.Actions>
        </div>
    {/each}
</Item.Root>

<ConfirmDialog
    bind:open={isConfirmOpen}
    onConfirm={() => handleDelete(deletingId)}
    onCancel={() => {
        deletingId = '';
    }}
>
    {#snippet description()}
        This action cannot be undone. This will permanently delete results snapshot with id
        <pre class="mt-2 p-2 bg-secondary rounded border">{deletingId}</pre>
    {/snippet}
</ConfirmDialog>

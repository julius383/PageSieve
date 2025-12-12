<script lang="ts">
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Trash2, Pipette } from '@lucide/svelte';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    let { id, deleteHandler, fieldName = $bindable(), cssSelector = $bindable() } = $props();

    function handleInspect() {
        return;
        // This will require communication with a content script.
        // For now just a placeholder.
        // dispatch("inspect");
    }
</script>

<div class="border p-4 rounded-md mb-4">
    <div class="flex items-end gap-2 mb-2">
        <div class="grid w-full items-center gap-1.5">
            <label for="field-name-{id}" class="text-sm font-medium leading-none">Field Name</label>
            <Input id="field-name-{id}" bind:value={fieldName} placeholder="e.g. productName" />
        </div>
        <Tooltip.Provider>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button onclick={handleInspect} variant="outline" size="icon">
                        <Pipette color=#fff/>
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <p>Start Element Picker</p>
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>

        <Tooltip.Provider>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button onclick={deleteHandler} variant="destructive" size="icon">
                        <Trash2 />
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <p>Delete Field</p>
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    </div>
    <div class="grid w-full items-center gap-1.5">
        <label for="css-selector" class="text-sm font-medium leading-none">CSS Selector</label>
        <Input id="css-selector" bind:value={cssSelector} placeholder="e.g. h1.title" />
    </div>
</div>
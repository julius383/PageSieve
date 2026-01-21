<script lang="ts">
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Trash2 } from '@lucide/svelte';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    import ElementPicker from './ElementPicker.svelte';

    let { id, deleteHandler, fieldName = $bindable(), cssSelector = $bindable() } = $props();

    let pickingElement = $state(false);
</script>

<div class="border p-4 rounded-md mb-4">
    <div class="flex items-end gap-2 mb-2">
        <div class="grid w-full items-center gap-1.5">
            <label for="field-name-{id}" class="text-sm font-medium leading-none">Field Name</label>

            <div class="flex items-end gap-x-1 flex-start">
                <Input id="field-name-{id}" bind:value={fieldName} placeholder="e.g. productName" />
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button onclick={deleteHandler} variant="destructive" size="icon" disabled={pickingElement}>
                                <Trash2 />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>Delete Field</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            </div>
        </div>
    </div>
    <ElementPicker bind:cssSelector={cssSelector} bind:pickingElement={pickingElement} />
</div>
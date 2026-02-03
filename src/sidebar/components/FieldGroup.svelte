<script lang="ts">
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Trash2, SquareStack } from '@lucide/svelte';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { Toggle } from '$lib/components/ui/toggle/index.js';

    import ElementPicker from './ElementPicker.svelte';

    let {
        id,
        deleteHandler,
        fieldName = $bindable(),
        cssSelector = $bindable(),
        type = $bindable(),
    } = $props();

    function toggleType() {
        type = type == undefined || type == 'single' ? 'array' : 'single';
    }
    let pressed = $derived(type == undefined || type == 'single' ? false : true);

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
                            <Button
                                onclick={deleteHandler}
                                variant="destructive"
                                size="icon"
                                disabled={pickingElement}
                            >
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
    <div class="flex items-end gap-x-1 flex-start">
        <ElementPicker bind:cssSelector bind:pickingElement />
        <Tooltip.Provider>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Toggle
                        aria-label="Extract Array"
                        size="sm"
                        variant="outline"
                        {pressed}
                        class="data-[state=on]:bg-transparent data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
                        onclick={toggleType}
                    >
                        <SquareStack />
                    </Toggle>
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <p>Enable to extract multiples of this element per item.</p>
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    </div>
</div>

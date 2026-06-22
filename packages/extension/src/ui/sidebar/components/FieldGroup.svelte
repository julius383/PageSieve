<script lang="ts">
    // import * as Item from '$lib/components/ui/item/index.js';
    import { fade } from 'svelte/transition';
    import {
        addField,
        removeField,
        duplicateField,
    } from '@/ui/sidebar/stores/scrapeConfig.svelte';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Trash2, Copy, Square, List, Tally5, CirclePile } from '@lucide/svelte';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
    import ElementPicker from '@/ui/sidebar/components/ElementPicker.svelte';

    let {
        id,
        container,
        fieldName = $bindable(),
        cssSelector = $bindable(),
        type = $bindable(),
        extract = $bindable(),
        attribute = $bindable(),
        property = $bindable(),
        fields = $bindable(),
    } = $props();

    let pickingElement = $state(false);

    function createFields(id: string) {
        addField(id);
        extract = 'text';
    }
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
                                aria-label="Copy element"
                                size="sm"
                                variant="outline"
                                onclick={() => duplicateField(id)}
                            >
                                <Copy />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>Duplicate this element</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button
                                onclick={() => removeField(id)}
                                variant="destructive"
                                size="icon"
                                disabled={pickingElement}
                                class="bg-red-500 text-white font-bold hover:bg-red-800"
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
        <ElementPicker {container} bind:cssSelector bind:pickingElement />
    </div>
    <span class="text-[11px] text-gray-400">Cardinality</span>
    <div class="flex w-full mt-2">
        <!-- TODO: figure out how to prevent toggle off but between move between states e.g toggle off for single should be disabled -->
        <ToggleGroup.Root class="w-full" type="single" spacing={2} size="lg" bind:value={type}>
            <ToggleGroup.Item value="single" aria-label="Extract single item" class="flex-1 data-[state=on]:bg-gray-800">
                <Square />
                Single
            </ToggleGroup.Item>
            <ToggleGroup.Item value="multiple" aria-label="Extract multiple items" class="flex-1 data-[state=on]:bg-gray-800">
                <List />
                List
            </ToggleGroup.Item>
            <ToggleGroup.Item value="count" aria-label="Count the number of items" class="flex-1 data-[state=on]:bg-gray-800">
                <Tally5 />
                Count
            </ToggleGroup.Item>
        </ToggleGroup.Root>
    </div>
    {#if type != 'count'}
        <div transition:fade={{ duration: 300 }}>
            <span class="text-[11px] text-gray-400">Extract</span>
            <div class="flex w-full my-2">
                <ToggleGroup.Root
                    class="w-full"
                    type="single"
                    spacing={2}
                    size="lg"
                    bind:value={extract}
                >
                    <ToggleGroup.Item value="text" aria-label="Extract single item" class="flex-1 data-[state=on]:bg-gray-800">
                        Text
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                        value="attribute"
                        aria-label="Extract multiple items"
                        class="flex-1 data-[state=on]:bg-gray-800"
                        disabled={(fields != undefined && fields.length > 0)}
                    >
                        Attribute
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                        value="property"
                        aria-label="Count the number of items"
                        class="flex-1 data-[state=on]:bg-gray-800"
                        disabled={(fields !== undefined && fields.length > 0)}
                    >
                        Property
                    </ToggleGroup.Item>
                </ToggleGroup.Root>
            </div>
        </div>
    {/if}
    {#if extract == 'attribute' && type != 'count' && fields == undefined}
        <div transition:fade={{ duration: 300 }}>
            <Input id="attribute-{id}" bind:value={attribute} placeholder="e.g. href, src, data-id" />
        </div>
    {/if}
    {#if extract == 'property' && type != 'count' && fields == undefined}
        <div transition:fade={{ duration: 300 }}>
            <Input id="attribute-{id}" bind:value={property} placeholder="e.g. innerHTML, outerHTML, innerText" />
        </div>
    {/if}
    {#if type == 'multiple'}
        <div transition:fade={{ duration: 300 }}>
        {#if !fields}
            <Button onclick={() => createFields(id)} class="mt-4 w-full">
                <CirclePile /> Create sub fields
            </Button>
        {:else}
            {#each fields as subfield (subfield.id)}
                <div transition:fade class="flex items-end gap-x-1 flex-start">
                    <div class="grid grid-cols-3 mx-0.5">
                        <div class="space-y-2 mx-1">
                            <Input
                                placeholder="Label"
                                bind:value={subfield.name}
                            />
                        </div>

                        <div class="col-span-2">
                            <ElementPicker
                                label=''
                                container={cssSelector}
                                bind:cssSelector={subfield.selector}
                                bind:pickingElement
                            />
                        </div>
                    </div>

                    <Tooltip.Provider>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <Button
                                    onclick={() => removeField(subfield.id)}
                                    variant="destructive"
                                    size="icon"
                                    disabled={pickingElement}
                                    class="bg-red-500 text-white font-bold hover:bg-red-800"
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
            {/each}
            <Button onclick={() => addField(id)} class="mt-4 w-full">
                <CirclePile /> Add sub field
            </Button>
        {/if}
        </div>
    {/if}
</div>

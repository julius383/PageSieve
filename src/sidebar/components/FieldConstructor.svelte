<script lang="ts">
    import FieldGroup from './FieldGroup.svelte';
    import ElementPicker from './ElementPicker.svelte';
    import { Button } from '$lib/components/ui/button';
    import { Plus, ChevronDown, ChevronUp, X } from '@lucide/svelte';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    import {
        addDefinition,
        removeDefinition,
        removeGroup,
        scrapeConfig,
    } from '../stores/scrapeConfig.svelte';
    import * as Accordion from '$lib/components/ui/accordion/index.js';

    // let group = scrapeConfig.selectors[0];
    let showLabels = $derived(scrapeConfig.selectors.length > 1);

    let openGroups = $state<string[]>(scrapeConfig.selectors.map((g) => g.id.toString()));

    $effect(() => {
        if (
            scrapeConfig.selectors.length == 1 &&
            !openGroups.includes(scrapeConfig.selectors[0].id.toString())
        ) {
            toggleGroup(scrapeConfig.selectors[0].id.toString());
        }
    });

    function toggleGroup(id: string) {
        if (openGroups.includes(id)) {
            openGroups = openGroups.filter((g) => g !== id);
        } else {
            openGroups = [...openGroups, id];
        }
    }
</script>

{#if scrapeConfig.selectors !== undefined}
    <section id="field-constructor" class="overflow-y-auto pt-1">
        <Accordion.Root type="multiple" bind:value={openGroups}>
            {#each scrapeConfig.selectors as group (group.id)}
                <div class="relative border rounded-lg px-5 pt-5 pb-4 mb-4">
                    {#if showLabels}
                        <div
                            class="absolute -top-2.5 left-2 flex items-center gap-1 bg-background px-1"
                        >
                            <Tooltip.Provider>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            class="flex items-center justify-center size-6 rounded hover:text-gray-300 hover:bg-white/10"
                                            onclick={() => toggleGroup(group.id.toString())}
                                        >
                                            {#if openGroups.includes(group.id.toString())}
                                                <ChevronUp class="size-4 transition-transform" />
                                            {:else}
                                                <ChevronDown class="size-4 transition-transform" />
                                            {/if}
                                        </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Toggle group</Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>

                            <span class="text-[11px] text-gray-400 select-none mx-2"
                                >Group {group.id}</span
                            >
                            <Tooltip.Provider>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            class="flex items-center justify-center size-6 rounded hover:text-red-400 hover:bg-white/10"
                                            onclick={() => removeGroup(group.id)}
                                        >
                                            <X class="size-3" />
                                        </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Delete group</Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        </div>
                    {/if}
                    <Accordion.Item value={group.id.toString()} class="border-none">
                        <Accordion.Content>
                            <div class="bg-secondary space-y-4 mb-6">
                                <ElementPicker
                                    label="Container Selector"
                                    header_style="font-bold text-md leading-none"
                                    bind:cssSelector={group.container}
                                />
                            </div>
                            <div class="pl-2 space-y-4 flex-1 overflow-y-auto">
                                {#each group.fields as field (field.id)}
                                    <FieldGroup
                                        id={field.id}
                                        deleteHandler={() => removeDefinition(field.id)}
                                        bind:fieldName={field.name}
                                        bind:cssSelector={field.selector}
                                        bind:type={field.type}
                                    />
                                {/each}
                            </div>
                            <Button onclick={() => addDefinition(group.id)} class="mt-4 w-full">
                                <Plus /> Add Field
                            </Button>
                        </Accordion.Content>
                    </Accordion.Item>
                </div>
            {/each}
        </Accordion.Root>
    </section>
{:else}
    <div>
        <span>Error with Field Group</span>
    </div>
{/if}

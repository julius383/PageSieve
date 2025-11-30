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

    import { Search, Pencil, Trash2, ChevronsUpDownIcon, ArrowUpToLine } from '@lucide/svelte';
    import Button from '$lib/components/ui/button/button.svelte';

    import { loadAllConfigs, loadConfig } from './state.svelte';
    /*
    const items = [
        {
            fieldConf: [{ id: 1, name: 'title', selector: 'h2' }],
            propsConf: [{ id: 1, key: 'URL', value: '' }],
            createdAt: 1764496643810,
            updatedAt: 1764496643812,
            id: 'developer.mozilla.org:tabs-Tab:a2db756c',
        },
        {
            fieldConf: [{ id: 1, name: 'title', selector: 'h2' }],
            propsConf: [{ id: 1, key: 'URL', value: '' }],
            createdAt: 1764496643810,
            updatedAt: 1764496643812,
            id: 'developer.mozilla.org:tabs-Tab:a2db756c',
        },
    ];
    */
    let items = $state([]);
    onMount(async () => {
        items = await loadAllConfigs();
        // console.dir(items);
    });

    function rename(id) {
        return id;
    }

    function delete_(id) {
        return;
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
    {#each items as item}
        <div class="p-1 rounded-md mb-2 w-full">
            <Card.Root>
                <Card.Header>
                    <Card.Title class="text-wrap break-all">{item.id}</Card.Title>
                    <Card.Description
                        >Saved on {dayjs(item.updatedAt).format('D MMM YYYY')}</Card.Description
                    >
                    <Card.Action>
                        <div class="flex items-end gap-x-1 flex-start">
                            <Tooltip.Provider>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Button
                                            onclick={() => rename(item.id)}
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

                            <Tooltip.Provider>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Button
                                            onclick={() => delete_(item.id)}
                                            variant="destructive"
                                            size="icon"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>
                                        <p>Delete config</p>
                                    </Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        </div>
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
                            <div class="bg-slate-100 p-4 rounded-md text-sm overflow-wrap">
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
</div>

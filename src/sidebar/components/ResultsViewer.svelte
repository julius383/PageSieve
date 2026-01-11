<script lang="ts">
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import { Button } from '$lib/components/ui/button';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as Table from '$lib/components/ui/table';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { Download, SquareX } from '@lucide/svelte';
    import { JsonViewer } from '@kaifronsdal/svelte-json-viewer';

    import { formatColumnName, downloadCSV, downloadJSON } from '../util';

    import { extractedData, resetExtractedData } from '../stores/ui.svelte';

    const dataColumns = $derived.by(() => {
        return extractedData.data.length > 0 ? Object.keys(extractedData.data[0]) : [];
    });
</script>

<div class="space-y-4">
    <hr />
    <h2 class="text-2xl font-bold">
        Results {#if extractedData.data.length > 0}
            ({extractedData.data.length})
        {/if}
    </h2>
</div>
<Tabs.Root value="data" class="h-full flex flex-col">
    <Tabs.List class="flex justify-between items-center w-full">
        <div class="flex">
            <Tabs.Trigger value="data">Data</Tabs.Trigger>
            <Tabs.Trigger value="json">JSON</Tabs.Trigger>
        </div>
        <div>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Tooltip.Provider>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <Button variant="secondary" size="sm">
                                    <Download />
                                </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Download Data</Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item onclick={() => downloadCSV(extractedData.data)}
                        >Download CSV</DropdownMenu.Item
                    >
                    <DropdownMenu.Item onclick={() => downloadJSON(extractedData.data)}
                        >Download JSON</DropdownMenu.Item
                    >
                </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button size="icon" variant="destructive" onclick={resetExtractedData}>
                            <SquareX class="size-4" strokeWidth={2.5} />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Download Data</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    </Tabs.List>
    <Tabs.Content value="data" class="pt-4 overflow-auto flex-grow">
        <div class="border rounded-md">
            <Table.Root>
                <Table.Header class="bg-accent">
                    <Table.Row>
                        {#each dataColumns as column}
                            <Table.Head>{formatColumnName(column)}</Table.Head>
                        {/each}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each extractedData.data as row}
                        <Table.Row>
                            {#each dataColumns as column}
                                <Table.Cell>{row[column]}</Table.Cell>
                            {/each}
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
        </div>
    </Tabs.Content>
    <Tabs.Content value="json" class="pt-4 overflow-auto flex-grow">
        <div class="p-4 rounded-md text-sm overflow-wrap">
            <JsonViewer value={extractedData.data} />
        </div>
    </Tabs.Content>
</Tabs.Root>

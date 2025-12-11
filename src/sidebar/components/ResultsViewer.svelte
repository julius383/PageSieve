<script lang="ts">
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import { Button } from '$lib/components/ui/button';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as Table from '$lib/components/ui/table';
    import { Download, SquareX } from '@lucide/svelte';

    import { formatColumnName } from '../util';

    import {
        extractedData,
        columns,
        downloadCSV,
        downloadJSON,
        resetExtractedData,
    } from '../state.svelte';

    import { JsonViewer } from '@kaifronsdal/svelte-json-viewer';
</script>

<div class="space-y-4">
    <hr />
    <h2 class="text-2xl font-bold">Results</h2>
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
                    <Button variant="secondary" size="sm">
                        <Download />
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item onclick={downloadCSV}>Download CSV</DropdownMenu.Item>
                    <DropdownMenu.Item onclick={downloadJSON}>Download JSON</DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Button size="icon" variant="destructive" onclick={resetExtractedData}>
                <SquareX class="size-4" strokeWidth={2.5} />
            </Button>
        </div>
    </Tabs.List>
    <Tabs.Content value="data" class="pt-4 overflow-auto flex-grow">
        <div class="border rounded-md">
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        {#each $columns as column}
                            <Table.Head>{formatColumnName(column)}</Table.Head>
                        {/each}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each $extractedData as row}
                        <Table.Row>
                            {#each $columns as column}
                                <Table.Cell>{row[column]}</Table.Cell>
                            {/each}
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
        </div>
    </Tabs.Content>
    <Tabs.Content value="json" class="pt-4 overflow-auto flex-grow">
        <div class="bg-slate-100 p-4 rounded-md text-sm overflow-wrap">
            <JsonViewer value={$extractedData} />
        </div>
    </Tabs.Content>
</Tabs.Root>
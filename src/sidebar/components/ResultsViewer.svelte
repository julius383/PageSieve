<script lang="ts">
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import { Button } from '$lib/components/ui/button';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as Table from '$lib/components/ui/table';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { Download, SquareX, ExternalLink } from '@lucide/svelte';
    import { JsonViewer } from '@kaifronsdal/svelte-json-viewer';
    import DataTable from './DataTable.svelte';

    import { formatColumnName, downloadCSV, downloadJSON } from '../util';

    import { extractedData, resetExtractedData } from '../stores/ui.svelte';
    import { saveResults, getLatestResults, saveLogs } from '../services/storage';
    import { logs } from '../stores/logs';
    import { onMount } from 'svelte';

    let { openInNewTab = true } = $props();

    onMount(async () => {
        if (openInNewTab) {
            const results = await getLatestResults();
            if (results) {
                extractedData.data[0].results = results;
            }
        }
    });

    // FIXME: handle multiple items in extractedData
    const dataColumns = $derived.by(() => {
        return extractedData.data[0]?.results?.length > 0
            ? Object.keys(extractedData.data[0].results[0])
            : [];
    });

    async function showInNewTab() {
        await saveLogs($logs);
        await saveResults(extractedData.data[0].results);
        await browser.runtime.sendMessage({ action: 'openFullPage' });
    }
</script>

<div class="space-y-4">
    <hr />
    <h2 class="text-2xl font-bold">
        Results {#if extractedData.data[0]?.results?.length > 0}
            ({extractedData.data[0].results.length})
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
                    <DropdownMenu.Item onclick={() => downloadCSV(extractedData.data[0].results)}
                        >Download CSV</DropdownMenu.Item
                    >
                    <DropdownMenu.Item onclick={() => downloadJSON(extractedData.data[0].results)}
                        >Download JSON</DropdownMenu.Item
                    >
                </DropdownMenu.Content>
            </DropdownMenu.Root>
            {#if !openInNewTab}
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button size="sm" variant="secondary" onclick={showInNewTab}>
                                <ExternalLink class="size-4" strokeWidth={2.5} />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>View Results in New Tab</Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button size="icon" variant="destructive" onclick={resetExtractedData}>
                                <SquareX class="size-4" strokeWidth={2.5} />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>Clear Data</Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            {/if}
        </div>
    </Tabs.List>
    <Tabs.Content value="data" class="px-4 overflow-auto grow">
        <DataTable />
    </Tabs.Content>
    <Tabs.Content value="json" class="px-4 overflow-auto grow">
        <div class="p-4 rounded-md text-sm overflow-wrap">
            <JsonViewer value={extractedData.data[0]?.results} />
        </div>
    </Tabs.Content>
</Tabs.Root>

<script lang="ts">
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import { Button } from '$lib/components/ui/button';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import {
        Download,
        SquareX,
        ExternalLink,
        ClipboardCopy,
        ChevronDown,
        ChevronUp,
    } from '@lucide/svelte';
    import { JsonViewer } from '@kaifronsdal/svelte-json-viewer';
    import * as Accordion from '$lib/components/ui/accordion/index.js';
    import DataTable from './DataTable.svelte';

    import type { SupportedExportDataTypes } from '../../types';

    import { downloadCSV, downloadJSON, downloadBundle, clipboardCopy } from '../util';

    import { extractedData, resetExtractedData } from '../stores/ui.svelte';
    import { saveResults, getLatestResults, saveLogs } from '../services/storage';
    import { logs } from '../stores/logs';
    import { onMount } from 'svelte';

    let { openInNewTab = true } = $props();

    onMount(async () => {
        if (openInNewTab) {
            const results = await getLatestResults();
            if (results) {
                extractedData.data = results;
            }
        }
    });

    const totalResults = $derived(
        extractedData.data.reduce((sum, group) => sum + group.results.length, 0),
    );

    let openGroups = $state<string[]>(extractedData.data.map((g) => g.id.toString()));

    function toggleGroup(id: string) {
        if (openGroups.includes(id)) {
            openGroups = openGroups.filter((g) => g !== id);
        } else {
            openGroups = [...openGroups, id];
        }
    }

    async function showInNewTab() {
        await saveLogs($logs);
        await saveResults(extractedData.data || []);
        await browser.runtime.sendMessage({ action: 'openFullPage' });
    }
</script>

<div class="space-y-4">
    <hr />
    <h2 class="text-2xl font-bold">
        Results {#if totalResults > 0}
            ({totalResults})
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
                            <Tooltip.Content>Download Data to File</Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item onclick={() => downloadJSON(extractedData.data)}
                        >Download JSON </DropdownMenu.Item
                    >
                    {#if extractedData.data.length > 1}
                            <DropdownMenu.Sub>
                                <DropdownMenu.SubTrigger>Download CSV</DropdownMenu.SubTrigger>
                                <DropdownMenu.SubContent>
                                    <DropdownMenu.Item onclick={() => downloadBundle(extractedData.data, 'csv')}
                                    >Download CSV (All)</DropdownMenu.Item>
                                    {#each extractedData.data as group_data (group_data.id)}
                                        <DropdownMenu.Item onclick={() => downloadCSV(group_data.results)}
                                            >Download CSV (Group {group_data.id})</DropdownMenu.Item
                                        >
                                    {/each}
                                </DropdownMenu.SubContent>
                            </DropdownMenu.Sub>
                    {:else }
                        <DropdownMenu.Item onclick={() => downloadCSV(extractedData.data[0]?.results)}
                        >Download CSV</DropdownMenu.Item>
                    {/if}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Tooltip.Provider>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <Button variant="secondary" size="sm">
                                    <ClipboardCopy />
                                </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Copy Data to Clipboard</Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    {#snippet CopyOption(label: string, format: SupportedExportDataTypes)}
                        {#if extractedData.data.length > 1}
                            <DropdownMenu.Sub>
                                <DropdownMenu.SubTrigger>Copy {label}</DropdownMenu.SubTrigger>
                                <DropdownMenu.SubContent>
                                    {#each extractedData.data as group_data (group_data.id)}
                                        <DropdownMenu.Item
                                            onclick={() => clipboardCopy(group_data.results, format)}
                                            >Copy {label} (Group {group_data.id})</DropdownMenu.Item
                                        >
                                    {/each}
                                </DropdownMenu.SubContent>
                            </DropdownMenu.Sub>
                        {:else}
                            <DropdownMenu.Item
                                onclick={() => clipboardCopy(extractedData.data[0]?.results, format)}
                                >Copy {label}</DropdownMenu.Item
                            >
                        {/if}
                    {/snippet}

                    <DropdownMenu.Item onclick={() => clipboardCopy(extractedData.data, 'json')}
                    >Copy JSON</DropdownMenu.Item
                    >

                    {@render CopyOption('CSV', 'csv')}
                    {@render CopyOption('HTML Table', 'html')}
                    {@render CopyOption('Markdown Table', 'markdown')}
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
        <Accordion.Root type="multiple" bind:value={openGroups} class="space-y-4">
            {#each extractedData.data as groupData (groupData.id)}
                <div class="relative border rounded-lg px-5 pt-5 pb-4">
                    <div class="absolute -top-2.5 left-2 flex items-center gap-1 bg-background px-1">
                        <Button
                            size="icon"
                            variant="secondary"
                            class="flex items-center justify-center size-6 rounded hover:text-gray-300 hover:bg-white/10"
                            onclick={() => toggleGroup(groupData.id.toString())}
                        >
                            {#if openGroups.includes(groupData.id.toString())}
                                <ChevronUp class="size-4 transition-transform" />
                            {:else}
                                <ChevronDown class="size-4 transition-transform" />
                            {/if}
                        </Button>
                        <span class="text-[11px] text-gray-400 select-none mx-2">
                            Group {groupData.id} ({groupData.results.length})
                        </span>
                    </div>
                    <Accordion.Item value={groupData.id.toString()} class="border-none">
                        <Accordion.Content>
                            <DataTable data={groupData.results} />
                        </Accordion.Content>
                    </Accordion.Item>
                </div>
            {/each}
        </Accordion.Root>
    </Tabs.Content>
    <Tabs.Content value="json" class="px-4 overflow-auto grow">
        <div class="p-4 rounded-md text-sm overflow-wrap">
            <JsonViewer value={extractedData.data} />
        </div>
    </Tabs.Content>
</Tabs.Root>
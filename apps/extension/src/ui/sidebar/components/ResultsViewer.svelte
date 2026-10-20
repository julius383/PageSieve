<script lang="ts">
    import { SvelteSet } from 'svelte/reactivity';
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
    import { confirm } from '@/ui/sidebar/services/confirm.svelte';
    import DataTable from '@/ui/sidebar/components/DataTable.svelte';

    import type { SupportedExportDataTypes } from '@pagesieve/core/types';

    import { downloadBundle, clipboardCopy, downloadFormat } from '@/ui/sidebar/util';

    import { extractedData, resetExtractedData } from '@/ui/sidebar/stores/ui.svelte';
    import {
        saveResults,
        getLatestResults,
        saveLogs,
        saveSnapshot,
    } from '@/ui/sidebar/services/storage';
    import { logStore } from '@/ui/sidebar/stores/logs';
    import { onMount } from 'svelte';
    import { scrapeConfig } from '@/ui/sidebar/stores/scrapeConfig.svelte';

    let { openInNewTab = true } = $props();

    let openGroups = $state<string[]>([]);

    const seenGroupIds = new SvelteSet<string>();

    $effect(() => {
        const currentGroupIds = extractedData.data.map((g) => g.id);
        const currentIdSet = new Set(currentGroupIds);

        for (const id of seenGroupIds) {
            if (!currentIdSet.has(id)) {
                seenGroupIds.delete(id);
            }
        }

        const newGroupIds = currentGroupIds.filter((id) => !seenGroupIds.has(id));

        if (newGroupIds.length > 0) {
            for (const id of newGroupIds) {
                seenGroupIds.add(id);
            }
            openGroups = Array.from(new Set([...openGroups, ...newGroupIds]));
        }
    });

    onMount(async () => {
        if (openInNewTab) {
            const results = await getLatestResults();
            if (results) {
                extractedData.data = results.results;
            }
        }
    });

    $effect(() => {
        // save snapshot of data everytime extractedData is updated
        const snapshotKey = scrapeConfig.id;
        if (snapshotKey !== '' && snapshotKey !== undefined) {
            saveSnapshot(snapshotKey, extractedData.data);
        }
    });

    const totalResults = $derived(
        extractedData.data.reduce((sum, group) => sum + group.results.length, 0),
    );

    function toggleGroup(id: string) {
        if (openGroups.includes(id)) {
            openGroups = openGroups.filter((g) => g !== id);
        } else {
            openGroups = [...openGroups, id];
        }
    }

    async function showInNewTab() {
        await saveLogs($logStore);
        await saveResults(extractedData.data || []);
        await browser.runtime.sendMessage({ action: 'openFullPage' });
    }

    async function handleResetData() {
        if (
            await confirm({
                title: 'Clear results data?',
                description:
                    'Are you sure you want to clear all the extracted data? This action cannot be undone.',
                confirmLabel: 'Clear',
                variant: 'destructive',
            })
        ) {
            resetExtractedData();
        }
    }
</script>

<div class="h-full flex flex-col min-h-0">
    <div class="space-y-4 shrink-0">
        <hr />
        <h2 class="text-2xl font-bold">
            Results {#if totalResults > 0}
                ({totalResults})
            {/if}
        </h2>
    </div>
    <Tabs.Root value="table" class="flex-1 min-h-0 flex flex-col">
        <Tabs.List class="flex justify-between items-center w-full">
            <div class="flex">
                <Tabs.Trigger value="table">Table</Tabs.Trigger>
                <Tabs.Trigger value="json">JSON</Tabs.Trigger>
            </div>
            <div>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    class="hover:text-gray-400 hover:bg-white/10"
                                >
                                    <Download />
                                </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Download Data to File</Tooltip.Content>
                        </Tooltip.Root>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        {#snippet DownloadOption(label: string, type: SupportedExportDataTypes)}
                            {#if extractedData.data.length > 1}
                                <DropdownMenu.Sub>
                                    <DropdownMenu.SubTrigger
                                        >Download {label}</DropdownMenu.SubTrigger
                                    >
                                    <DropdownMenu.SubContent>
                                        <DropdownMenu.Item
                                            onclick={() => downloadBundle(extractedData.data, type)}
                                            >All</DropdownMenu.Item
                                        >
                                        {#each extractedData.data as group_data (group_data.id)}
                                            <DropdownMenu.Item
                                                onclick={() =>
                                                    downloadFormat(group_data.results, type)}
                                                >Group {group_data.id}</DropdownMenu.Item
                                            >
                                        {/each}
                                    </DropdownMenu.SubContent>
                                </DropdownMenu.Sub>
                            {:else}
                                <DropdownMenu.Item
                                    onclick={() =>
                                        downloadFormat(extractedData.data[0]?.results, type)}
                                    >Download {label}</DropdownMenu.Item
                                >
                            {/if}
                        {/snippet}
                        {@render DownloadOption('JSON', 'json')}
                        {@render DownloadOption('NDJSON', 'ndjson')}
                        {@render DownloadOption('CSV', 'csv')}
                        {@render DownloadOption('HTML', 'html')}
                        {@render DownloadOption('Markdown', 'markdown')}
                        {@render DownloadOption('YAML', 'yaml')}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    class="hover:text-gray-400 hover:bg-white/10"
                                >
                                    <ClipboardCopy />
                                </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Copy Data to Clipboard</Tooltip.Content>
                        </Tooltip.Root>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        {#snippet CopyOption(label: string, format: SupportedExportDataTypes)}
                            {#if extractedData.data.length > 1}
                                <DropdownMenu.Sub>
                                    <DropdownMenu.SubTrigger>Copy {label}</DropdownMenu.SubTrigger>
                                    <DropdownMenu.SubContent>
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                clipboardCopy(extractedData.data, format)}
                                            >All
                                        </DropdownMenu.Item>
                                        {#each extractedData.data as group_data (group_data.id)}
                                            <DropdownMenu.Item
                                                onclick={() =>
                                                    clipboardCopy(group_data.results, format)}
                                                >Group {group_data.id}</DropdownMenu.Item
                                            >
                                        {/each}
                                    </DropdownMenu.SubContent>
                                </DropdownMenu.Sub>
                            {:else}
                                <DropdownMenu.Item
                                    onclick={() =>
                                        clipboardCopy(extractedData.data[0]?.results, format)}
                                    >Copy {label}</DropdownMenu.Item
                                >
                            {/if}
                        {/snippet}

                        <DropdownMenu.Item onclick={() => clipboardCopy(extractedData.data, 'json')}
                            >Copy Grouped JSON</DropdownMenu.Item
                        >

                        {@render CopyOption('HTML Table', 'html')}
                        {@render CopyOption('Markdown Table', 'markdown')}
                        {@render CopyOption('JSON', 'json')}
                        {@render CopyOption('NDJSON', 'ndjson')}
                        {@render CopyOption('CSV', 'csv')}
                        {@render CopyOption('YAML', 'yaml')}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                {#if !openInNewTab}
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button size="sm" variant="secondary" onclick={showInNewTab}>
                                <ExternalLink
                                    strokeWidth={2.5}
                                    class="hover:text-gray-400 hover:bg-white/10"
                                />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>View Results in New Tab</Tooltip.Content>
                    </Tooltip.Root>

                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button
                                size="icon"
                                variant="destructive"
                                onclick={handleResetData}
                                class="bg-red-500 text-white font-bold hover:bg-red-600"
                            >
                                <SquareX class="size-4" strokeWidth={2.5} />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>Clear Data</Tooltip.Content>
                    </Tooltip.Root>
                {/if}
            </div>
        </Tabs.List>
        <Tabs.Content value="table" class="flex-1 min-h-0 overflow-auto p-1.5">
            <Accordion.Root type="multiple" bind:value={openGroups} class="space-y-3">
                {#each extractedData.data as groupData (groupData.id)}
                    <div class="border rounded-lg overflow-hidden">
                        <div
                            class="flex items-center justify-between px-2 py-1.5 bg-muted/40 cursor-pointer select-none hover:bg-muted/60 {openGroups.includes(
                                groupData.id,
                            )
                                ? 'border-b'
                                : ''}"
                            onclick={() => toggleGroup(groupData.id)}
                            role="button"
                            tabindex="0"
                            onkeydown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleGroup(groupData.id);
                                }
                            }}
                        >
                            <div class="flex items-center gap-1.5">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    class="size-6 p-0 hover:bg-white/10"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleGroup(groupData.id);
                                    }}
                                >
                                    {#if openGroups.includes(groupData.id)}
                                        <ChevronUp class="size-4 transition-transform" />
                                    {:else}
                                        <ChevronDown class="size-4 transition-transform" />
                                    {/if}
                                </Button>
                                <span class="text-xs font-medium">
                                    Group {groupData.id} ({groupData.results.length})
                                </span>
                            </div>
                        </div>
                        <Accordion.Item value={groupData.id} class="border-none">
                            <Accordion.Content class="p-1 pb-2">
                                <DataTable data={groupData.results} />
                            </Accordion.Content>
                        </Accordion.Item>
                    </div>
                {/each}
            </Accordion.Root>
        </Tabs.Content>
        <Tabs.Content value="json" class="flex-1 min-h-0 px-4 overflow-auto">
            <div class="p-4 rounded-md text-sm overflow-wrap">
                <JsonViewer value={extractedData.data} />
            </div>
        </Tabs.Content>
    </Tabs.Root>
</div>

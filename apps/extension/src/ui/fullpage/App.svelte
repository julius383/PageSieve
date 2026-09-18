<script lang="ts">
    import * as Tabs from '$lib/components/ui/tabs';
    import ResultsViewer from '@/ui/sidebar/components/ResultsViewer.svelte';
    import LogViewer from '@/ui/sidebar/components/LogViewer.svelte';
    import SnapshotTable from '@/ui/sidebar/components/SnapshotTable.svelte';
</script>

<main class="p-8 flex flex-col bg-background text-foreground">
    <Tabs.Root value="results" class="flex-1 min-h-screen flex flex-col">
        <Tabs.TabsList class="grid w-full grid-cols-3">
            <Tabs.Trigger value="results">Results</Tabs.Trigger>
            <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
            <Tabs.Trigger value="snapshots">Snapshots</Tabs.Trigger>
        </Tabs.TabsList>
        <Tabs.Content value="results" class="pt-4 flex-1 flex flex-col">
            <ResultsViewer openInNewTab={true} />
        </Tabs.Content>
        <Tabs.Content value="logs" class="pt-4 overflow-y-auto">
            <LogViewer openInNewTab={true} />
        </Tabs.Content>
        <Tabs.Content value="snapshots" class="pt-4 overflow-y-auto">
            <SnapshotTable />
        </Tabs.Content>
    </Tabs.Root>
</main>

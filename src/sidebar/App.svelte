<script lang="ts">
    import FieldGroup from './components/FieldGroup.svelte';
    import ActionBar from './components/ActionBar.svelte';
    import SavedLibrary from './components/SavedLibrary.svelte';
    import ResultsViewer from './components/ResultsViewer.svelte';
    import ConfigPanel from './components/ConfigPanel.svelte';

    import StatusIndicator from './components/StatusIndicator.svelte';
    import LogViewer from './components/LogViewer.svelte';

    import { Separator } from '$lib/components/ui/separator';
    import * as Accordion from '$lib/components/ui/accordion/index.js';

    import { scrapeConfig, addDefinition, removeDefinition } from './stores/scrapeConfig.svelte';

    import { Button } from '$lib/components/ui/button';
    import * as Tabs from '$lib/components/ui/tabs';
    import { Plus, ChevronDown, ChevronUp } from '@lucide/svelte';
    import * as Resizable from '$lib/components/ui/resizable/index.js';

    const { Root: TabsRoot, List: TabsList, Trigger: TabsTrigger, Content: TabsContent } = Tabs;

    let logViewerAccordionValue = $state<string | undefined>(undefined);
</script>

<main class="p-4 flex flex-col gap-4 bg-background text-foreground h-screen">
    <div class="flex items-center justify-between border-b bg-background py-1.5">
        <ActionBar />
        <Separator orientation="vertical" class="mx-2 h-4" />
        <StatusIndicator />
        <Button
            variant="ghost"
            size="icon"
            onclick={() =>
                (logViewerAccordionValue =
                    logViewerAccordionValue === 'log-viewer-item' ? undefined : 'log-viewer-item')}
        >
            {#if logViewerAccordionValue === 'log-viewer-item'}
                <ChevronUp class="size-4" strokeWidth={2} color="#fff" />
            {:else}
                <ChevronDown class="size-4" strokeWidth={2} color="#fff" />
            {/if}
        </Button>
    </div>

    <!-- Moved Accordion.Root -->
    <Accordion.Root type="single" bind:value={logViewerAccordionValue}>
        <Accordion.Item value="log-viewer-item">
            <Accordion.Content>
                <LogViewer />
                <Separator orientation="horizontal" class="mx-2 h-4" />
            </Accordion.Content>
        </Accordion.Item>
    </Accordion.Root>
    <TabsRoot value="selectorDefs" class="flex-1 min-h-0 flex flex-col">
        <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="selectorDefs">Selectors</TabsTrigger>
            <TabsTrigger value="properties">Config</TabsTrigger>
            <TabsTrigger value="saved-configs">Library</TabsTrigger>
        </TabsList>
        <TabsContent value="selectorDefs" class="pt-4 flex-1 flex flex-col">
            <Resizable.PaneGroup direction="vertical" class="flex-1 overflow-auto">
                <Resizable.Pane defaultSize={50} class="flex flex-col">
                    <div class="space-y-4 flex-1 overflow-y-auto">
                        {#each scrapeConfig.selectors as field (field.id)}
                            <FieldGroup
                                id={field.id}
                                deleteHandler={() => removeDefinition(field.id)}
                                bind:fieldName={field.name}
                                bind:cssSelector={field.selector}
                            />
                        {/each}
                    </div>
                    <Button onclick={addDefinition} class="mt-4 w-full">
                        <Plus /> Add Field
                    </Button>
                </Resizable.Pane>
                <Resizable.Handle withHandle />

                <Resizable.Pane defaultSize={50}>
                    <ResultsViewer />
                </Resizable.Pane>
            </Resizable.PaneGroup>
        </TabsContent>
        <TabsContent value="properties" class="pt-4 overflow-y-auto">
            <div class="space-y-4">
                <ConfigPanel />
            </div>
        </TabsContent>
        <TabsContent value="saved-configs" class="pt-4 overflow-y-auto">
            <SavedLibrary />
        </TabsContent>
    </TabsRoot>
</main>

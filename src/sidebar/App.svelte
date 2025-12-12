<script lang="ts">
    import FieldGroup from './components/FieldGroup.svelte';
    import PropertyGroup from './components/PropertyGroup.svelte';
    import ActionBar from './components/ActionBar.svelte';
    import ConfigStorage from './components/ConfigStorage.svelte';
    import ResultsViewer from './components/ResultsViewer.svelte';

    import StatusIndicator from './components/StatusIndicator.svelte';
    import LogViewer from './components/LogViewer.svelte';

    import { Separator } from '$lib/components/ui/separator';
    import * as Accordion from "$lib/components/ui/accordion/index.js";

    import {
        fields,
        addField,
        deleteField,
        properties,
        addProperty,
        deleteProperty,
    } from './state.svelte';

    import { Button } from '$lib/components/ui/button';
    import * as Tabs from '$lib/components/ui/tabs';
    import { Plus, ChevronDown, ChevronUp } from '@lucide/svelte';
    import * as Resizable from '$lib/components/ui/resizable/index.js';

    const { Root: TabsRoot, List: TabsList, Trigger: TabsTrigger, Content: TabsContent } = Tabs;

    let status = $state<'idle' | 'extracting' | 'error' | 'importing' | 'exporting' | 'saving'>(
        'idle',
    );
    let logViewerAccordionValue = $state<string | undefined>(undefined);
</script>

<main class="p-4 h-screen flex flex-col gap-4 bg-background text-foreground">
    <div class="flex items-center justify-between border-b bg-background py-1.5">
      <ActionBar />
      <Separator orientation="vertical" class="mx-2 h-4" />
      <StatusIndicator {status} />
      <Button
        variant="ghost"
        size="icon"
        onclick={() => logViewerAccordionValue = logViewerAccordionValue === 'log-viewer-item' ? undefined : 'log-viewer-item'}
      >
      {#if logViewerAccordionValue === 'log-viewer-item'}
        <ChevronUp class="size-4" strokeWidth={2} color=#fff/>
      {:else}
        <ChevronDown class="size-4" strokeWidth={2} color=#fff/>
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
    <TabsRoot value="fields" class="flex-1 min-h-0 flex flex-col">
        <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="saved-configs">Saved Configs</TabsTrigger>
        </TabsList>
        <TabsContent value="fields">
            <Resizable.PaneGroup direction="vertical" class="pt-4 flex-1 overflow-auto">
                <Resizable.Pane defaultSize={50} class="flex flex-col">
                    <div class="space-y-4 flex-1 overflow-y-auto">
                        {#each $fields as field (field.id)}
                            <FieldGroup
                                id={field.id}
                                deleteHandler={() => deleteField(field.id)}
                                bind:fieldName={field.name}
                                bind:cssSelector={field.selector}
                            />
                        {/each}
                    </div>
                    <Button onclick={addField} class="mt-4 w-full">
                        <Plus /> Add Field
                    </Button>
                </Resizable.Pane>
                <Resizable.Handle withHandle />

                <Resizable.Pane defaultSize={50}>
                    <ResultsViewer />
                </Resizable.Pane>
            </Resizable.PaneGroup>
        </TabsContent>
        <TabsContent value="properties" class="pt-4">
            <div class="space-y-4">
                {#each $properties as property (property.id)}
                    <PropertyGroup
                        id={property.id}
                        deleteHandler={() => deleteProperty(property.id)}
                        bind:key={property.key}
                        bind:value={property.value}
                    />
                {/each}
            </div>
            <Button onclick={addProperty} class="mt-4 w-full">
                <Plus /> Add Property
            </Button>
        </TabsContent>
        <TabsContent value="saved-configs" class="pt-4">
            <ConfigStorage />
        </TabsContent>
    </TabsRoot>
</main>
<script lang="ts">
    import FieldGroup from './components/FieldGroup.svelte';
    import PropertyGroup from './components/PropertyGroup.svelte';
    import ActionBar from './components/ActionBar.svelte';
    import ConfigStorage from './components/ConfigStorage.svelte';
    import ResultsViewer from './components/ResultsViewer.svelte';

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
    import { Plus } from '@lucide/svelte';
    import * as Resizable from '$lib/components/ui/resizable/index.js';

    const { Root: TabsRoot, List: TabsList, Trigger: TabsTrigger, Content: TabsContent } = Tabs;
</script>

<main class="p-4 h-screen flex flex-col gap-8">
    <ActionBar />
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

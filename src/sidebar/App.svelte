<script lang="ts">
    import { get } from "svelte/store";

    import FieldGroup from './FieldGroup.svelte';
    import PropertyGroup from './PropertyGroup.svelte';
    import ActionBar from './ActionBar.svelte';
    import ConfigStorage from './ConfigStorage.svelte';

    import { saveConfig, formatColumnName } from './util';

    import {
        fields,
        addField,
        deleteField,

        properties,
        addProperty,
        deleteProperty,

        extractedData,
        extractedJSON,
        columns,

        downloadCSV,
        downloadJSON
    } from './state.svelte';

    import { Button } from '$lib/components/ui/button';
    import * as Tabs from '$lib/components/ui/tabs';
    import * as Table from '$lib/components/ui/table';
    import { Plus } from '@lucide/svelte';
    import * as Resizable from '$lib/components/ui/resizable/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Download } from '@lucide/svelte';

    const { Root: TabsRoot, List: TabsList, Trigger: TabsTrigger, Content: TabsContent } = Tabs;
    const {
        Root: TableRoot,
        Header: TableHeader,
        Row: TableRow,
        Head: TableHead,
        Body: TableBody,
        Cell: TableCell,
    } = Table;
    const {
        Root: DropdownMenuRoot,
        Trigger: DropdownMenuTrigger,
        Content: DropdownMenuContent,
        Item: DropdownMenuItem,
        Separator: DropdownMenuSeparator,
    } = DropdownMenu;
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
                    <div class="space-y-4">
                        <hr />
                        <h2 class="text-2xl font-bold">Results</h2>
                    </div>
                    <TabsRoot value="data" class="h-full flex flex-col">
                        <TabsList class="flex justify-between items-center w-full">
                            <div class="flex">
                                <TabsTrigger value="data">Data</TabsTrigger>
                                <TabsTrigger value="json">JSON</TabsTrigger>
                            </div>
                            <DropdownMenuRoot>
                                <DropdownMenuTrigger>
                                    <Button variant="secondary" size="sm">
                                        <Download /> Download
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onclick={downloadCSV}
                                        >Download CSV</DropdownMenuItem
                                    >
                                    <DropdownMenuItem onclick={downloadJSON}
                                        >Download JSON</DropdownMenuItem
                                    >
                                </DropdownMenuContent>
                            </DropdownMenuRoot>
                        </TabsList>
                        <TabsContent value="data" class="pt-4 overflow-auto flex-grow">
                            <div class="border rounded-md">
                                <TableRoot>
                                    <TableHeader>
                                        <TableRow>
                                            {#each $columns as column}
                                                <TableHead>{formatColumnName(column)}</TableHead>
                                            {/each}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {#each $extractedData as row}
                                            <TableRow>
                                                {#each $columns as column}
                                                    <TableCell>{row[column]}</TableCell>
                                                {/each}
                                            </TableRow>
                                        {/each}
                                    </TableBody>
                                </TableRoot>
                            </div>
                        </TabsContent>
                        <TabsContent value="json" class="pt-4 overflow-auto flex-grow">
                            <div class="bg-slate-100 p-4 rounded-md text-sm">
                                <pre><code>{$extractedJSON}</code></pre>
                            </div>
                        </TabsContent>
                    </TabsRoot>
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

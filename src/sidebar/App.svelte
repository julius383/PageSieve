<script lang="ts">
    import { Parser } from '@json2csv/plainjs';

    import FieldGroup from './FieldGroup.svelte';
    import PropertyGroup from './PropertyGroup.svelte';
    import ActionBar from './ActionBar.svelte';

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

    // State for Fields
    let fields = $state([{ id: 1, name: '', selector: '' }]);
    let nextId = 2;

    function addField() {
        fields.push({ id: nextId++, name: '', selector: '' });
    }

    function deleteField(id: number) {
        fields = fields.filter((field) => field.id !== id);
    }

    let currentURL = $state('');
    browser.runtime.sendMessage({ action: 'getTabUrl' }).then((response) => {
        currentURL = response.url;
        console.log(`Current URL is ${response.url}`);
    });

    let properties = $derived([{ id: 1, key: 'URL', value: currentURL }]);
    let nextPropId = 2;

    function addProperty() {
        properties.push({ id: nextPropId++, key: '', value: '' });
    }

    function deleteProperty(id: number) {
        properties = properties.filter((prop) => prop.id !== id);
    }

    // Sample data for results
    let sampleData = $state([
        { id: 'a', name: 'Load Balancer 1', protocol: 'HTTP', port: 3000, rule: 'Round robin' },
        { id: 'b', name: 'Load Balancer 2', protocol: 'HTTP', port: 443, rule: 'Round robin' },
        { id: 'c', name: 'Load Balancer 3', protocol: 'HTTP', port: 80, rule: 'DNS delegation' },
    ]);
    let sampleJson = $derived(JSON.stringify(sampleData, null, 2));
    // Automatically get columns from first object, excluding 'id'
    let columns = $derived(
        sampleData.length > 0 ? Object.keys(sampleData[0]).filter((key) => key !== 'id') : [],
    );

    // Helper function to capitalize column names
    function formatColumnName(name: string): string {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    function handleExtract() {
        const selectors = fields.filter((f) => f.name && f.selector);

        if (selectors.length === 0) {
            console.warn('No selectors to extract');
            console.dir(fields);
            return 'Error';
        }

        browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs: browser.tabs.Tab[]) => {
                if (tabs[0]?.id) {
                    browser.tabs
                        .sendMessage(tabs[0].id, {
                            action: 'extractData',
                            selectors: JSON.parse(JSON.stringify(selectors)),
                        })
                        .then((response) => {
                            if (response && response.result) {
                                sampleData = response.result;
                                return 'Idle';
                            } else {
                                console.log('Error, failed to extract selectors');
                                return 'Error';
                            }
                        });
                }
            });
    }

    function handleLoadConfig(event: Event) {
        const fileInput = event.target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) return;
        let configData;
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                configData = JSON.parse(reader.result as string);

                console.dir(configData);
                if (configData != undefined) {
                    properties = configData['propsConf'];
                    fields = configData['fieldConf'];
                }
            }
        }
        reader.readAsText(file);
        console.log('Loaded config file:', file.name);
        fileInput.value = ''; // Reset for next use
    }
    function downloadJSON() {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sampleData));
        let downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", "data.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function downloadCSV() {
        try {
            const parser = new Parser();
            const csv = parser.parse(sampleData);

            let dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
            let downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", "data.csv");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            console.log(csv);
        } catch (err) {
            console.error(err);
        }

    }

    function handleSaveConfig() {
        console.log('Downloading config...');
        let config = {
            fieldConf: $state.snapshot(fields),
            propsConf: $state.snapshot(properties),
        }
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
        let downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", "config.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

    }
</script>

<main class="p-4 space-y-8 h-screen">
    <ActionBar {handleExtract} {handleSaveConfig} {handleLoadConfig} />
    <Resizable.PaneGroup direction="vertical" class="h-full">
        <Resizable.Pane defaultSize={50}>
            <TabsRoot value="fields" class="h-full">
                <TabsList class="grid w-full grid-cols-2">
                    <TabsTrigger value="fields">Fields</TabsTrigger>
                    <TabsTrigger value="properties">Properties</TabsTrigger>
                </TabsList>
                <TabsContent value="fields" class="pt-4 overflow-auto">
                    <div class="space-y-4">
                        {#each fields as field (field.id)}
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
                </TabsContent>
                <TabsContent value="properties" class="pt-4">
                    <div class="space-y-4">
                        {#each properties as property (property.id)}
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
            </TabsRoot>
        </Resizable.Pane>
        <Resizable.Handle withHandle />
        <Resizable.Pane defaultSize={50}>
            <div class="space-y-4 h-full">
                <hr />
                <h2 class="text-2xl font-bold">Results</h2>
                <TabsRoot value="data">
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
                                <DropdownMenuItem>Download CSV</DropdownMenuItem>
                                <DropdownMenuItem onclick={downloadJSON}>Download JSON</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenuRoot>
                    </TabsList>
                    <TabsContent value="data" class="pt-4">
                        <div class="border rounded-md">
                            <TableRoot>
                                <TableHeader>
                                    <TableRow>
                                        {#each columns as column}
                                            <TableHead>{formatColumnName(column)}</TableHead>
                                        {/each}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {#each sampleData as row}
                                        <TableRow>
                                            {#each columns as column}
                                                <TableCell>{row[column]}</TableCell>
                                            {/each}
                                        </TableRow>
                                    {/each}
                                </TableBody>
                            </TableRoot>
                        </div>
                    </TabsContent>
                    <TabsContent value="json" class="pt-4">
                        <div class="bg-slate-100 p-4 rounded-md text-sm">
                            <pre><code>{sampleJson}</code></pre>
                        </div>
                    </TabsContent>
                </TabsRoot>
            </div>
        </Resizable.Pane>
    </Resizable.PaneGroup>
</main>

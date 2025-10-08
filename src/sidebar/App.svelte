<script lang="ts">
  import FieldGroup from "./FieldGroup.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Table from "$lib/components/ui/table";
  import { Plus } from "@lucide/svelte";
  import * as Resizable from "$lib/components/ui/resizable/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Download } from "@lucide/svelte";

  const { Root: TabsRoot, List: TabsList, Trigger: TabsTrigger, Content: TabsContent } = Tabs;
  const { Root: TableRoot, Header: TableHeader, Row: TableRow, Head: TableHead, Body: TableBody, Cell: TableCell } = Table;
  const { Root: DropdownMenuRoot, Trigger: DropdownMenuTrigger, Content: DropdownMenuContent, Item: DropdownMenuItem, Separator: DropdownMenuSeparator } = DropdownMenu;

  // State for Fields
  let fields = $state([
    { id: 1, name: "", selector: "" }
  ]);
  let nextId = 2;

  function addField() {
    fields.push({ id: nextId++, name: "", selector: "" });
  }

  function deleteField(id: number) {
    fields = fields.filter(field => field.id !== id);
  }

  // Sample data for results
  const sampleData = [
    { id: 'a', name: 'Load Balancer 1', protocol: 'HTTP', port: 3000, rule: 'Round robin' },
    { id: 'b', name: 'Load Balancer 2', protocol: 'HTTP', port: 443, rule: 'Round robin' },
    { id: 'c', name: 'Load Balancer 3', protocol: 'HTTP', port: 80, rule: 'DNS delegation' },
  ];
  const sampleJson = JSON.stringify(sampleData, null, 2);

  function downloadData() {
    const csvContent = "data:text/csv;charset=utf-8," + sampleData.map(e => Object.values(e).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadJson() {
    const jsonContent = "data:application/json;charset=utf-8," + encodeURIComponent(sampleJson);
    const link = document.createElement("a");
    link.setAttribute("href", jsonContent);
    link.setAttribute("download", "data.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

</script>

<main class="p-4 space-y-8">
  <Resizable.PaneGroup
    direction="vertical"
    class="min-h-screen"
    >

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
                bind:fieldName={field.name}
                bind:cssSelector={field.selector}
                on:delete={() => deleteField(field.id)}
              />
            {/each}
          </div>
          <Button onclick={addField} class="mt-4 w-full">
            <Plus class="mr-2 h-4 w-4" /> Add Field
          </Button>
        </TabsContent>
        <TabsContent value="properties" class="pt-4">
          <p>Properties content goes here.</p>
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
                <Button variant="secondary" size="sm" class="bg-green-500 text-white hover:bg-green-600">
                  <Download class="mr-2 h-4 w-4" /> Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onclick={downloadData}>Download CSV</DropdownMenuItem>
                <DropdownMenuItem onclick={downloadJson}>Download JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuRoot>
          </TabsList>
          <TabsContent value="data" class="pt-4">
            <div class="border rounded-md">
              <TableRoot>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Rule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {#each sampleData as row}
                    <TableRow>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.protocol}</TableCell>
                      <TableCell>{row.port}</TableCell>
                      <TableCell>{row.rule}</TableCell>
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

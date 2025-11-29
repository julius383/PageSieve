<script lang="ts">
  import {
    resetFields,
    handleImportConfig,
    handleExportConfig,
    handleSaveConfig,
    handleExtract,
  } from "./state.svelte";

  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { Upload, Download, Play, Save, ListRestart } from "@lucide/svelte";

  let status = $state<
    "Idle" | "Extracting" | "Error" | "Importing" | "Exporting" | "Saving"
  >("Idle");

  let statusColor = $derived(
    {
      Idle: "bg-green-500",
      Extracting: "bg-yellow-500 animate-pulse",
      Error: "bg-red-500",
      Importing: "bg-indigo-500 animate-pulse",
      Exporting: "bg-aqua-500 animate-pulse",
      Saving: "bg-aqua-500 animate-pulse",
    }[status],
  );

  async function extract() {
    status = "Extracting";
    status = await handleExtract();
    console.log(`Set status to ${$state.snapshot(status)}`);
  }

  function import_(event: Event) {
    status = "Importing";
    handleImportConfig(event);
    status = "Idle";
  }

  function save(event: Event) {
    handleSaveConfig();
  }

  function export_() {
    status = "Exporting";
    handleExportConfig();
    status = "Idle";
  }
  function triggerLoad() {
    let fileinput = document.getElementById("import-config");
    fileinput?.click();
  }
</script>

<div
  class="flex items-center justify-between border-b bg-background px-2 py-1.5"
>
  <div class="flex items-center gap-2">
    <div class="size-2 rounded-full {statusColor}"></div>
    <span class="text-sm text-muted-foreground">{status}</span>
  </div>
  <Separator orientation="vertical" class="mx-2 h-4" />

  <!-- Right side: Config actions -->
  <div class="flex items-center gap-2">
    <Button
      size="icon"
      onclick={extract}
      class="bg-green-500 text-white font-bold hover:bg-green-600"
    >
      <Play class="size-4 mr-1" strokeWidth={2.5} />
    </Button>

    <Button size="icon" variant="ghost" onclick={handleSaveConfig}>
      <Save class="size-4" strokeWidth={2.5} />
    </Button>

    <div class="cursor-pointer">
      <input
        id="import-config"
        type="file"
        accept=".json"
        hidden
        onchange={import_}
      />
      <Button size="icon" variant="ghost" onclick={triggerLoad}>
        <Upload class="size-4" strokeWidth={2.5} />
      </Button>
    </div>

    <Button size="icon" variant="ghost" onclick={export_}>
      <Download class="size-4" strokeWidth={2.5} />
    </Button>

    <Button size="icon" variant="ghost" onclick={resetFields}>
      <ListRestart class="size-4" strokeWidth={2.5} />
    </Button>
  </div>
</div>

<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { Upload, Download, Play } from "@lucide/svelte";

  let status = $state<"Idle" | "Extracting" | "Error">("Idle");

  let statusColor = $derived({
    "Idle": "bg-green-500",
    "Extracting": "bg-yellow-500 animate-pulse",
    "Error": "bg-red-500"
  }[status]);


  let props = $props();

  function extract() {
    status = props.handleExtract();
  }

  function load(event: Event) {
    props.handleLoadConfig(event);
  }

  function save() {
    props.handleSaveConfig();
  }
</script>

<div class="flex items-center justify-between border-b bg-background px-2 py-1.5">
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
      <Play class="size-4 mr-1" strokeWidth={2.5}/>
    </Button>

    <label class="cursor-pointer">
      <input type="file" accept=".json" hidden onchange={load} />
      <Button size="icon" variant="ghost" asChild>
        <Upload class="size-4"  strokeWidth={2.5}/>
      </Button>
    </label>

    <Button size="icon" variant="ghost" onclick={save}>
      <Download class="size-4"  strokeWidth={2.5}/>
    </Button>
  </div>
</div>
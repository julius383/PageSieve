<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Toggle } from "$lib/components/ui/toggle";
  import { ButtonGroup } from "$lib/components/ui/button-group";
  import { Trash2, Pipette } from "@lucide/svelte";

  let { fieldName, cssSelector } = $props();

  const dispatch = createEventDispatcher();

  function handleDelete() {
    dispatch("delete");
  }

  function handleInspect() {
    // This will require communication with a content script.
    // For now, just a placeholder.
    // dispatch("inspect");
  }
</script>

<div class="border p-4 rounded-md mb-4">
  <div class="flex items-end gap-2 mb-2">
    <div class="grid w-full items-center gap-1.5">
      <label for="field-name" class="text-sm font-medium leading-none">Field Name</label>
      <Input id="field-name" bind:value={fieldName} placeholder="e.g., productName" />
    </div>
    <ButtonGroup.Root>
      <Toggle onclick={handleInspect} variant="outline" size="icon">
        <Pipette class="h-4 w-4" />
      </Toggle>
      <Button onclick={handleDelete} variant="destructive" size="icon">
        <Trash2 class="h-4 w-4" />
      </Button>
    </ButtonGroup.Root>
  </div>
  <div class="grid w-full items-center gap-1.5">
    <label for="css-selector" class="text-sm font-medium leading-none">CSS Selector</label>
    <Input id="css-selector" bind:value={cssSelector} placeholder="e.g., h1.title" />
  </div>
</div>

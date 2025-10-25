<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { Trash2, Pipette } from "@lucide/svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  let { id, deleteHandler, key = $bindable(), value = $bindable() } = $props();


</script>

<div class="border p-4 rounded-md mb-4">
  <div class="flex items-end gap-2 mb-2">
    <div class="grid w-full items-center gap-1.5">
      <label for="property-name-{id}" class="text-sm font-medium leading-none">Key</label>
      <Input id="property-name-{id}" bind:value={key} placeholder="e.g. Bindable" />
    </div>

    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button onclick={deleteHandler} variant="destructive" size="icon">
            <Trash2 />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>Delete Property</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>

  </div>
  <div class="grid w-full items-center gap-1.5">
    <label for="property-item" class="text-sm font-medium leading-none">Key</label>
    <Input id="property-item" bind:value={value} placeholder="e.g. some value" />
  </div>
</div>

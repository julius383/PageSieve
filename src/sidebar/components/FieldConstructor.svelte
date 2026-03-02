<script lang="ts">
    import FieldGroup from './FieldGroup.svelte';
    import ElementPicker from './ElementPicker.svelte';
    import { Button } from '$lib/components/ui/button';
    import { Plus } from '@lucide/svelte';

    import { addDefinition, removeDefinition, getActiveGroup } from '../stores/scrapeConfig.svelte';

    // let group = scrapeConfig.selectors[0];
    let group = $derived(getActiveGroup());
</script>

{#if group !== undefined}
    <div class="border p-2.5 rounded-md mb-4 overflow-y-auto flex-1">
        <div class="bg-secondary space-y-4 mb-6">
            <ElementPicker
                label="Container Selector"
                header_style="font-bold text-md leading-none"
                bind:cssSelector={group.container}
            />
        </div>
        <div class="pl-2 space-y-4 flex-1 overflow-y-auto">
            {#each group.fields as field (field.id)}
                <FieldGroup
                    id={field.id}
                    deleteHandler={() => removeDefinition(field.id)}
                    bind:fieldName={field.name}
                    bind:cssSelector={field.selector}
                    bind:type={field.type}
                />
            {/each}
        </div>
        <Button onclick={addDefinition} class="mt-4 w-full">
            <Plus /> Add Field
        </Button>
    </div>
{:else}
    <div>
        <span>Error with Field Group</span>
    </div>
{/if}

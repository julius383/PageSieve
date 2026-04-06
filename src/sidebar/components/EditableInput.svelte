<script lang="ts">
    import { Check, X } from '@lucide/svelte';
    import Button from '$lib/components/ui/button/button.svelte';
    import * as ButtonGroup from "$lib/components/ui/button-group/index.js";

    let {
        editing = false,
        editValue = $bindable(),
        displayValue,
        onSave,
        onCancel,
        iconSize = 'icon',
    }: {
        editing: boolean;
        editValue: string;
        displayValue: string;
        onSave: () => void;
        onCancel: () => void;
        iconSize?: 'icon' | 'icon-sm' | 'icon-lg';
    } = $props();

    async function handleInputKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            await onSave();
        } else if (event.key === 'Escape') {
            onCancel();
        }
    }
</script>

{#if editing}
    <div class="flex items-center gap-x-2 w-full">
        <input
            type="text"
            bind:value={editValue}
            onkeydown={handleInputKeydown}
            class="bg-transparent border-b border-current w-full focus:outline-none"
        />
        <div class="flex items-end gap-x-1 flex-start">
            <ButtonGroup.Root>
                <Button onclick={onSave} variant="outline" size={iconSize}>
                    <Check size={iconSize} />
                </Button>
                <Button onclick={onCancel} variant="destructive" size={iconSize}>
                    <X size={iconSize} />
                </Button>
            </ButtonGroup.Root>
        </div>
    </div>
{:else}
    <span>
        {displayValue}
    </span>
{/if}

<script lang="ts">
    import { Check, X } from '@lucide/svelte';
    import Button from '$lib/components/ui/button/button.svelte';

    let {
        editing = false,
        displayValue = '',
        editValue = $bindable(),
        onSave,
        onCancel,
    }: {
        editing: boolean;
        displayValue: string;
        editValue: string;
        onSave: () => void;
        onCancel: () => void;
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
            <Button onclick={onSave} variant="outline" size="icon">
                <Check />
            </Button>
            <Button onclick={onCancel} variant="destructive" size="icon">
                <X />
            </Button>
        </div>
    </div>
{:else}
    {displayValue}
{/if}

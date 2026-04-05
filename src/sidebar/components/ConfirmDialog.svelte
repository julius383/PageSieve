<script lang="ts">
    import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
    import type { Snippet } from 'svelte';

    let {
        open = $bindable(false),
        title = 'Are you sure?',
        description,
        confirmLabel = 'Delete',
        cancelLabel = 'Cancel',
        onConfirm,
        onCancel,
    }: {
        open: boolean;
        title?: string | Snippet;
        description?: string | Snippet;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: () => void;
        onCancel?: () => void;
    } = $props();

    function handleConfirm() {
        onConfirm();
        open = false;
    }

    function handleCancel() {
        if (onCancel) onCancel();
        open = false;
    }
</script>

<AlertDialog.Root bind:open>
    <AlertDialog.Content class="w-[calc(100% - 4rem)] bg-background text-foreground ">
        <AlertDialog.Header>
            <AlertDialog.Title>
                {#if typeof title === 'string'}
                    {title}
                {:else if title}
                    {@render title()}
                {/if}
            </AlertDialog.Title>
            <div class="text-sm text-muted-foreground text-wrap">
                {#if typeof description === 'string'}
                    {description}
                {:else if description}
                    {@render description()}
                {/if}
            </div>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel onclick={handleCancel}>{cancelLabel}</AlertDialog.Cancel>
            <AlertDialog.Action onclick={handleConfirm}>{confirmLabel}</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

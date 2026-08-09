<script lang="ts">
    import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
    import { buttonVariants } from '$lib/components/ui/button/index.js';
    import {
        confirmState,
        handleConfirm,
        handleCancel,
    } from '@/ui/sidebar/services/confirm.svelte';

    function onOpenChange(val: boolean) {
        if (!val) {
            handleCancel();
        }
    }
</script>

<AlertDialog.Root open={confirmState.open} {onOpenChange}>
    <AlertDialog.Content class="w-[calc(100% - 4rem)] bg-background text-foreground">
        <AlertDialog.Header>
            <AlertDialog.Title>
                {#if typeof confirmState.title === 'string'}
                    {confirmState.title}
                {:else if confirmState.title}
                    {@render confirmState.title()}
                {/if}
            </AlertDialog.Title>
            <div class="text-sm text-muted-foreground text-wrap">
                {#if typeof confirmState.description === 'string'}
                    {confirmState.description}
                {:else if confirmState.description}
                    {@render confirmState.description()}
                {/if}
            </div>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel onclick={handleCancel}>{confirmState.cancelLabel}</AlertDialog.Cancel>
            <AlertDialog.Action
                class={buttonVariants({ variant: confirmState.variant })}
                onclick={handleConfirm}>{confirmState.confirmLabel}</AlertDialog.Action
            >
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

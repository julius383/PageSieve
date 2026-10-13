<script lang="ts">
    import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import {
        conflictState,
        handleRename,
        handleReplace,
        handleCancel,
    } from '@/ui/sidebar/services/conflict.svelte';

    function onOpenChange(val: boolean) {
        if (!val) {
            handleCancel();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            const trimmed = conflictState.newKey.trim();
            if (trimmed && trimmed !== conflictState.key) {
                e.preventDefault();
                handleRename();
            }
        }
    }
</script>

<AlertDialog.Root open={conflictState.open} {onOpenChange}>
    <AlertDialog.Content class="w-[calc(100% - 4rem)] bg-background text-foreground">
        <AlertDialog.Header>
            <AlertDialog.Title>
                {#if typeof conflictState.title === 'string'}
                    {conflictState.title}
                {:else if conflictState.title}
                    {@render conflictState.title()}
                {/if}
            </AlertDialog.Title>
            <div class="text-sm text-muted-foreground text-wrap">
                {#if typeof conflictState.description === 'string'}
                    {conflictState.description}
                {:else if conflictState.description}
                    {@render conflictState.description()}
                {/if}
            </div>
        </AlertDialog.Header>

        <div class="py-2">
            <Input
                bind:value={conflictState.newKey}
                onkeydown={handleKeydown}
                placeholder="Enter config name"
                class="text-sm"
                autofocus
            />
        </div>

        <AlertDialog.Footer class="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onclick={handleCancel}>
                {conflictState.cancelLabel}
            </Button>
            <Button variant="destructive" onclick={handleReplace}>
                {conflictState.replaceLabel}
            </Button>
            <Button
                variant="default"
                disabled={!conflictState.newKey.trim() ||
                    conflictState.newKey.trim() === conflictState.key}
                onclick={handleRename}
            >
                {conflictState.renameLabel}
            </Button>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>

import type { Snippet } from 'svelte';

export type ConflictResolution =
    { action: 'rename'; name: string } | { action: 'replace' } | { action: 'cancel' };

export interface ConflictOptions {
    title?: string | Snippet;
    description?: string | Snippet;
    key: string;
    renameLabel?: string;
    replaceLabel?: string;
    cancelLabel?: string;
}

interface ConflictDialogState extends ConflictOptions {
    open: boolean;
    newKey: string;
    resolve?: (value: ConflictResolution) => void;
}

export const conflictState = $state<ConflictDialogState>({
    open: false,
    title: 'Name Conflict',
    key: '',
    newKey: '',
    renameLabel: 'Rename',
    replaceLabel: 'Replace',
    cancelLabel: 'Cancel',
});

export function promptConflict(options: ConflictOptions): Promise<ConflictResolution> {
    return new Promise((resolve) => {
        conflictState.title = options.title ?? 'Name Conflict';
        conflictState.description =
            options.description ?? `A config with the name "${options.key}" already exists.`;
        conflictState.key = options.key;
        conflictState.newKey = options.key;
        conflictState.renameLabel = options.renameLabel ?? 'Rename';
        conflictState.replaceLabel = options.replaceLabel ?? 'Replace';
        conflictState.cancelLabel = options.cancelLabel ?? 'Cancel';
        conflictState.open = true;
        conflictState.resolve = resolve;
    });
}

export function handleRename() {
    conflictState.open = false;
    const res = conflictState.resolve;
    const name = conflictState.newKey.trim();
    conflictState.resolve = undefined;
    if (res) res({ action: 'rename', name });
}

export function handleReplace() {
    conflictState.open = false;
    const res = conflictState.resolve;
    conflictState.resolve = undefined;
    if (res) res({ action: 'replace' });
}

export function handleCancel() {
    conflictState.open = false;
    const res = conflictState.resolve;
    conflictState.resolve = undefined;
    if (res) res({ action: 'cancel' });
}

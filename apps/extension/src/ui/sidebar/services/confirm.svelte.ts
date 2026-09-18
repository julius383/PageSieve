import type { Snippet } from 'svelte';
import type { ButtonVariant } from '$lib/components/ui/button/index.js';

export interface ConfirmOptions {
    title?: string | Snippet;
    description?: string | Snippet;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ButtonVariant['variant'];
}

interface DialogState extends ConfirmOptions {
    open: boolean;
    resolve?: (value: boolean) => void;
}

export const confirmState = $state<DialogState>({
    open: false,
    title: 'Are you sure?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'default',
});

export function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        confirmState.title = options.title ?? 'Are you sure?';
        confirmState.description = options.description;
        confirmState.confirmLabel = options.confirmLabel ?? 'Confirm';
        confirmState.cancelLabel = options.cancelLabel ?? 'Cancel';
        confirmState.variant = options.variant ?? 'default';
        confirmState.open = true;
        confirmState.resolve = resolve;
    });
}

export function handleConfirm() {
    confirmState.open = false;
    const res = confirmState.resolve;
    confirmState.resolve = undefined;
    if (res) res(true);
}

export function handleCancel() {
    confirmState.open = false;
    const res = confirmState.resolve;
    confirmState.resolve = undefined;
    if (res) res(false);
}

import { SvelteDate } from 'svelte/reactivity';
import type {
    ExtensionStatus,
    StatusLevel,
    ScrapeStatusUpdateRequest,
    ExtractedGroup,
} from '@/core/types';

import type { StoredConfig } from '@/core/schema';
import { getAllConfigs } from '@/extension/ui/sidebar/services/storage';

export const extractedData = $state<{ data: ExtractedGroup[] }>({
    data: [{ id: 1, results: [] }],
});

export const extensionStatus = $state<ExtensionStatus>({
    status: 'idle',
    message: 'ready',
    timestamp: new SvelteDate().toISOString(),
});

export function runWithStatus<T>(status: ExtensionStatus, fn: () => T) {
    const prev = $state.snapshot(extensionStatus);
    setStatus(status.status, status.message);
    try {
        fn();
    } catch (error) {
        if (error instanceof Error) {
            setStatus('errored', error.message);
        }
    } finally {
        // restore only if no error replaced it
        if (extensionStatus.status !== 'errored') {
            setTimeout(() => {
                Object.assign(extensionStatus, prev);
            }, 1000);
        }
    }
}

export async function runWithStatusAsync<T>(status: ExtensionStatus, fn: () => Promise<T>) {
    const prev = $state.snapshot(extensionStatus);
    setStatus(status.status, status.message);
    try {
        return await fn();
    } catch (error) {
        if (error instanceof Error) {
            setStatus('errored', error.message);
        }
    } finally {
        // restore only if no error replaced it
        if (extensionStatus.status !== 'errored') {
            setTimeout(() => {
                setStatus(prev.status, prev.message);
            }, 1000);
        }
    }
}

export function setStatus(status: StatusLevel, message?: string) {
    Object.assign(extensionStatus, {
        status,
        message: message ? message : status,
        timestamp: new SvelteDate().toISOString(),
    });
}

export function getStatus(): StatusLevel {
    return extensionStatus.status;
}

export function resetExtractedData() {
    extractedData.data = [{ id: 1, results: [] }];
}

// Listener for messages from background script to status
browser.runtime.onMessage.addListener((request: ScrapeStatusUpdateRequest) => {
    if (request.action === 'updateScrapeStatus') {
        if (request.results.length > 0) {
            extractedData.data = [...request.results];
        }
        if (request.message) {
            setStatus(request.status, request.message);
        } else {
            setStatus(request.status);
        }
    }
});

// Library of saved configs
export const allConfigs = $state<{ configs: StoredConfig[] }>({ configs: [] });
export async function refreshConfigs() {
    const configs = await getAllConfigs();
    allConfigs.configs = configs;
}

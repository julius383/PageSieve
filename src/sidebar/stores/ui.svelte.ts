import { SvelteDate } from 'svelte/reactivity';
import type { ScrapeInstance, ExtensionStatus, StoredConfig } from '../../types';
import { getAllConfigs } from '../services/storage';

export const scrapeRuns = $state<{ runs: ScrapeInstance[] }>({ runs: [] });

export const extractedData = $state<{ data: { id: number; results: any[] }[] }>({
    data: [{ id: 1, results: [] }],
});

export const extensionStatus = $state<ExtensionStatus>({
    status: 'idle',
    message: 'ready',
    timestamp: new SvelteDate().toISOString(),
});

export function runWithStatus<T>(status: ExtensionStatus, fn: () => T) {
    const prev = $state.snapshot(extensionStatus);
    Object.assign(extensionStatus, status);
    try {
        fn();
    } catch (error) {
        Object.assign(extensionStatus, {
            status: 'errored',
            message: error?.message,
            timestamp: new SvelteDate().toISOString(),
        });
        // FIXME: log error instead of throwing
        throw error;
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
    Object.assign(extensionStatus, status);
    try {
        return await fn();
    } catch (error) {
        Object.assign(extensionStatus, {
            status: 'errored',
            message: error.message,
            timestamp: new SvelteDate().toISOString(),
        });
        // FIXME: log error instead of throwing
        throw error;
    } finally {
        // restore only if no error replaced it
        if (extensionStatus.status !== 'errored') {
            setTimeout(() => {
                Object.assign(extensionStatus, prev);
            }, 1000);
        }
    }
}

export function setStatus(status: string, message: string) {
    Object.assign(extensionStatus, {
        status,
        message,
        timestamp: new SvelteDate().toISOString(),
    });
}

export function resetExtractedData() {
    extractedData.data = [{ id: 1, results: [] }];
}

// Library of saved configs
export const allConfigs = $state<{ configs: StoredConfig[] }>({ configs: [] });
export async function refreshConfigs() {
    const configs = await getAllConfigs();
    allConfigs.configs = configs;
}

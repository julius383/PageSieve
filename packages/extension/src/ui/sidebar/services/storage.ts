import * as z from 'zod';
import { SvelteDate } from 'svelte/reactivity';
import { ExtractedGroup } from '@pagesieve/core/types';
import { ScrapeConfig } from '@pagesieve/core/schema';
import localforage from 'localforage';
import { setStatus } from '@/ui/sidebar/stores/ui.svelte';
import { LogEntry } from '@/ui/sidebar/stores/logs';

const CONFIG_STORAGE_KEY = 'pagesieve-configs';
const RESULTS_STORAGE_KEY = 'pagesieve-results';
const LOGS_STORAGE_KEY = 'pagesieve-logs';

localforage.config({
    name: CONFIG_STORAGE_KEY,
    driver: localforage.LOCALSTORAGE,
});

const resultsStore = localforage.createInstance({
    name: RESULTS_STORAGE_KEY,
    driver: localforage.LOCALSTORAGE,
});

export type Snapshot = {
    id: string;
    timestamp: string;
    results: ExtractedGroup[];
}


export async function getLatestResults(): Promise<Snapshot | null> {
    const results = await resultsStore.getItem('latest');
    return results !== null ? (results as Snapshot) : null;
}

// TODO: add code to cleanup excess items
export async function saveSnapshot(key: string, results: ExtractedGroup[]): Promise<void> {
    if (results.length > 0) {
        const snapshot = {
            id: key,
            timestamp: new SvelteDate().toISOString(),
            results,
        }
        await resultsStore.setItem(key, snapshot);
    }
}

export async function saveResults(results: ExtractedGroup[]): Promise<void> {
    return await saveSnapshot('latest', results);
}

export async function getSnapshot(key: string): Promise<Snapshot | null> {
    const results = await resultsStore.getItem(key);
    return results !== null ? results as Snapshot : null;
}

export async function removeSnapshot(key: string): Promise<boolean> {
    const existing = await resultsStore.getItem(key);
    if (existing) {
        await resultsStore.removeItem(key);
        return true;
    }
    return false;
}

export async function cleanupSnapshots(): Promise<boolean> {
    const snapshots = (await resultsStore.keys()).filter((x: string) => x === 'latest');
    const removed: boolean[] = []
    for (const key of snapshots) {
        removed.push(await removeSnapshot(key));
    }
    return removed.reduce((x, y) => x && y, true);
}

export async function getAllSnapshots(): Promise<Snapshot[]> {
    const snapshots: Snapshot[] = [];
    await resultsStore.iterate((value) => {
        snapshots.push(value as Snapshot);
    });
    return snapshots;
}

const logsStore = localforage.createInstance({
    name: LOGS_STORAGE_KEY,
    driver: localforage.LOCALSTORAGE,
});

export async function saveLogs(logs: LogEntry[]): Promise<void> {
    await logsStore.setItem('latest', logs);
}

export async function getLatestLogs(): Promise<LogEntry[] | null> {
    const results = await logsStore.getItem('latest');
    if (Array.isArray(results)) {
        results.forEach((element) => {
            element['timestamp'] = new Date(element['timestamp']);
        });
        return results as LogEntry[];
    }
    return null;
}

export async function getAllConfigs(): Promise<ScrapeConfig[]> {
    const configs: ScrapeConfig[] = [];
    await localforage.iterate((value, key) => {
        const result = ScrapeConfig.safeParse(value);
        if (result.success) {
            if (result.data.id !== key) {
                result.data.id = key;
            }
            configs.push(result.data);
        } else {
            setStatus('errored', `Invalid config found in storage with key "${key}"`);
        }
    });
    return configs;
}

export async function getConfig(id: string): Promise<ScrapeConfig | null> {
    const item = await localforage.getItem(id);
    if (item) {
        return ScrapeConfig.parse(item);
    }
    return null;
}

export async function saveToBrowser(id: string, config: ScrapeConfig): Promise<boolean> {
    const existing = await getConfig(id);
    if (existing) {
        return false;
    }
    await localforage.setItem(id, config);
    return true;
}

/**
 * Rename config stored in browser localstorage
 */
export async function renameConfig(oldId: string, newId: string): Promise<boolean> {
    const existing = await localforage.getItem(newId);
    if (existing) {
        setStatus('errored', `Config with id "${newId}" already exists.`);
        return false;
    }
    const result = ScrapeConfig.safeParse(await localforage.getItem(oldId));
    if (!result.success) {
        setStatus('errored', z.prettifyError(result.error));
    } else {
        await localforage.removeItem(oldId);
        result.data.id = newId;
        result.data.updatedAt = new Date().toISOString();
        await localforage.setItem(newId, result.data);
        return true;
    }
    return false;
}

/**
 * Remove config stored in browser localstorage
 */
export async function removeConfig(itemId: string): Promise<boolean> {
    const existing = await localforage.getItem(itemId);
    if (existing) {
        await localforage.removeItem(itemId);
        return true;
    }
    return false;
}

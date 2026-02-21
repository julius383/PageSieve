import * as z from 'zod';
import { StoredConfig } from '../../types';
import localforage from 'localforage';
import { setStatus } from '../stores/ui.svelte';
import { LogEntry } from '../stores/logs';

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

export async function saveResults(results: unknown[]): Promise<void> {
    await resultsStore.setItem('latest', results);
}

export async function getLatestResults(): Promise<unknown[] | null> {
    const results = await resultsStore.getItem('latest');
    return Array.isArray(results) ? results : null;
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

export async function getAllConfigs(): Promise<StoredConfig[]> {
    const configs: StoredConfig[] = [];
    await localforage.iterate((value, key) => {
        const result = StoredConfig.safeParse(value);
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

export async function getConfig(id: string): Promise<StoredConfig | null> {
    const item = await localforage.getItem(id);
    if (item) {
        return StoredConfig.parse(item);
    }
    return null;
}

export async function saveToBrowser(id: string, config: StoredConfig): Promise<boolean> {
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
    const result = StoredConfig.safeParse(await localforage.getItem(oldId));
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

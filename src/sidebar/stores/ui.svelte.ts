import { SvelteDate } from 'svelte/reactivity';
import type {
    ScrapeInstance,
    ExtensionStatus,
    StoredConfig,
    StatusLevel,
    ScrapeStatusLevel,
    ScrapeRunStatusSetRequest,
    ScrapeRunUpdateRequest,
} from '../../types';
import { getAllConfigs } from '../services/storage';
import { addLog } from './logs';

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

export function setStatus(status: StatusLevel, message: string) {
    Object.assign(extensionStatus, {
        status,
        message,
        timestamp: new SvelteDate().toISOString(),
    });
    if (status !== 'idle') {
        addLog(status, message);
    }
}

export function resetExtractedData() {
    extractedData.data = [{ id: 1, results: [] }];
    scrapeRuns.runs = [];
}

export function addOrUpdateScrapeRun(newRun: ScrapeInstance) {
    const existingIndex = scrapeRuns.runs.findIndex((run) => run.runId === newRun.runId);
    if (existingIndex !== -1) {
        Object.assign(scrapeRuns.runs[existingIndex], newRun);
    } else {
        scrapeRuns.runs.push(newRun);
    }
}

export function updateScrapeRunStatus(runId: string, status: ScrapeStatusLevel) {
    const run = scrapeRuns.runs.find((r) => r.runId === runId);
    if (run) {
        run.status = status;
    }
}

// Listener for messages from background script to update scrapeRuns
browser.runtime.onMessage.addListener(
    (request: ScrapeRunUpdateRequest | ScrapeRunStatusSetRequest) => {
        if (request.action === 'updateScrapeRun') {
            const { runId, url, currentPage, maxPages, status } = request;
            const newRun: ScrapeInstance = {
                runId,
                url,
                timestamp: new SvelteDate().toISOString(),
                currentPage,
                maxPages,
                status: status || 'in_progress',
            };
            addOrUpdateScrapeRun(newRun);
        } else if (request.action === 'setScrapeRunStatus') {
            updateScrapeRunStatus(request.runId, request.status);
        }
    },
);

// Library of saved configs
export const allConfigs = $state<{ configs: StoredConfig[] }>({ configs: [] });
export async function refreshConfigs() {
    const configs = await getAllConfigs();
    allConfigs.configs = configs;
}

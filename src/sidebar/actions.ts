import { SvelteDate } from 'svelte/reactivity';
import type { SelectorGroup } from '../types';
import {
    scrapeRuns,
    extractedData,
    runWithStatus,
    runWithStatusAsync,
    setStatus,
    getStatus,
} from './stores/ui.svelte';
import { shortHash, generateConfigId, validateSelectors } from './util';
import { scrapeConfig, setScrapeConfig } from './stores/scrapeConfig.svelte';
import { StoredConfig, ScrapeConfig } from '../types';
import { saveToBrowser } from './services/storage';
import { commitPaginationToScrapeConfig } from './stores/pagination.svelte';

export enum PaginationStateStatus {
    InProgress = 1,
    Complete,
    Failed,
}

/**
 * Extracts data from current tab using defined selector. Returns via
 * browser sendMessage
 */
export async function extractData(selectors: SelectorGroup[]): Promise<void> {
    if (!validateSelectors(selectors)) {
        setStatus('errored', 'No valid selectors present');
        return;
    }

    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            setStatus('extracting', `Extracting data from ${tabs[0].url}`);
            const response = await browser.tabs.sendMessage(tabs[0].id, {
                action: 'extractData',
                selectors: JSON.parse(JSON.stringify(selectors)),
            });

            if (response && response.result) {
                const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
                if (response.result) {
                    if (
                        scrapeRuns.runs.length == 0 &&
                        scrapeConfig.metadata.url !== 'https://pagesieve.xyz'
                    ) {
                        // this is the first run with with new config

                        scrapeConfig.metadata.url = tabInfo.url;
                        scrapeConfig.metadata.id = await generateConfigId(tabInfo.url, selectors);
                    }
                }
                if (scrapeConfig.options.appendData) {
                    response.result.forEach((newGroup) => {
                        const existingGroup = extractedData.data.find((d) => d.id === newGroup.id);
                        if (existingGroup) {
                            existingGroup.results = existingGroup.results.concat(newGroup.results);
                        } else {
                            extractedData.data.push(newGroup);
                        }
                    });
                    // re-assign to trigger reactivity
                    extractedData.data = [...extractedData.data];
                } else {
                    extractedData.data = response.result;
                }
                setStatus('idle', `Ready`);
                return;
            } else {
                setStatus('errored', response.error);
                return;
            }
        } else {
            setStatus('errored', 'Failed to find active tab');
            return;
        }
    } catch (error) {
        if (error instanceof Error) {
            setStatus('errored', `extraction failed with error ${error.message}`);
        }
        return;
    }
}

/**
 * Imports ScrapeConfig from a file
 */
export function importConfig(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    runWithStatus(
        {
            status: 'importing',
            message: `importing ScrapeConfig from ${file.name}`,
            timestamp: new SvelteDate().toISOString(),
        },
        () => {
            let configData;
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result) {
                    configData = JSON.parse(reader.result as string);
                    const result = StoredConfig.safeParse(configData);
                    if (!result.success) {
                        console.error(result.error); // ZodError instance
                    } else {
                        setScrapeConfig(result.data.config);
                    }
                    console.dir(configData);
                }
            };
            reader.readAsText(file);
            fileInput.value = ''; // Reset for next use
        },
    );
}

/**
 * Export ScrapeConfig to JSON file for download by user
 *
 */
export async function exportConfig(config: ScrapeConfig): Promise<string> {
    commitPaginationToScrapeConfig();
    const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
    const filename = await generateConfigId(tabInfo.url, config.selectors);
    runWithStatus(
        {
            status: 'exporting',
            message: `exporting config with id ${filename}`,
            timestamp: new Date().toISOString(),
        },
        () => {
            const storedConfig = StoredConfig.parse({
                id: config.metadata.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                config: config,
            });
            const dataStr =
                'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(storedConfig));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute('href', dataStr);

            downloadAnchorNode.setAttribute('download', `${filename}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        },
    );
    return filename;
}

export async function saveConfig(config: ScrapeConfig) {
    commitPaginationToScrapeConfig();
    const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
    const filename = await generateConfigId(tabInfo.url, config.selectors);
    const storedConfig = {
        id: config.metadata.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: config,
    };

    await runWithStatusAsync(
        {
            status: 'saving',
            message: `Saving config for ${config.metadata.url}`,
            timestamp: new SvelteDate().toISOString(),
        },
        async () => {
            const result = await saveToBrowser(filename, storedConfig);
            if (!result) {
                setStatus('errored', `conflict with existing config with id ${storedConfig.id}`);
            }
        },
    );
}

export async function loadConfig(stored: StoredConfig) {
    runWithStatusAsync(
        {
            status: 'loading',
            message: `Loading config ${stored.id} from browser storage`,
            timestamp: new Date().toISOString(),
        },
        async () => {
            await setScrapeConfig(stored.config);
        },
    );
}

export async function navigateTo(config: ScrapeConfig) {
    return await runWithStatusAsync(
        {
            status: 'navigating',
            message: `Navigating to next page based on ${config.pagination.mode}`,
            timestamp: new Date().toISOString(),
        },
        async () => {
            const navRes = await browser.runtime.sendMessage({
                action: 'pageNavigate',
                config: config,
                configHash: await shortHash(config.selectors),
            });
            // TODO: wait the amount set in Extraction Options
            if (navRes.paginationStatus === PaginationStateStatus.Failed) {
                setStatus(
                    'errored',
                    `failed to navigate to next page with ${config.pagination.mode}`,
                );
            }
            return navRes.paginationStatus;
        },
    );
}

export async function runConfig(config: ScrapeConfig) {
    commitPaginationToScrapeConfig();
    let paginationComplete = false;
    while (!paginationComplete) {
        await extractData(config.selectors);
        if (getStatus() === 'errored') {
            paginationComplete = true;
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, config.options.delayMs)); // Delay before navigation

        const paginationStatus = await navigateTo(config);
        if (
            paginationStatus === PaginationStateStatus.Complete ||
            paginationStatus === PaginationStateStatus.Failed
        ) {
            paginationComplete = true;
        }

        if (!paginationComplete) {
            await new Promise((resolve) => setTimeout(resolve, config.options.delayMs));
        }
    }
    return;
}

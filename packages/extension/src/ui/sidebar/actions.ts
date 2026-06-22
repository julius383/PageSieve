import { SvelteDate } from 'svelte/reactivity';
import type { SelectorGroup } from '@pagesieve/core/schema';
import {
    extractedData,
    runWithStatus,
    runWithStatusAsync,
    setStatus,
} from '@/ui/sidebar/stores/ui.svelte';
import { shortHash, generateConfigId, validateSelectors } from '@pagesieve/core/util';
import { scrapeConfig, setScrapeConfig } from '@/ui/sidebar/stores/scrapeConfig.svelte';
import { ScrapeConfig } from '@pagesieve/core/schema';
import { saveToBrowser } from '@/ui/sidebar/services/storage';
import { commitPaginationToScrapeConfig } from '@/ui/sidebar/stores/pagination.svelte';
import { type ExtractedGroup, PaginationStateStatus } from '@pagesieve/core/types';

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
                if (scrapeConfig.options.appendData) {
                    response.result.forEach((newGroup: ExtractedGroup) => {
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
                    extractedData.data = [...response.result];
                }
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
 * Imports ScrapeConfig from a file into UI
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
                    const result = ScrapeConfig.safeParse(configData);
                    if (!result.success) {
                        console.error(result.error); // ZodError instance
                    } else {
                        setScrapeConfig(result.data);
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
 */
export async function exportConfig(): Promise<string> {
    commitPaginationToScrapeConfig();
    const config = JSON.parse(JSON.stringify(scrapeConfig)) as ScrapeConfig;
    const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
    const filename = await generateConfigId(tabInfo.url, config.selectors);
    runWithStatus(
        {
            status: 'exporting',
            message: `exporting config with id ${filename}`,
            timestamp: new Date().toISOString(),
        },
        () => {
            const dataStr =
                'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config));
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

/**
 * Saves ccnfig to browser local storage
 */
export async function saveConfig() {
    commitPaginationToScrapeConfig();
    const config = JSON.parse(JSON.stringify(scrapeConfig)) as ScrapeConfig;
    const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
    const filename = await generateConfigId(tabInfo.url, config.selectors);

    await runWithStatusAsync(
        {
            status: 'saving',
            message: `Saving config for ${config.url}`,
            timestamp: new SvelteDate().toISOString(),
        },
        async () => {
            const result = await saveToBrowser(filename, config);
            if (!result) {
                setStatus('errored', `conflict with existing config with id ${config.id}`);
            }
        },
    );
}

/**
 * Load config from browser storage into UI
 */
export function loadConfig(config: ScrapeConfig) {
    runWithStatus(
        {
            status: 'loading',
            message: `Loading config ${config.id} from browser storage`,
            timestamp: new Date().toISOString(),
        },
        () => {
            setScrapeConfig(config);
        },
    );
}

/**
 * Navigate to next page based on defined pagination config
 */
export async function navigateTo(config: ScrapeConfig, testing: boolean = false) {
    return await runWithStatusAsync(
        {
            status: 'navigating',
            message: `Navigating to next page based on ${config.pagination.mode}`,
            timestamp: new Date().toISOString(),
        },
        async () => {
            const navRes = await browser.runtime.sendMessage({
                action: 'testNavigate',
                config: config,
                configHash: await shortHash(config.selectors),
                testing,
            });
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

/**
 * 'main' function of extension
 */
export async function runConfig() {
    commitPaginationToScrapeConfig();
    const config = JSON.parse(JSON.stringify(scrapeConfig)) as ScrapeConfig;

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
        setStatus('errored', 'Failed to find active tab');
        return;
    }

    if (!config.id) {
        scrapeConfig.url = tabs[0].url || '';
        scrapeConfig.id = await generateConfigId(tabs[0].url || '', config.selectors);
    }

    // Trigger the background machine
    browser.runtime.sendMessage({
        action: 'runMain',
        config,
        tabId: tabs[0].id,
    });
}

export async function stopRun() {
    // Trigger the background machine
    browser.runtime.sendMessage({
        action: 'stopMain',
    });
}

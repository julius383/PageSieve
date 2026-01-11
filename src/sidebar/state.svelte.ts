// vim:set foldlevel=0 foldmethod=marker:
import { SvelteURL } from 'svelte/reactivity';
import { Parser } from '@json2csv/plainjs';
import { writable, derived, get } from 'svelte/store';
import localforage, { config } from 'localforage';

// import { SvelteURL } from 'svelte/reactivity';
import {
    SelectorDefinition,
    ScrapeConfig,
    ScrapeInstance,
    ExtensionStatus,
    StoredConfig,
    PaginationConfig,
    Metadata,
    ExtractionOptions,
} from '../types';
import { SvelteURL } from 'svelte/reactivity';

const CONFIG_STORAGE_KEY = 'pagesieve-configs';

localforage.config({
    name: CONFIG_STORAGE_KEY,
    driver: localforage.LOCALSTORAGE,
});

export const status = writable<ExtensionStatus>({
    level: 'idle',
    message: 'ready',
    timestamp: Date.now(),
});

// Sync initial value from background
browser.runtime.sendMessage({ type: 'get-status' }).then((s) => {
    if (s) status.set(s);
});

// Listen for updates from background
browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'status-updated') {
        status.set(msg.status);
    }
});

// PaginationConfig handling start {{{
// TODO: figure out best default here and in other exported stores
export const pagination = writable<PaginationConfig>({ mode: 'next', nextSelector: '' });

// }}}

// SelectorDefinition handling start {{{
export const selectorDefs = writable<SelectorDefinition[]>([{ id: 1, name: '', selector: '' }]);
let nextSelectorId = 2;

export function addDefinition() {
    selectorDefs.update((currentFields) => [
        ...currentFields,
        { id: nextSelectorId++, name: '', selector: '' },
    ]);
}

export function deleteDefinition(id: number) {
    selectorDefs.update((currentFields) => currentFields.filter((item) => item.id !== id));
}

export function resetDefinitions() {
    nextSelectorId = 1;
    selectorDefs.set([{ id: nextSelectorId++, name: '', selector: '' }]);
}

// }}}

// extractedData handling start {{{
export const extractedData = writable([]);
const extractedJSON = derived(extractedData, ($extractedData) =>
    JSON.stringify($extractedData, null, 2),
);

export function resetExtractedData() {
    extractedData.set([]);
}

// Derived store for columns
export const columns = derived(extractedData, ($extractedData) =>
    $extractedData.length > 0 ? Object.keys($extractedData[0]).filter((key) => key !== 'id') : [],
);
// }}}

// Metadata handling start {{{
export const metadata = writable<Metadata>({ id: '', url: '', version: '1.0' });

// }}}

// ExtractOptions handling start {{{
export const extractOptions = writable<ExtractionOptions>({
    waitForNetworkIdle: true,
    appendData: false,
});

// }}}

const scrapeRuns = $state<ScrapeInstance[]>([]);

export function downloadJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(get(extractedJSON));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'data.json');
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function downloadCSV() {
    try {
        const parser = new Parser();
        const csv = parser.parse(get(extractedData));

        const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'data.csv');
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        console.log(csv);
    } catch (err) {
        console.error(err);
    }
}

/**
 * Extracts data from current tab using defined selector. Returns via
 * browser sendMessage
 *
 */
export async function handleExtract() {
    const selectors = get(selectorDefs).filter((f) => f.name && f.selector);

    if (selectors.length === 0) {
        browser.runtime.sendMessage({
            action: 'set-status',
            data: { level: 'error', message: `No valid selectors to extract.` },
        });
        return;
    }

    try {
        const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tabs[0]?.id) {
            const response = await browser.tabs.sendMessage(tabs[0].id, {
                action: 'extractData',
                selectors: JSON.parse(JSON.stringify(selectors)),
            });

            // console.log('Runs is');
            // console.dir($state.snapshot(scrapeRuns));
            if (response && response.result) {
                const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
                scrapeRuns.length = scrapeRuns.length > 4 ? 4 : scrapeRuns.length;
                if (get(selectorDefs).length > 0 && response.result) {
                    const contentHashShort = await shortHash(get(selectorDefs));
                    const runInst = {
                        url: new SvelteURL(tabInfo.url).hostname,
                        shortHash: contentHashShort,
                        timestamp: Date.now(),
                    };
                    if (scrapeRuns.length > 0) {
                        // check if last run has identical config
                        if (scrapeRuns[0].shortHash == runInst.shortHash) {
                            extractOptions.update((current) => {
                                return { ...current, appendData: true };
                            });

                            metadata.update((current) => {
                                return {
                                    ...current,
                                    lastRunAt: Date.now(),
                                };
                            });
                        }
                    } else {
                        // this is the first run with with new config
                        scrapeRuns.unshift(runInst);
                        const response = await browser.runtime.sendMessage({ action: 'getTabUrl' });

                        // update URL in metadata
                        metadata.update((current) => {
                            return {
                                ...current,
                                url: response.url,
                                selectorCount: get(selectorDefs).length,
                                lastRunAt: Date.now(),
                            };
                        });

                        extractOptions.update((current) => {
                            return { ...current, appendData: false };
                        });
                    }
                }
                if (get(extractOptions).appendData) {
                    extractedData.update((current) => [...current, ...response.result]);
                } else {
                    extractedData.set(response.result);
                }

                console.dir(get(extractedData));
                return 'idle';
            } else {
                console.log('Error, failed to extract selectors');
                return 'error';
            }
        } else {
            console.log('Error: No active tab found.');
            return 'error';
        }
    } catch (error) {
        console.error('Error during extraction:', error);
        return 'error';
    }
}

/**
 * Imports ScrapeConfig from a file
 *
 * @param {Event} event - holds input holding file to load
 */
export function handleImportConfig(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    browser.runtime.sendMessage({
        action: 'set-status',
        data: { level: 'importing', message: `importing ScrapeConfig from ${file.name}` },
    });
    let configData;
    const reader = new FileReader();
    reader.onload = () => {
        if (reader.result) {
            configData = JSON.parse(reader.result as string);

            console.dir(configData);
            loadConfig(configData);
        }
    };
    reader.readAsText(file);
    fileInput.value = ''; // Reset for next use
}

/**
 * Export ScrapeConfig to JSON file for download by user
 *
 * @returns {string} auto-generated filename, may differ than one used to save
 */
export async function handleExportConfig() {
    console.log('Downloading config...');
    const config = await createConfig();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);

    // replicates logic in generateConfigId
    const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
    const domain = new SvelteURL(tabInfo.url).hostname.replace('www.', '');
    const contentHashShort = await shortHash(get(selectorDefs));
    const pathslug = createPathSlug(tabInfo.url);
    const filename = `${sanitizeForFilename(domain)}_${sanitizeForFilename(pathslug)}_${contentHashShort}.json`;

    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    return filename;
}

/**
 * Removes characters illegal in filenames
 *
 * @param {string} str - string to sanitize
 * @returns {string} string with illegal characters
 */
function sanitizeForFilename(str: string) {
    return str
        .replace(/[^.a-zA-Z0-9\-_]/g, '')
        .replace(/^\.+/, '')
        .replace(/\.+$/, '');
}

/**
 * Guesses a unique part of a URL
 *
 * @param {string} url - full web page URL
 * @returns {string} - substring of URL
 */
function createPathSlug(url: string) {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter((s) => s && s !== 'index.html');
    return segments
        .slice(-2)
        .join('-')
        .replace(/\.[^.]+$/, '');
}

/**
 * Computes SHA-256 hash of an object
 *
 * @param {object} data - object hash
 * @returns {string} - hex substring of hash
 */
async function shortHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Take first 4 bytes (8 hex chars) for readability
    return hashArray
        .slice(0, 4)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

async function generateConfigId() {
    const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
    const domain = new URL(tabInfo.url).hostname.replace('www.', '');
    const pathslug = createPathSlug(tabInfo.url);
    const contentHashShort = await shortHash(get(selectorDefs));
    console.log(`domain: ${domain}, pathslug ${pathslug}, shortHash: ${contentHashShort}`);
    const configKey = `${domain}--${pathslug}--${contentHashShort}`;
    return configKey;
}

async function createConfig() {
    const id = await generateConfigId();

    const config = {
        metadata: { ...get(metadata), id: id },
        selectors: get(selectorDefs),
        options: get(extractOptions),
        pagination: get(pagination),
    };
    const scrape = {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config,
    };
    return scrape;
}

export const allConfigs = writable<StoredConfig[]>([]);

/**
 * Loads ScrapeConfigs from browser local storage
 *
 */
export async function refreshConfigs() {
    try {
        allConfigs.set([]);
        await localforage.iterate((value, key, idx) => {
            allConfigs.update((current) => [...current, value]);
        });
    } catch (err) {
        console.log(err);
        return [];
    }
}

/**
 * Saves current config to browser local storage
 *
 */
export async function handleSaveConfig() {
    try {
        const config = await createConfig();

        browser.runtime.sendMessage({
            action: 'set-status',
            data: { level: 'saving', message: `Saving config for ${config.config.metadata.url}` },
        });
        const existing = await localforage.getItem(config.id);
        if (existing) {
            // TODO: prompt user to rename or overwrite
            browser.runtime.sendMessage({
                action: 'set-status',
                data: { level: 'error', message: `Config with id ${config.id} already exists` },
            });
            return false;
        }
        await localforage.setItem(config.id, config);
        console.log('Configuration saved successfully');
        console.log(`Saving the following config ${config.id}`);
        console.dir(config);
        await refreshConfigs();
    } catch (err) {
        console.error('Error saving configuration:', err);
        throw err;
    }
}

/**
 * Loads config into plugin
 *
 * @param {StoredConfig} configData - config to load
 */
export function loadConfig(configData: StoredConfig) {
    // FIXME: figure out how to load extra data such as the id and createdAt
    if (configData != undefined) {
        // metadata
        metadata.set(configData.config.metadata);
        // selectors
        selectorDefs.set(configData.config.selectors);
        nextSelectorId = get(selectorDefs).length;
        // options
        extractOptions.set(configData.config.options);
        // pagination
        pagination.set(configData.config.pagination);
        // variables
    }
}

/**
 * Rename config stored in browser localstorage
 *
 * @param {string} oldId - old id used to store config
 * @param {string} newId - new id to store config
 */
export async function renameConfig(oldId: string, newId: string) {
    const existing = await localforage.getItem(newId);
    if (existing) {
        console.error(`Config with id "${newId}" already exists.`);
        return false;
    }
    const conf = (await localforage.getItem(oldId)) as StoredConfig;
    if (conf) {
        await localforage.removeItem(oldId);
        conf.id = newId;
        conf.updatedAt = Date.now();
        await localforage.setItem(newId, conf);
        await refreshConfigs();
        return true;
    }
    return false;
}

/**
 * Remove config stored in browser localstorage
 *
 * @param {string} itemId - id of config to remove
 */
export async function removeConfig(itemId: string) {
    const conf = (await localforage.getItem(itemId)) as ScrapeConfig;
    if (conf) {
        await localforage.removeItem(itemId);
        await refreshConfigs();
        return true;
    }
    return false;
}

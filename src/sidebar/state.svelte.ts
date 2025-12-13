import { Parser } from '@json2csv/plainjs';
import { writable, derived, get } from 'svelte/store';
import localforage from 'localforage';

// import { SvelteURL } from 'svelte/reactivity';
import { SelectorConfig, PropConfig, ScrapeConfig, ScrapInstance, ExtensionStatus } from '../types';
import { SvelteURL } from 'svelte/reactivity';

const CONFIG_STORAGE_KEY = 'pageweave-configs';

localforage.config({
    name: CONFIG_STORAGE_KEY,
    driver: localforage.LOCALSTORAGE,
});



export const status = writable<ExtensionStatus>({
    level: "idle",
    message: "ready",
    timestamp: Date.now(),
});

// Sync initial value from background
browser.runtime.sendMessage({ type: "get-status" }).then((s) => {
  if (s) status.set(s);
});

// Listen for updates from background
browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === "status-updated") {
    status.set(msg.status);
  }
});

interface Settings {
    appendData: boolean;
}

const SETTINGS: Settings = { appendData: false };

export const fields = writable<SelectorConfig[]>([{ id: 1, name: '', selector: '' }]);
let nextId = 2;

export function addField() {
    fields.update((currentFields) => [...currentFields, { id: nextId++, name: '', selector: '' }]);
}

export function deleteField(id: number) {
    fields.update((currentFields) => currentFields.filter((item) => item.id !== id));
}

export function resetFields() {
    nextId = 1;
    fields.set([{ id: nextId++, name: '', selector: '' }]);
}

let currentURL = $state('');
let currentTitle = $state('');

browser.runtime.sendMessage({ action: 'getTabUrl' }).then((response) => {
    currentURL = response.url;
    currentTitle = response.title;
    console.log(`Current URL is ${response.url}`);
});

export const properties = writable<PropConfig[]>([{ id: 1, key: 'URL', value: '' }]);
let nextPropId = 2;

export function addProperty() {
    properties.update((currentFields) => [
        ...currentFields,
        { id: nextPropId++, key: '', value: '' },
    ]);
}

export function deleteProperty(id: number) {
    properties.update((currentFields) => currentFields.filter((item) => item.id !== id));
}

export function resetProperties() {
    nextPropId = 1;
    properties.set([{ id: nextPropId++, key: '', value: '' }]);
}

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

const scrapeRuns = $state<ScrapInstance[]>([]);

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

export async function handleExtract() {
    const selectors = get(fields).filter((f) => f.name && f.selector);

    if (selectors.length === 0) {
        browser.runtime.sendMessage({action: "set-status", data: {level: 'error', message:`No valid selectors to extract.`}});
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
                if (get(fields).length > 0 && response.result) {
                    const contentHashShort = await shortHash(get(fields));
                    const runInst = {
                        url: new URL(tabInfo.url).hostname,
                        shortHash: contentHashShort,
                    };
                    if (scrapeRuns.length > 0) {
                        if (
                            JSON.stringify($state.snapshot(scrapeRuns[0])) ==
                            JSON.stringify(runInst)
                        ) {
                            SETTINGS.appendData = true;
                        }
                    } else {
                        scrapeRuns.unshift(runInst);
                    }
                }
                if (SETTINGS.appendData) {
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

export function handleImportConfig(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    browser.runtime.sendMessage({action: "set-status", data: {level: 'importing', message:`importing ScrapeConfig from ${file.name}`}});
    let configData;
    const reader = new FileReader();
    reader.onload = () => {
        if (reader.result) {
            configData = JSON.parse(reader.result as string);

            console.dir(configData);
            // FIXME: figure out how to load extra data such as the id and createdAt
            if (configData != undefined) {
                fields.set([]);
                for (const item of configData['fieldConf']) {
                    fields.update((currentFields) => [...currentFields, item]);
                }
                properties.set([]);
                for (const item of configData['propsConf']) {
                    properties.update((current) => [...current, item]);
                }
                nextId = get(fields).length;
                nextPropId = get(properties).length;
            }
        }
    };
    reader.readAsText(file);
    fileInput.value = ''; // Reset for next use
}

export async function handleExportConfig() {
    console.log('Downloading config...');
    const config = await createConfig();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);

    const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
    const domain = new SvelteURL(tabInfo.url).hostname.replace('www.', '');
    const contentHashShort = await shortHash(get(fields));
    const pathslug = createPathSlug(tabInfo.url);
    const filename = `${sanitizeForFilename(domain)}_${sanitizeForFilename(pathslug)}_${contentHashShort}.json`;

    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function sanitizeForFilename(str: string) {
    return str.replace(/[^.a-zA-Z0-9\-_]/g, '')
              .replace(/^\.+/, '')
              .replace(/\.+$/, '');
}

function createPathSlug(url: string) {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter((s) => s && s !== 'index.html');
    return segments
        .slice(-2)
        .join('-')
        .replace(/\.[^.]+$/, '');
}

async function shortHash(data: object) {
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
    const contentHashShort = await shortHash(get(fields));
    console.log(`domain: ${domain}, pathslug ${pathslug}, shortHash: ${contentHashShort}`)
    const configKey = `${domain}--${pathslug}--${contentHashShort}`;
    return [tabInfo.url, configKey];
}

async function createConfig() {
    const [url, id] = await generateConfigId()

    const config = {
        fieldConf: get(fields),
        propsConf: get(properties),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        id,
        url,
    };
    return config;
}

export const allConfigs = writable<ScrapeConfig[]>([]);

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

export async function handleSaveConfig() {
    try {
        const config = await createConfig();

        browser.runtime.sendMessage({action: "set-status", data: {level: 'saving', message:`Saving config for ${config.url}`}});
        const existing = await localforage.getItem(config.id);
        if (existing) {
            // TODO: prompt user to rename or overwrite
            browser.runtime.sendMessage({action: "set-status", data: {level: 'error', message:`Config with id ${config.id} already exists`}});
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

export function loadConfig(configData: ScrapeConfig) {
    if (configData != undefined) {
        fields.set([]);
        for (const item of configData['fieldConf']) {
            fields.update((currentFields) => [...currentFields, item]);
        }
        properties.set([]);
        for (const item of configData['propsConf']) {
            properties.update((current) => [...current, item]);
        }
        nextId = get(fields).length;
        nextPropId = get(properties).length;
    }
}

export async function renameConfig(oldId: string, newId: string) {
    const existing = await localforage.getItem(newId);
    if (existing) {
        console.error(`Config with id "${newId}" already exists.`);
        return false;
    }
    const conf = (await localforage.getItem(oldId)) as ScrapeConfig;
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

export async function removeConfig(itemId: string) {
    const conf = (await localforage.getItem(itemId)) as ScrapeConfig;
    if (conf) {
        await localforage.removeItem(itemId);
        await refreshConfigs();
        return true;
    }
    return false;
}

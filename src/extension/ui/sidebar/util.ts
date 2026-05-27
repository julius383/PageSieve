import { zipObject } from 'es-toolkit';
import { Parser } from '@json2csv/plainjs';
import { downloadZip } from 'client-zip';
import type { ExtractedGroup, SupportedExportDataTypes } from '@/core/types';
import type { StatusLevel } from '@/extension/types';
import type { SelectorGroup } from '@/core/schema';
// @ts-expect-error: handlebars integration through vite plugin
import htmlTemplate from '@/extension/ui/sidebar/templates/htmltemplate.hbs';
// @ts-expect-error: handlebars integration through vite plugin
import mdTemplate from '@/extension/ui/sidebar/templates/mdtemplate.hbs';

// import { getLogger } from '../logger';
// const logger = getLogger(["ext", "util"]);

function escapeCell(value: unknown) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\') // backslashes first (must be before other escapes)
        .replace(/\|/g, '\\|') // pipes
        .replace(/\n/g, '&#10;'); // newlines
}

function convertTo(data: object[], format: SupportedExportDataTypes): string {
    if (data.length == 0) {
        return '';
    }
    switch (format) {
        case 'json': {
            return JSON.stringify(data);
        }
        case 'ndjson': {
            const items = data.map((x) => JSON.stringify(x));
            return items.join('\n');
        }
        case 'csv': {
            const parser = new Parser();
            const csv = parser.parse(data);
            return csv;
        }
        case 'html': {
            const columns = Object.keys(data[0]);
            const result = htmlTemplate({ columns, rows: data });
            return result;
        }
        case 'markdown': {
            const columns = Object.keys(data[0]) as string[];
            // eslint-disable-next-line
            const escaped = data.map((row: Record<string, any>) => {
                const newVals = columns.map((col) => escapeCell(row[col]));
                return zipObject(columns, newVals);
            });
            const result = mdTemplate({
                columns,
                rows: escaped,
            });
            // restore newline escape
            return result.replace(/&amp;#10;/g, '&#10;');
        }
    }
}

function getMimeType(type: SupportedExportDataTypes) {
    switch (type) {
        case 'json':
            return 'application/json';
        case 'ndjson':
            return 'application/x-ndjson';
        case 'csv':
            return 'text/csv';
        case 'html':
            return 'application/html';
        case 'markdown':
            return 'text/markdown';
    }
}

export function formatColumnName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function downloadBundle(
    data: ExtractedGroup[],
    format: SupportedExportDataTypes = 'csv',
    filename: string = 'data.zip',
) {
    try {
        const files = data.map((group) => {
            const convertedData = convertTo(group.results, format);
            const fname = sanitizeSegment(`group_${group.id}`);
            return { name: `${fname}.${format}`, lastModified: new Date(), input: convertedData };
        });

        const zipBlob = await downloadZip(files).blob();
        const url = URL.createObjectURL(zipBlob);

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', url);
        downloadAnchorNode.setAttribute('download', filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
    }
}

export async function clipboardCopy(data: object[], format: SupportedExportDataTypes = 'json') {
    const converted = convertTo(data, format);
    await navigator.clipboard.writeText(converted);
    console.log('Wrote data to clipboard');
}

export async function downloadFormat(data: object[], format: SupportedExportDataTypes = 'json') {
    try {
        const converted = convertTo(data, format);
        const blob = new Blob([converted], { type: `${getMimeType(format)};charset=utf-8;` });
        const url = URL.createObjectURL(blob);

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', url);
        downloadAnchorNode.setAttribute('download', `data.${format}`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
    }
}

// Characters not allowed in filenames across major OSes
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = new RegExp('[<>:"/\\\\|?*\\x00-\\x1F]', 'g');

export function sanitizeSegment(input: string): string {
    return input
        .normalize('NFKD') // normalize unicode
        .replace(INVALID_CHARS, '') // remove illegal chars
        .replace(/\s+/g, '-') // spaces → dashes
        .replace(/-+/g, '-') // collapse dashes
        .replace(/^\.+|\.+$/g, '') // trim dots
        .replace(/^[-_]+|[-_]+$/g, '') // trim separators
        .toLowerCase();
}

/**
 * Guesses a unique part of a URL
 */
export function createPathSlug(url: string): string {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter((s) => s && s !== 'index.html');
    return segments
        .slice(-2)
        .join('-')
        .replace(/\.[^.]+$/, '');
}

/**
 * Computes SHA-256 hash of an object
 */
export async function shortHash(data: object): Promise<string> {
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

export async function generateConfigId(url: string, selectors: SelectorGroup[]): Promise<string> {
    const contentHashShort = await shortHash(selectors);

    const domain = new URL(url).hostname.replace('www.', '');
    const pathslug = createPathSlug(url);

    let filename = [domain, pathslug, contentHashShort].map((s) => sanitizeSegment(s)).join('__');
    filename = filename.slice(0, 200);
    return filename;
}

export function validateSelectors(selectors: SelectorGroup[]): boolean {
    const allFields = selectors.flatMap((item) => item.fields);
    return allFields.some((f) => f.name && f.selector);
}

export function getIndicatorColor(status: StatusLevel): { label: string; style: string } {
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    switch (status) {
        case 'idle':
            return { label: capitalize(status), style: '#CBD5E1' };
        case 'running':
        case 'extracting':
        case 'inspecting':
        case 'waiting':
        case 'navigating':
            return { label: capitalize(status), style: '#3B82F6' };
        case 'completed':
            return { label: capitalize(status), style: '#228b22' };
        case 'saving':
        case 'loading':
        case 'importing':
        case 'exporting':
            return { label: capitalize(status), style: '#FBBF24' };
        case 'errored':
            return { label: capitalize(status), style: '#F87171' };
        default:
            return { label: capitalize(status), style: '#CBD5E1' };
    }
}

// navigation helpers
export async function navigateAndWait(tabId: number, url: string, timeoutMs: number = 30000) {
    return new Promise((resolve, reject) => {
        let listener:
            | ((
                  updatedTabId: number,
                  changeInfo: browser.tabs._OnUpdatedChangeInfo,
                  tab: browser.tabs.Tab,
              ) => void)
            | undefined = undefined;

        const timeoutId = setTimeout(() => {
            if (listener) browser.tabs.onUpdated.removeListener(listener);
            reject(new Error(`Navigation to ${url} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        browser.tabs
            .get(tabId)
            .then((tab) => {
                const normalize = (u: string) => u.replace(/\/$/, '').split('#')[0];
                if (normalize(tab.url || '') === normalize(url) && tab.status === 'complete') {
                    clearTimeout(timeoutId);
                    resolve(tab);
                    return;
                }

                let isNavigating = false;
                listener = (
                    updatedTabId: number,
                    changeInfo: browser.tabs._OnUpdatedChangeInfo,
                    tab: browser.tabs.Tab,
                ) => {
                    if (updatedTabId !== tabId) return;
                    if (changeInfo.status === 'loading') isNavigating = true;
                    if (isNavigating && changeInfo.status === 'complete') {
                        if (normalize(tab.url || '') === normalize(url)) {
                            clearTimeout(timeoutId);
                            if (listener) browser.tabs.onUpdated.removeListener(listener);
                            resolve(tab);
                        }
                    }
                };
                browser.tabs.onUpdated.addListener(listener, { tabId });
                browser.tabs.update(tabId, { url }).catch((err) => {
                    clearTimeout(timeoutId);
                    if (listener) browser.tabs.onUpdated.removeListener(listener);
                    reject(err);
                });
            })
            .catch((err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
    });
}

export async function waitForTabLoad(
    tabId: number,
    timeout: number = 10000,
): Promise<browser.tabs.Tab> {
    const tab = await browser.tabs.get(tabId);
    if (tab.status === 'complete') return tab;

    return new Promise((resolve, reject) => {
        let listener:
            | ((updatedTabId: number, changeInfo: browser.tabs._OnUpdatedChangeInfo) => void)
            | undefined = undefined;
        const timeoutId = setTimeout(() => {
            if (listener) browser.tabs.onUpdated.removeListener(listener);
            reject(new Error(`Tab ${tabId} did not load within ${timeout}ms.`));
        }, timeout);

        listener = (updatedTabId: number, changeInfo: browser.tabs._OnUpdatedChangeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                clearTimeout(timeoutId);
                if (listener) browser.tabs.onUpdated.removeListener(listener);
                browser.tabs.get(tabId).then(resolve);
            }
        };
        browser.tabs.onUpdated.addListener(listener);
    });
}

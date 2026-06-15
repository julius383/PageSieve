import { match } from 'ts-pattern';
import { downloadZip } from 'client-zip';
import type { ExtractedGroup, SupportedExportDataTypes } from '@pagesieve/core/types';
import type { StatusLevel } from '@/types';
import { sanitizeSegment } from '@pagesieve/core/util';
import { convertTo, getMimeType } from '@pagesieve/core/converters';

// import { getLogger } from '../logger';
// const logger = getLogger(["ext", "util"]);

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

export function getIndicatorColor(status: StatusLevel): { label: string; style: string } {
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const label = capitalize(status);
    /* prettier-ignore-start */
    return match(status)
        .returnType<{ label: string; style: string }>()
        .with('idle', () => ({ label, style: '#CBD5E1' }))
        .with('running', () => ({ label, style: '#00bbf9' }))
        .with('extracting', () => ({ label, style: '#00bbf9' }))
        .with('navigating', () => ({ label, style: '#00bbf9' }))
        .with('inspecting', () => ({ label, style: '#9b5de5' }))
        .with('waiting', () => ({ label, style: '#f9c74f' }))
        .with('saving', 'loading', 'importing', 'exporting', () => ({ label, style: '#f77f00' }))
        .with('errored', () => ({ label, style: '#F87171' }))
        .with('completed', () => ({ label, style: '#228b22' }))
        .exhaustive();
    /* prettier-ignore-end */
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

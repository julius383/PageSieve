import { SvelteURL } from "svelte/reactivity";
import type { SelectorDefinition } from "../types";
import { scrapeRuns, extractedData } from "./stores/ui.svelte";
import { shortHash } from "./util";
import { scrapeConfig } from "./stores/scrapeConfig.svelte";


/**
 * Extracts data from current tab using defined selector. Returns via
 * browser sendMessage
 *
 */
export async function handleExtract(selectors: SelectorDefinition[]) {
    const validSelectors = selectors.filter((f) => f.name && f.selector);

    if (validSelectors.length === 0) {
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
                selectors: JSON.parse(JSON.stringify(validSelectors)),
            });

            // console.log('Runs is');
            // console.dir($state.snapshot(scrapeRuns));
            if (response && response.result) {
                const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });
                scrapeRuns.runs.length = scrapeRuns.runs.length > 4 ? 4 : scrapeRuns.runs.length;
                if (validSelectors.length > 0 && response.result) {
                    const contentHashShort = await shortHash(validSelectors);
                    const runInst = {
                        url: new SvelteURL(tabInfo.url).hostname,
                        shortHash: contentHashShort,
                        timestamp: new Date().toISOString(),
                    };
                    if (scrapeRuns.runs.length > 0) {
                        // check if last run has identical config
                        if (scrapeRuns.runs[0].shortHash == runInst.shortHash) {
                            scrapeConfig.options.appendData = true;
                            scrapeConfig.metadata.lastRunAt = new Date().toISOString();

                        }
                    } else {
                        // this is the first run with with new config
                        scrapeRuns.runs.unshift(runInst);
                        const response = await browser.runtime.sendMessage({ action: 'getTabUrl' });

                        // update URL in metadata
                        scrapeConfig.metadata.url = response.url;
                        scrapeConfig.metadata.selectorCount = selectors.length
                        scrapeConfig.metadata.lastRunAt = new Date().toISOString();

                        scrapeConfig.options.appendData = false;
                    }
                }
                if (scrapeConfig.options.appendData) {
                    extractedData.data = extractedData.data.concat(response.result);
                } else {
                    extractedData.data = response.result;
                }

                console.dir(extractedData.data);
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

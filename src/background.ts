import type { BackgroundRequest, ScrapeStatusLevel } from './types';

let sidebarOpen = false;

const scrapeRunPageCounters: { [runId: string]: number } = {};

export enum PaginationStateStatus {
    InProgress = 1,
    Complete,
    Failed,
}

async function navigateAndWait(tabId: number, url: string) {
    return new Promise((resolve, reject) => {
        // Check if tab is already at the target URL and loaded
        browser.tabs
            .get(tabId)
            .then((tab) => {
                if (tab.url === url && tab.status === 'complete') {
                    resolve(tab);
                    return;
                }

                let isNavigating = false;

                function listener(updatedTabId: number, changeInfo, tab) {
                    // Only respond to updates for our specific tab
                    if (updatedTabId !== tabId) return;

                    // Track when navigation starts
                    if (changeInfo.status === 'loading') {
                        isNavigating = true;
                    }

                    // Only resolve when:
                    // 1. We've seen the navigation start, AND
                    // 2. The status is complete, AND
                    // 3. The URL matches what we requested
                    if (isNavigating && changeInfo.status === 'complete' && tab.url === url) {
                        browser.tabs.onUpdated.removeListener(listener);
                        resolve(tab);
                    }
                }

                // Attach listener BEFORE initiating navigation
                browser.tabs.onUpdated.addListener(listener);

                // Now trigger the navigation
                browser.tabs.update(tabId, { url }).catch((err) => {
                    browser.tabs.onUpdated.removeListener(listener);
                    reject(err);
                });
            })
            .catch(reject);
    });
}

// Listen for a click on the browser action icon.
browser.browserAction.onClicked.addListener(() => {
    // Toggle the sidebar's open state.
    if (sidebarOpen) {
        browser.sidebarAction.close();
    } else {
        browser.sidebarAction.open();
    }
    // Update the state variable.
    sidebarOpen = !sidebarOpen;
});

browser.runtime.onMessage.addListener(async (request: BackgroundRequest) => {
    if (request.action === 'getTabUrl') {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id) {
            return { url: tab.url, title: tab.title };
        }
    } else if (request.action === 'pageNavigate') {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id && tab?.url) {
            const pagination = request.config.pagination;
            const runId = request.configHash;

            // Initialize page counter for this run if not present
            if (!scrapeRunPageCounters[runId]) {
                scrapeRunPageCounters[runId] = 1;
            }

            const sendScrapeRunUpdate = async (
                currentPage: number | undefined,
                maxPages: number | undefined,
                status: ScrapeStatusLevel = 'in_progress',
            ) => {
                await browser.runtime.sendMessage({
                    action: 'updateScrapeRun',
                    runId,
                    url: tab.url,
                    currentPage,
                    maxPages,
                    status,
                });
            };

            if (pagination.mode === 'links') {
                const idx = pagination.pageLinks.findIndex((elem: string) => elem === tab.url);
                let next_idx = 0;
                if (idx + 1 < pagination.pageLinks.length) {
                    next_idx = idx + 1;
                } else {
                    console.log(`Finished processing pages`);
                    await sendScrapeRunUpdate(idx, pagination.pageLinks.length, 'completed');
                    delete scrapeRunPageCounters[runId];
                    return { paginationStatus: PaginationStateStatus.Complete };
                }
                const nextURL = pagination.pageLinks[next_idx];
                await sendScrapeRunUpdate(idx, pagination.pageLinks.length, 'completed');
                scrapeRunPageCounters[runId]++;
                await sendScrapeRunUpdate(next_idx, pagination.pageLinks.length, 'in_progress');
                await navigateAndWait(tab.id, nextURL);

                const newTab = await browser.tabs.get(tab.id);

                return {
                    paginationStatus:
                        tab.url === newTab?.url
                            ? PaginationStateStatus.Failed
                            : PaginationStateStatus.InProgress,
                };
            } else if (pagination.mode === 'next') {
                const currentPage = scrapeRunPageCounters[runId];
                const maxPages = pagination.maxPages;
                const currentBodyHash = await browser.tabs.sendMessage(tab.id, {
                    action: 'hashBody',
                });

                if (maxPages && maxPages !== 0 && currentPage >= maxPages) {
                    console.log(`Reached max pages (${maxPages}). Cannot navigate further.`);
                    await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                    delete scrapeRunPageCounters[runId];
                    return { paginationStatus: PaginationStateStatus.Complete };
                }

                await browser.tabs.sendMessage(tab.id, {
                    action: 'clickElement',
                    selector: pagination.nextSelector,
                });

                if (request.config.options.waitforNetworkIdle) {
                    await browser.tabs.sendMessage(tab.id, {
                        action: 'waitPageLoad',
                        timeout: request.config.options.timeoutMs,
                        options: { domStable: true },
                    });
                }

                const newTab = await browser.tabs.get(tab.id);

                if (newTab.url === tab.url) {
                    // TODO: check if this works
                    if (newTab?.id) {
                        const newBodyHash = await browser.tabs.sendMessage(tab.id, {
                            action: 'hashBody',
                        });

                        console.log(
                            `oldhash: ${currentBodyHash.bodyHash}, newHash: ${newBodyHash.bodyHash}`,
                        );
                        if (currentBodyHash.bodyHash === newBodyHash.bodyHash) {
                            await sendScrapeRunUpdate(currentPage, maxPages, 'errored');
                            delete scrapeRunPageCounters[runId];
                            return { paginationStatus: PaginationStateStatus.Failed };
                        }
                    }
                }

                await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                scrapeRunPageCounters[runId]++;
                await sendScrapeRunUpdate(scrapeRunPageCounters[runId], maxPages, 'in_progress');

                return { paginationStatus: PaginationStateStatus.InProgress };
            } else if (pagination.mode === 'template') {
                const currentTabUrl = tab.url;
                const { urlTemplate, startPage, increment, maxPages } = pagination;

                const currentIdx = scrapeRunPageCounters[runId];
                if (maxPages && maxPages !== 0 && currentIdx >= maxPages) {
                    console.log(`Reached max pages (${maxPages}). Cannot navigate further.`);
                    await sendScrapeRunUpdate(currentIdx, maxPages, 'completed');
                    delete scrapeRunPageCounters[runId]; // End this scrape run
                    return { paginationStatus: PaginationStateStatus.Complete };
                }

                // Escape special regex characters, then replace '{{page}}' with a digit capture group.
                const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const escapedTemplate = escapeRegExp(urlTemplate);
                const pageRegex = new RegExp(escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'));

                let currentPage = startPage;
                const match = currentTabUrl.match(pageRegex);
                if (match && match[1]) {
                    currentPage = parseInt(match[1], 10);
                }
                const nextPage = currentPage + increment;
                const nextURL = urlTemplate.replace('{{page}}', nextPage.toString());

                await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                scrapeRunPageCounters[runId]++;
                await sendScrapeRunUpdate(nextPage, maxPages, 'in_progress');

                await navigateAndWait(tab.id, nextURL);

                const newTab = await browser.tabs.get(tab.id);

                return {
                    paginationStatus:
                        tab.url === newTab.url
                            ? PaginationStateStatus.Failed
                            : PaginationStateStatus.InProgress,
                };
            } else {
                console.log('Not implemented');
            }
        }
    }
});

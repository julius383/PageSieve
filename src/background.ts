import type { BackgroundRequest, ScrapeStatusLevel } from './types';

let sidebarOpen = false;

let scrapeRunPageCounters: { [runId: string]: number } = {};

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

                function listener(
                    updatedTabId: number,
                    changeInfo: browser.tabs._OnUpdatedChangeInfo,
                    tab: browser.tabs.Tab,
                ) {
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

async function waitForTabLoad(tabId: number, timeout: number = 10000): Promise<browser.tabs.Tab> {
    // First, check if the tab is already loaded.
    const tab = await browser.tabs.get(tabId);
    if (tab.status === 'complete') {
        return tab;
    }

    return new Promise((resolve, reject) => {
        type ListenerType = ((updatedTabId: number, changeInfo: browser.tabs._OnUpdatedChangeInfo) => void);
        let listener: ListenerType | undefined = undefined;

        const timeoutId = setTimeout(() => {
            if (listener) {
                browser.tabs.onUpdated.removeListener(listener);
            }
            reject(new Error(`Tab with id ${tabId} did not finish loading within ${timeout}ms.`));
        }, timeout);

        listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                clearTimeout(timeoutId);
                browser.tabs.onUpdated.removeListener(listener as ListenerType);
                // The 'tab' object from the listener might be incomplete, so we get it again.
                browser.tabs.get(tabId).then(resolve);
            }
        };

        browser.tabs.onUpdated.addListener(listener);
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
    } else if (request.action === 'logMessage') {
        console.log('[content] ' + request.message);
        return;
    } else if (request.action === 'pageNavigate') {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id && tab?.url) {
            const pagination = request.config.pagination;
            const runId = request.configHash;
            const testing = request.testing;

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
            if (pagination.mode === 'none') {
                console.log(`Finished processing pages`);
                await sendScrapeRunUpdate(1, 1, 'completed');
                delete scrapeRunPageCounters[runId];
                return { paginationStatus: PaginationStateStatus.Complete };
            } else if (pagination.mode === 'links') {
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

                if (testing) {
                    scrapeRunPageCounters = {};
                }

                return {
                    paginationStatus:
                        tab.url === newTab?.url
                            ? PaginationStateStatus.Failed
                            : PaginationStateStatus.InProgress,
                };
            } else if (pagination.mode === 'next') {
                const currentPage = scrapeRunPageCounters[runId];
                const maxPages = pagination.maxPages;

                if (maxPages && maxPages !== 0 && currentPage === maxPages) {
                    await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                    delete scrapeRunPageCounters[runId];
                    return { paginationStatus: PaginationStateStatus.Complete };
                }

                const currentBodyHash = await browser.tabs.sendMessage(tab.id, {
                    action: 'hashBody',
                });

                // Promise that resolves if the content script reports a successful SPA update.
                const spaPromise = browser.tabs
                    .sendMessage(tab.id, {
                        action: 'clickAndWaitForStable',
                        selector: pagination.nextSelector,
                        timeout: request.config.options.timeoutMs,
                    }).then(v => { return {type: 'spa', ...v }})
                    .catch((e) => ({ type: 'error', error: e }));

                // Promise that resolves if a traditional navigation starts.
                const navPromise = new Promise((resolve) => {
                    const listener = (
                        updatedTabId: number,
                        changeInfo: browser.tabs._OnUpdatedChangeInfo,
                    ) => {
                        // Check for the 'loading' status which indicates the start of a navigation.
                        if (updatedTabId === tab.id && changeInfo.status === 'loading') {
                            browser.tabs.onUpdated.removeListener(listener);
                            resolve({ type: 'navigation' });
                        }
                    };
                    browser.tabs.onUpdated.addListener(listener);
                });

                type NavResult =
                    | { type: 'navigation'; }
                    | { type: 'error'; error: Error; }
                    | { type: 'spa'; success: boolean; error?: string };
                // Race the two promises to see which event happens first.
                const result: NavResult = await Promise.race([spaPromise, navPromise]);

                if (result.type === 'navigation') {
                    console.log('Navigation detected, waiting for page load...');
                    try {
                        await waitForTabLoad(tab.id, request.config.options.timeoutMs);
                    } catch (navError) {
                        if (navError instanceof Error) {
                            console.error(
                                `Full page navigation failed to complete: ${navError.message}`,
                            );
                            await sendScrapeRunUpdate(currentPage, maxPages, 'errored');
                            delete scrapeRunPageCounters[runId];
                            return { paginationStatus: PaginationStateStatus.Failed };
                        }
                    }
                } else if (result.type == "spa"){
                    const waitStatus = result;
                    if (!waitStatus.success) {
                        console.log(
                            `'clickAndWaitForStable' failed, assuming end of pagination. Error: ${waitStatus.error}`,
                        );
                        await sendScrapeRunUpdate(currentPage, maxPages, 'errored');
                        delete scrapeRunPageCounters[runId];
                        return { paginationStatus: PaginationStateStatus.Failed };
                    }

                    const newBodyHash = await browser.tabs.sendMessage(tab.id, {
                        action: 'hashBody',
                    });

                    if (currentBodyHash.bodyHash === newBodyHash.bodyHash) {
                        console.log('Body hash is the same, assuming end of pagination.');
                        await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                        delete scrapeRunPageCounters[runId];
                        return { paginationStatus: PaginationStateStatus.Complete };
                    }
                } else {
                        console.log(
                            `Single page pagination failed with the error ${result.error}`,
                        );
                        await sendScrapeRunUpdate(currentPage, maxPages, 'errored');
                        delete scrapeRunPageCounters[runId];
                        return { paginationStatus: PaginationStateStatus.Failed };
                }

                await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                scrapeRunPageCounters[runId]++;
                await sendScrapeRunUpdate(scrapeRunPageCounters[runId], maxPages, 'in_progress');

                if (testing) {
                    scrapeRunPageCounters = {};
                }

                return { paginationStatus: PaginationStateStatus.InProgress };
            } else if (pagination.mode === 'template') {
                const currentTabUrl = tab.url;
                const { urlTemplate, startPage, increment, maxPages } = pagination;

                const currentIdx = scrapeRunPageCounters[runId];
                if (maxPages && maxPages !== 0 && currentIdx === maxPages) {
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

                if (testing) {
                    scrapeRunPageCounters = {};
                }

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

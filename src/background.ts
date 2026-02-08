import type { BackgroundRequest, ScrapeStatusLevel } from "./types";

let sidebarOpen = false;

const scrapeRunPageCounters: { [runId: string]: number } = {};

async function navigateAndWait(tabId: number, url: string) {
  return new Promise((resolve, reject) => {
    function listener(updatedTabId: number, changeInfo, tab) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        browser.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    }

    browser.tabs.onUpdated.addListener(listener);

    browser.tabs.update(tabId, { url }).catch(err => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(err);
    });
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
            const runId =  request.configHash;

            // Initialize page counter for this run if not present
            if (!scrapeRunPageCounters[runId]) {
                scrapeRunPageCounters[runId] = 1;
            }

            const sendScrapeRunUpdate = async (currentPage: number | undefined, maxPages: number | undefined, status: ScrapeStatusLevel = 'in_progress') => {
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
                const idx = pagination.pageLinks.findIndex((elem: string) => elem === tab.url)
                let next_idx = 0
                if (idx + 1 < pagination.pageLinks.length) {
                    next_idx = idx + 1
                }
                const nextURL = pagination.pageLinks[next_idx];
                await sendScrapeRunUpdate(idx + 1, pagination.pageLinks.length, 'completed');

                await navigateAndWait(tab.id, nextURL)

                if (request.config.options.waitforNetworkIdle) {
                    await browser.tabs.sendMessage(tab.id, {action: 'waitForPageLoad', timeout: request.config.options.timeoutMs});
                }

                const [newTab] = await browser.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                await sendScrapeRunUpdate(next_idx + 1, pagination.pageLinks.length, 'in_progress');
                scrapeRunPageCounters[runId]++

                return { previousURL: tab.url, currentURL: newTab.url};


            } else if (pagination.mode === 'next') {
                const currentPage = scrapeRunPageCounters[runId];
                const maxPages = pagination.maxPages;
                const currentBodyHash = await browser.tabs.sendMessage(tab.id, {action: 'hashBody'});

                if (maxPages && maxPages !== 0 && currentPage > maxPages) {
                    console.log(`Reached max pages (${maxPages}). Cannot navigate further.`);
                    await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                    delete scrapeRunPageCounters[runId]; // End this scrape run
                    return { previousURL: tab.url, currentURL: null };
                }

                await browser.tabs.sendMessage(tab.id, {action: 'clickElement', selector: pagination.nextSelector});

                if (request.config.options.waitforNetworkIdle) {
                    await browser.tabs.sendMessage(tab.id, {action: 'waitPageLoad', timeout: request.config.options.timeoutMs});
                }

                const [newTab] = await browser.tabs.query({
                    active: true,
                    currentWindow: true,
                });

                if (newTab.url === tab.url) {
                    // TODO: check if this works
                    if (newTab?.id) {
                        const newBodyHash = await browser.tabs.sendMessage(tab.id, {action: 'hashBody'});

                        console.log(`oldhash: ${currentBodyHash.bodyHash}, newHash: ${newBodyHash.bodyHash}`);
                        if (currentBodyHash.bodyHash === newBodyHash.bodyHash) {
                            await sendScrapeRunUpdate(currentPage, maxPages, 'errored');
                            delete scrapeRunPageCounters[runId];
                            return { previousURL: tab.url, currentURL: null };
                        }
                        console.log('Page content changed');
                    }
                }

                await sendScrapeRunUpdate(currentPage, maxPages, 'completed');
                scrapeRunPageCounters[runId]++;
                await sendScrapeRunUpdate(scrapeRunPageCounters[runId], maxPages, 'in_progress');

                return { previousURL: tab.url, currentURL: newTab.url};
            } else if (pagination.mode === 'template') {
                const currentTabUrl = tab.url;
                const { urlTemplate, startPage, increment, maxPages } = pagination;

                const currentIdx = scrapeRunPageCounters[runId];
                // FIXME: centralize this method
                if (maxPages && maxPages !== 0 && currentIdx > maxPages) {
                    console.log(`Reached max pages (${maxPages}). Cannot navigate further.`);
                    await sendScrapeRunUpdate(currentIdx, maxPages, 'completed');
                    delete scrapeRunPageCounters[runId]; // End this scrape run
                    return { previousURL: tab.url, currentURL: null };
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

                await navigateAndWait(tab.id, nextURL)

                if (request.config.options.waitforNetworkIdle) {
                    await browser.tabs.sendMessage(tab.id, {action: 'waitForPageLoad', timeout: request.config.options.timeoutMs});
                }

                const [newTab] = await browser.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                return { previousURL: tab.url, currentURL: newTab.url };
            } else {
                console.log('Not implemented');

            }
        }
    }
});

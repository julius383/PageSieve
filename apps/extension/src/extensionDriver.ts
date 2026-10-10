import { fromPromise } from 'xstate';
import { ScrapeActorDriver } from '@pagesieve/core/scrapeMachine';
import { type ExtractedGroup, PaginationStateStatus } from '@pagesieve/core/types';

/*  implements timed retry in cases where content script in yet to be injected into
 *  page such as when navigation just finished
 */
async function sendMessageWithRetry<T = unknown>(
    tabId: number,
    message: unknown,
    timeoutMs: number = 5000,
): Promise<T> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            return (await browser.tabs.sendMessage(tabId, message)) as T;
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            if (
                errMsg.includes('Receiving end does not exist') ||
                errMsg.includes('Could not establish connection')
            ) {
                await new Promise((r) => setTimeout(r, 100));
                continue;
            }
            throw err;
        }
    }
    throw new Error('Connection to content script timed out: Receiving end does not exist');
}

async function getActiveTab(): Promise<browser.tabs.Tab & { id: number; url: string }> {
    const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
    });
    if (!(tab?.id && tab?.url)) throw new Error('Cannot access tab');
    return tab as browser.tabs.Tab & { id: number; url: string };
}

// navigation helper supporting both explicit URL updates and in-flight navigations
async function navigateTab(
    tabId: number,
    url?: string,
    timeoutMs: number = 30000,
): Promise<browser.tabs.Tab> {
    const tab = await browser.tabs.get(tabId);
    const normalize = (u: string) => u.replace(/\/$/, '').split('#')[0];

    if (url && normalize(tab.url || '') === normalize(url) && tab.status === 'complete') {
        return tab;
    }
    if (!url && tab.status === 'complete') {
        return tab;
    }

    return new Promise((resolve, reject) => {
        let isNavigating = !url;

        const timeoutId = setTimeout(() => {
            browser.tabs.onUpdated.removeListener(listener);
            reject(
                new Error(`Navigation ${url ? `to ${url} ` : ''}timed out after ${timeoutMs}ms`),
            );
        }, timeoutMs);

        const listener = (
            updatedTabId: number,
            changeInfo: browser.tabs._OnUpdatedChangeInfo,
            updatedTab: browser.tabs.Tab,
        ) => {
            if (updatedTabId !== tabId) return;
            if (changeInfo.status === 'loading') isNavigating = true;

            if (isNavigating && changeInfo.status === 'complete') {
                if (!url || normalize(updatedTab.url || '') === normalize(url)) {
                    clearTimeout(timeoutId);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve(updatedTab);
                }
            }
        };

        browser.tabs.onUpdated.addListener(listener, { tabId });

        if (url) {
            browser.tabs.update(tabId, { url }).catch((err) => {
                clearTimeout(timeoutId);
                browser.tabs.onUpdated.removeListener(listener);
                reject(err);
            });
        }
    });
}

export const extensionDriver: ScrapeActorDriver = {
    waitForSelector: fromPromise(async ({ input }) => {
        const { selector, timeout } = input;
        const tab = await getActiveTab();

        const startTime = Date.now();
        const remainingTimeout = Math.max(1000, timeout - (Date.now() - startTime));
        const response = await sendMessageWithRetry<{
            success?: boolean;
            succeeded?: boolean;
            error?: string;
        }>(
            tab.id,
            {
                action: 'waitForSelector',
                selector,
                timeout: remainingTimeout,
            },
            timeout,
        );

        if (!response || !response.success) {
            throw new Error(response?.error || `Timed out waiting for "${selector}"`);
        }
        return { succeeded: true };
    }),
    extractData: fromPromise(async ({ input }) => {
        const tab = await getActiveTab();
        const response = await sendMessageWithRetry<{
            success: boolean;
            result?: ExtractedGroup[];
            error?: string;
        }>(tab.id, {
            action: 'extractData',
            selectors: input.selectors,
        });
        if (!response.success) throw new Error(response.error);
        return (response.result || []) as ExtractedGroup[];
    }),
    computePageHash: fromPromise(async ({ input }) => {
        const tab = await getActiveTab();
        return await sendMessageWithRetry<{ bodyHash: string }>(tab.id, {
            action: 'computePageHash',
            selectors: input.selectors,
        });
    }),
    navigate: fromPromise(async ({ input }) => {
        const { config } = input;
        const tab = await browser.tabs.create({});
        if (!tab?.id) throw new Error('Cannot access tab');
        await navigateTab(tab.id, config.url, config.options.timeoutMs);
        return { status: PaginationStateStatus.InProgress, url: config.url };
    }),
    navigateLinks: fromPromise(async ({ input }) => {
        const { config, currentURL } = input;
        const tab = await getActiveTab();
        const pagination = config.pagination;
        if (pagination.mode == 'links') {
            const idx = pagination.pageLinks.findIndex((url: string) => url === currentURL);
            if (idx + 1 >= pagination.pageLinks.length) {
                return { status: PaginationStateStatus.Complete, url: currentURL };
            }
            // handles when idx === -1 as it starts from 0 after aadding
            const nextURL = pagination.pageLinks[idx + 1];
            await navigateTab(tab.id, nextURL, config.options.timeoutMs);
            return { status: PaginationStateStatus.InProgress, url: nextURL };
        } else {
            throw new Error(`Unable to navigate to Next Link using pagination: ${pagination.mode}`);
        }
    }),
    navigateTemplate: fromPromise(async ({ input }) => {
        const { config, currentURL } = input;
        const tab = await getActiveTab();
        const pagination = config.pagination;
        if (pagination.mode == 'template') {
            const { urlTemplate, startPage, increment } = pagination;

            const escapedTemplate = urlTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pageRegex = new RegExp(escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'));

            let currentPageNum = startPage;
            const match = (currentURL || '').match(pageRegex);
            if (match && match[1]) currentPageNum = parseInt(match[1], 10);

            const nextURL = urlTemplate.replace(
                '{{page}}',
                (currentPageNum + increment).toString(),
            );
            await navigateTab(tab.id, nextURL, config.options.timeoutMs);
            return { status: PaginationStateStatus.InProgress, url: nextURL };
        } else {
            throw new Error(
                `Unable to navigate with template using pagination: ${pagination.mode}`,
            );
        }
    }),
    navigateNext: fromPromise(async ({ input }) => {
        const { config, currentURL } = input;
        const tab = await getActiveTab();

        const pagination = config.pagination;
        console.debug('Attempting next pagination');
        if (pagination.mode == 'next') {
            let listener:
                ((tid: number, info: browser.tabs._OnUpdatedChangeInfo) => void) | undefined;

            const navPromise = new Promise<{ type: 'navigation'; url: string }>((resolve) => {
                listener = (tid: number, info: browser.tabs._OnUpdatedChangeInfo) => {
                    if (tid === tab.id && info.status === 'loading') {
                        resolve({ type: 'navigation', url: info.url || '' });
                    }
                };
                browser.tabs.onUpdated.addListener(listener);
            });

            const spaPromise = sendMessageWithRetry<object>(tab.id, {
                action: 'clickAndWaitForStable',
                selector: pagination.nextSelector,
                timeout: config.options.timeoutMs,
            }).then((v) => ({ type: 'spa' as const, ...v }));

            try {
                const result = await Promise.race([spaPromise, navPromise]);

                if (result.type === 'navigation') {
                    console.debug('Using navigation for next pagination');
                    const newTab = await navigateTab(tab.id, undefined, config.options.timeoutMs);
                    return {
                        type: 'navigation',
                        status: PaginationStateStatus.InProgress,
                        url: newTab.url || result.url,
                    };
                } else {
                    console.debug('Using SPA for next pagination');
                    const res = result as { success: boolean; error?: string };
                    if (!res.success) {
                        throw new Error(res.error || 'SELECTOR NOT FOUND');
                    }
                    return {
                        type: 'spa',
                        status: PaginationStateStatus.InProgress,
                        url: currentURL,
                    };
                }
            } finally {
                if (listener) {
                    browser.tabs.onUpdated.removeListener(listener);
                }
            }
        } else {
            console.debug(`Unable to navigate with next using pagination: ${pagination.mode}`);
            throw new Error(`Unable to navigate with next using pagination: ${pagination.mode}`);
        }
    }),
};

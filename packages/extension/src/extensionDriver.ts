import { fromPromise } from 'xstate';
import { ScrapeActorDriver } from '@pagesieve/core/scrapeMachine';
import { type ExtractedGroup, PaginationStateStatus } from '@pagesieve/core/types';
import { navigateAndWait, waitForTabLoad } from '@/ui/sidebar/util';

export const extensionDriver: ScrapeActorDriver = {
    extractData: fromPromise(async ({ input }) => {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!(tab?.id && tab?.url)) throw new Error('Cannot access tab');
        const response = await browser.tabs.sendMessage(tab.id, {
            action: 'extractData',
            selectors: input.selectors,
        });
        if (!response.success) throw new Error(response.error);
        return response.result as ExtractedGroup[];
    }),
    computePageHash: fromPromise(async ({ input }) => {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!(tab?.id && tab?.url)) throw new Error('Cannot access tab');
        return await browser.tabs.sendMessage(tab.id, {
            action: 'computePageHash',
            selectors: input.selectors,
        });
    }),
    navigateLinks: fromPromise(async ({ input }) => {
        const { config, currentURL } = input;
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!(tab?.id && tab?.url)) throw new Error('Cannot access tab');
        const pagination = config.pagination;
        if (pagination.mode == 'links') {
            const idx = pagination.pageLinks.findIndex((url: string) => url === currentURL);
            if (idx === -1 || idx + 1 >= pagination.pageLinks.length) {
                return { status: PaginationStateStatus.Complete, url: currentURL };
            }
            const nextURL = pagination.pageLinks[idx + 1];
            await navigateAndWait(tab.id, nextURL, config.options.timeoutMs);
            return { status: PaginationStateStatus.InProgress, url: nextURL };
        } else {
            throw new Error(`Unable to navigate to Next Link using pagination: ${pagination.mode}`);
        }
    }),
    navigateTemplate: fromPromise(async ({ input }) => {
        const { config, currentURL } = input;
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!(tab?.id && tab?.url)) throw new Error('Cannot access tab');
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
            await navigateAndWait(tab.id, nextURL, config.options.timeoutMs);
            return { status: PaginationStateStatus.InProgress, url: nextURL };
        } else {
            throw new Error(
                `Unable to navigate with template using pagination: ${pagination.mode}`,
            );
        }
    }),
    navigateNext: fromPromise(async ({ input }) => {
        const { config, currentURL } = input;
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!(tab?.id && tab?.url)) throw new Error('Cannot access tab');

        const pagination = config.pagination;
        console.debug('Attempting next pagination');
        if (pagination.mode == 'next') {
            let listener:
                | ((tid: number, info: browser.tabs._OnUpdatedChangeInfo) => void)
                | undefined;

            const navPromise = new Promise<{ type: 'navigation'; url: string }>((resolve) => {
                listener = (tid: number, info: browser.tabs._OnUpdatedChangeInfo) => {
                    if (tid === tab.id && info.status === 'loading') {
                        resolve({ type: 'navigation', url: info.url || '' });
                    }
                };
                browser.tabs.onUpdated.addListener(listener);
            });

            const spaPromise = browser.tabs
                .sendMessage(tab.id, {
                    action: 'clickAndWaitForStable',
                    selector: pagination.nextSelector,
                    timeout: config.options.timeoutMs,
                })
                .then((v) => ({ type: 'spa' as const, ...v }));

            try {
                const result = await Promise.race([spaPromise, navPromise]);

                if (result.type === 'navigation') {
                    console.debug('Using navigation for next pagination');
                    const newTab = await waitForTabLoad(tab.id, config.options.timeoutMs);
                    // return { type: 'navigation', url: newTab.url || result.url };
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
                    // return { status: PaginationStateStatus.InProgress, url: currentURL };
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

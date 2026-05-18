import { setup, assign, fromPromise } from 'xstate';
import type { ScrapeConfig, SelectorGroup } from './schema';
import { PaginationStateStatus, type ExtractedGroup } from './types';
import { navigateAndWait, waitForTabLoad } from './sidebar/util';

export interface ScrapeContext {
    config: ScrapeConfig;
    tabId: number;
    currentURL: string;
    results: ExtractedGroup[];
    error: string | null;
    currentPage: number;
    maxPages: number | undefined;
    bodyHash?: string;
    retries: number;
    isTesting: boolean;
}

type ScrapeEvent =
    | { type: 'START' }
    | { type: 'STOP' }
    | { type: 'RETRY' }
    | { type: 'TEST_PAGINATION' };

interface InputType {
    config: ScrapeConfig;
    tabId: number;
    tabURL: string;
}

export const scrapeMachine = setup({
    types: {} as {
        context: ScrapeContext;
        events: ScrapeEvent;
        input: InputType;
    },
    delays: {
        DELAY_MS: ({ context }) => context.config.options.delayMs,
    },
    guards: {
        hasPagination: ({ context }) => context.config.pagination.mode !== 'none',
        isMaxPagesReached: ({ context }) => {
            const maxPages =
                'maxPages' in context.config.pagination ? context.config.pagination.maxPages : 0;
            return !!(maxPages && maxPages !== 0 && context.currentPage >= maxPages);
        },
        canRetry: ({ context }) => context.retries < (context.config.options.maxRetries ?? 2),
    },
    actors: {
        triggerExtraction: fromPromise<
            ExtractedGroup[],
            { tabId: number; selectors: SelectorGroup[] }
        >(async ({ input }) => {
            const response = await browser.tabs.sendMessage(input.tabId, {
                action: 'extractData',
                selectors: input.selectors,
            });
            if (!response.success) throw new Error(response.error);
            return response.result as ExtractedGroup[];
        }),
        triggerHashBody: fromPromise<{ bodyHash: string }, { tabId: number }>(async ({ input }) => {
            return await browser.tabs.sendMessage(input.tabId, {
                action: 'hashBody',
            });
        }),
        navigateLinks: fromPromise<
            { status: PaginationStateStatus; url: string },
            { tabId: number; config: ScrapeConfig; currentURL: string }
        >(async ({ input }) => {
            const { tabId, config, currentURL } = input;
            const pagination = config.pagination;
            if (pagination.mode == 'links') {
                const idx = pagination.pageLinks.findIndex((url: string) => url === currentURL);
                if (idx === -1 || idx + 1 >= pagination.pageLinks.length) {
                    return { status: PaginationStateStatus.Complete, url: currentURL };
                }
                const nextURL = pagination.pageLinks[idx + 1];
                await navigateAndWait(tabId, nextURL, config.options.timeoutMs);
                return { status: PaginationStateStatus.InProgress, url: nextURL };
            } else {
                throw new Error(
                    `Unable to navigate to Next Link using pagination: ${pagination.mode}`,
                );
            }
        }),
        navigateTemplate: fromPromise<
            { status: PaginationStateStatus; url: string },
            { tabId: number; config: ScrapeConfig; currentURL: string }
        >(async ({ input }) => {
            const { tabId, config, currentURL } = input;
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
                await navigateAndWait(tabId, nextURL, config.options.timeoutMs);
                return { status: PaginationStateStatus.InProgress, url: nextURL };
            } else {
                throw new Error(
                    `Unable to navigate with template using pagination: ${pagination.mode}`,
                );
            }
        }),
        navigateNext: fromPromise<
            { type: 'spa' | 'navigation'; url: string },
            { tabId: number; config: ScrapeConfig; currentURL: string }
        >(async ({ input }) => {
            const { tabId, config, currentURL } = input;

            const pagination = config.pagination;
            if (pagination.mode == 'next') {
                let listener:
                    | ((tid: number, info: browser.tabs._OnUpdatedChangeInfo) => void)
                    | undefined;

                const navPromise = new Promise<{ type: 'navigation'; url: string }>((resolve) => {
                    listener = (tid: number, info: browser.tabs._OnUpdatedChangeInfo) => {
                        if (tid === tabId && info.status === 'loading') {
                            resolve({ type: 'navigation', url: info.url || '' });
                        }
                    };
                    browser.tabs.onUpdated.addListener(listener);
                });

                const spaPromise = browser.tabs
                    .sendMessage(tabId, {
                        action: 'clickAndWaitForStable',
                        selector: pagination.nextSelector,
                        timeout: config.options.timeoutMs,
                    })
                    .then((v) => ({ type: 'spa' as const, ...v }));

                try {
                    const result = await Promise.race([spaPromise, navPromise]);

                    if (result.type === 'navigation') {
                        const tab = await waitForTabLoad(tabId, config.options.timeoutMs);
                        return { type: 'navigation', url: tab.url || result.url };
                    } else {
                        const res = result as { success: boolean; error?: string };
                        if (!res.success) throw new Error(res.error || 'SPA click failed');
                        return { type: 'spa', url: currentURL };
                    }
                } finally {
                    if (listener) {
                        browser.tabs.onUpdated.removeListener(listener);
                    }
                }
            } else {
                throw new Error(
                    `Unable to navigate with next using pagination: ${pagination.mode}`,
                );
            }
        }),
    },
    actions: {
        saveResults: assign({
            results: ({ context, event }) => {
                const newResults = (event as unknown as { output: ExtractedGroup[] }).output;
                if (!context.config.options.appendData) return newResults;

                const updatedResults = [...context.results];
                newResults.forEach((newGroup) => {
                    const existingGroup = updatedResults.find((g) => g.id === newGroup.id);
                    if (existingGroup) {
                        existingGroup.results = [...existingGroup.results, ...newGroup.results];
                    } else {
                        updatedResults.push(newGroup);
                    }
                });
                return updatedResults;
            },
        }),
        incrementPage: assign({
            currentPage: ({ context }) => context.currentPage + 1,
        }),
        updateURL: assign({
            currentURL: ({ event }) => (event as unknown as { output: { url: string } }).output.url,
        }),
        incrementRetry: assign({
            retries: ({ context }) => context.retries + 1,
        }),
        resetRetries: assign({
            retries: 0,
        }),
    },
}).createMachine({
    id: 'scraper',
    initial: 'idle',
    context: ({ input }) => ({
        config: input.config,
        tabId: input.tabId,
        currentURL: input.tabURL,
        results: [] as ExtractedGroup[],
        error: null,
        currentPage: 1,
        retries: 0,
        isTesting: false,
        maxPages:
            'maxPages' in input.config.pagination ? input.config.pagination.maxPages : undefined,
    }),
    on: {
        STOP: { target: '.idle' },
    },
    states: {
        idle: {
            on: {
                START: 'extracting',
                TEST_PAGINATION: {
                    target: 'navigating',
                    actions: assign({ isTesting: true }),
                },
            },
        },
        extracting: {
            invoke: {
                src: 'triggerExtraction',
                input: ({ context }) => ({
                    tabId: context.tabId,
                    selectors: context.config.selectors,
                }),
                onDone: [
                    {
                        guard: 'hasPagination',
                        target: 'waiting',
                        actions: ['saveResults', 'resetRetries'],
                    },
                    {
                        target: 'completed',
                        actions: ['saveResults', 'resetRetries'],
                    },
                ],
                onError: [
                    {
                        guard: 'canRetry',
                        target: 'retrying',
                        actions: 'incrementRetry',
                    },
                    {
                        target: 'errored',
                        actions: assign({
                            error: ({ event }) => (event.error as Error).message,
                        }),
                    },
                ],
            },
        },
        retrying: {
            after: {
                DELAY_MS: 'extracting',
            },
        },
        waiting: {
            after: {
                DELAY_MS: [
                    { guard: 'isMaxPagesReached', target: 'completed' },
                    { target: 'navigating' },
                ],
            },
        },
        navigating: {
            initial: 'deciding',
            states: {
                deciding: {
                    always: [
                        {
                            guard: ({ context }) => context.config.pagination.mode === 'links',
                            target: 'links',
                        },
                        {
                            guard: ({ context }) => context.config.pagination.mode === 'template',
                            target: 'template',
                        },
                        {
                            guard: ({ context }) => context.config.pagination.mode === 'next',
                            target: 'next',
                        },
                    ],
                },
                links: {
                    invoke: {
                        src: 'navigateLinks',
                        input: ({ context }) => ({
                            tabId: context.tabId,
                            config: context.config,
                            currentURL: context.currentURL,
                        }),
                        onDone: [
                            {
                                guard: ({ context }) => context.isTesting,
                                target: '#scraper.completed',
                                actions: ['incrementPage', 'updateURL', 'resetRetries'],
                            },
                            {
                                guard: ({ event }) =>
                                    event.output.status === PaginationStateStatus.Complete,
                                target: '#scraper.completed',
                            },
                            {
                                target: '#scraper.extracting',
                                actions: ['incrementPage', 'updateURL', 'resetRetries'],
                            },
                        ],
                        onError: [
                            {
                                guard: 'canRetry',
                                target: '#scraper.navigating.retryingNav',
                                actions: 'incrementRetry',
                            },
                            { target: '#scraper.errored' },
                        ],
                    },
                },
                template: {
                    invoke: {
                        src: 'navigateTemplate',
                        input: ({ context }) => ({
                            tabId: context.tabId,
                            config: context.config,
                            currentURL: context.currentURL,
                        }),
                        onDone: [
                            {
                                guard: ({ context }) => context.isTesting,
                                target: '#scraper.completed',
                                actions: ['incrementPage', 'updateURL', 'resetRetries'],
                            },
                            {
                                target: '#scraper.extracting',
                                actions: ['incrementPage', 'updateURL', 'resetRetries'],
                            },
                        ],
                        onError: [
                            {
                                guard: 'canRetry',
                                target: '#scraper.navigating.retryingNav',
                                actions: 'incrementRetry',
                            },
                            { target: '#scraper.errored' },
                        ],
                    },
                },
                next: {
                    initial: 'hashingBefore',
                    states: {
                        hashingBefore: {
                            invoke: {
                                src: 'triggerHashBody',
                                input: ({ context }) => ({ tabId: context.tabId }),
                                onDone: {
                                    target: 'clicking',
                                    actions: assign({
                                        bodyHash: ({ event }) =>
                                            (event as unknown as { output: { bodyHash: string } })
                                                .output.bodyHash,
                                    }),
                                },
                                onError: '#scraper.errored',
                            },
                        },
                        clicking: {
                            invoke: {
                                src: 'navigateNext',
                                input: ({ context }) => ({
                                    tabId: context.tabId,
                                    config: context.config,
                                    currentURL: context.currentURL,
                                }),
                                onDone: [
                                    {
                                        guard: ({ context, event }) =>
                                            event.output.type === 'navigation' && context.isTesting,
                                        target: '#scraper.completed',
                                        actions: ['incrementPage', 'updateURL', 'resetRetries'],
                                    },
                                    {
                                        guard: ({ event }) => event.output.type === 'navigation',
                                        target: '#scraper.extracting',
                                        actions: ['incrementPage', 'updateURL', 'resetRetries'],
                                    },
                                    { target: 'hashingAfter' },
                                ],
                                onError: [
                                    {
                                        guard: 'canRetry',
                                        target: '#scraper.navigating.retryingNav',
                                        actions: 'incrementRetry',
                                    },
                                    { target: '#scraper.errored' },
                                ],
                            },
                        },
                        hashingAfter: {
                            invoke: {
                                src: 'triggerHashBody',
                                input: ({ context }) => ({ tabId: context.tabId }),
                                onDone: [
                                    {
                                        guard: ({ context, event }) =>
                                            context.bodyHash ===
                                            (event as unknown as { output: { bodyHash: string } })
                                                .output.bodyHash,
                                        target: '#scraper.completed',
                                    },
                                    {
                                        guard: ({ context }) => context.isTesting,
                                        target: '#scraper.completed',
                                        actions: ['incrementPage', 'resetRetries'],
                                    },
                                    {
                                        target: '#scraper.extracting',
                                        actions: ['incrementPage', 'resetRetries'],
                                    },
                                ],
                                onError: '#scraper.errored',
                            },
                        },
                    },
                },
                retryingNav: {
                    after: {
                        DELAY_MS: 'deciding',
                    },
                },
            },
        },
        completed: {
            type: 'final',
        },
        errored: {
            on: {
                RETRY: 'extracting',
                STOP: 'idle',
            },
        },
    },
});

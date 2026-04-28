import { setup, assign, fromPromise } from 'xstate';
import type { ScrapeConfig, SelectorGroup } from './schema';
import { PaginationStateStatus, type ExtractedGroup } from './types';
import { navigateAndWait, waitForTabLoad } from './sidebar/util';

interface ScrapeContext {
    config: ScrapeConfig;
    tabId: number;
    currentURL: string;
    results: ExtractedGroup[];
    error: string | null;
    currentPage: number;
    maxPages: number | undefined;
    bodyHash?: string;
}

type ScrapeEvent = { type: 'START' } | { type: 'STOP' } | { type: 'RETRY' };

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
            const tab = await browser.tabs.get(tabId);
            const pagination = config.pagination;
            if (pagination.mode == 'links') {
                const idx = pagination.pageLinks.findIndex((url: string) => url === tab.url);
                if (idx === -1 || idx + 1 >= pagination.pageLinks.length) {
                    return { status: PaginationStateStatus.Complete,  url: currentURL };
                }
                const nextURL = pagination.pageLinks[idx + 1];
                await navigateAndWait(tabId, nextURL);
                return { status: PaginationStateStatus.InProgress, url: nextURL };
            } else {
                throw new Error(
                    `Unable to navigate to Next Link using pagination: ${pagination.mode}`,
                );
            }
        }),
        navigateTemplate: fromPromise<
            { status: PaginationStateStatus, url: string },
            { tabId: number; config: ScrapeConfig }
        >(async ({ input }) => {
            const { tabId, config } = input;
            const tab = await browser.tabs.get(tabId);
            const pagination = config.pagination;
            if (pagination.mode == 'template') {
                const { urlTemplate, startPage, increment } = pagination;

                const escapedTemplate = urlTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pageRegex = new RegExp(escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'));

                let currentPageNum = startPage;
                const match = (tab.url || '').match(pageRegex);
                if (match && match[1]) currentPageNum = parseInt(match[1], 10);

                const nextURL = urlTemplate.replace(
                    '{{page}}',
                    (currentPageNum + increment).toString(),
                );
                await navigateAndWait(tabId, nextURL);
                return { status: PaginationStateStatus.InProgress, url: nextURL };
            } else {
                throw new Error(
                    `Unable to navigate with template using pagination: ${pagination.mode}`,
                );
            }
        }),
        navigateNext: fromPromise<
            { type: 'spa' | 'navigation' },
            { tabId: number; config: ScrapeConfig; currentURL: string }
        >(async ({ input }) => {
            const { tabId, config, currentURL } = input;

            const pagination = config.pagination;
            if (pagination.mode == 'next') {
                const spaPromise = browser.tabs
                    .sendMessage(tabId, {
                        action: 'clickAndWaitForStable',
                        selector: pagination.nextSelector,
                        timeout: config.options.timeoutMs,
                    })
                    .then((v) => ({ type: 'spa', ...v }));

                const navPromise = new Promise((resolve) => {
                    const listener = (tid: number, info: browser.tabs._OnUpdatedChangeInfo) => {
                        if (tid === tabId && info.status === 'loading') {
                            browser.tabs.onUpdated.removeListener(listener);
                            resolve({ type: 'navigation', url: info.url });
                        }
                    };
                    browser.tabs.onUpdated.addListener(listener);
                });

                const result = await Promise.race([spaPromise, navPromise]);

                if (result.type === 'navigation') {
                    await waitForTabLoad(tabId, config.options.timeoutMs);
                    return { type: 'navigation', url: result.url };
                } else {
                    if (!result.success) throw new Error(result.error || 'SPA click failed');
                    return { type: 'spa' , url: currentURL };
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
            currentURL: ({ event }) => (event as unknown as {output: { url: string; }}).output.url
        })
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
        maxPages:
            'maxPages' in input.config.pagination ? input.config.pagination.maxPages : undefined,
    }),
    on: {
        STOP: { target: '.idle' }
    },
    states: {
        idle: {
            on: { START: 'extracting' },
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
                        actions: 'saveResults',
                    },
                    {
                        target: 'idle',
                        actions: 'saveResults',
                    },
                ],
                onError: {
                    target: 'error',
                    actions: assign({
                        error: ({ event }) => (event.error as Error).message,
                    }),
                },
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
                        { target: '#scraper.completed' },
                    ],
                },
                links: {
                    invoke: {
                        src: 'navigateLinks',
                        input: ({ context }) => ({ tabId: context.tabId, config: context.config }),
                        onDone: [
                            {
                                guard: ({ event }) =>
                                    event.output.status === PaginationStateStatus.Complete,
                                target: '#scraper.completed',
                            },
                            { target: '#scraper.extracting', actions: [ 'incrementPage', 'updateURL' ] },
                        ],
                        onError: '#scraper.error',
                    },
                },
                template: {
                    invoke: {
                        src: 'navigateTemplate',
                        input: ({ context }) => ({ tabId: context.tabId, config: context.config }),
                        onDone: { target: '#scraper.extracting', actions: [ 'incrementPage', 'updateURL' ] },
                        onError: '#scraper.error',
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
                                onError: '#scraper.error',
                            },
                        },
                        clicking: {
                            invoke: {
                                src: 'navigateNext',
                                input: ({ context }) => ({
                                    tabId: context.tabId,
                                    config: context.config,
                                }),
                                onDone: [
                                    {
                                        guard: ({ event }) => event.output.type === 'navigation',
                                        target: '#scraper.extracting',
                                        actions: [ 'incrementPage', 'updateURL' ],
                                    },
                                    { target: 'hashingAfter' },
                                ],
                                onError: '#scraper.error',
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
                                    { target: '#scraper.extracting', actions: 'incrementPage' },
                                ],
                                onError: '#scraper.error',
                            },
                        },
                    },
                },
            },
        },
        completed: {
            type: 'final',
        },
        error: {
            on: {
                RETRY: 'extracting',
                STOP: 'idle',
            },
        },
    },
});

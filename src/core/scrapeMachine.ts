// vim:set foldlevel=3 foldmethod=indent:
import { setup, assign, fromPromise, type ErrorActorEvent } from 'xstate';
import type { ScrapeConfig, SelectorGroup } from '@/core/schema';
import { PaginationStateStatus, type ExtractedGroup } from '@/core/types';
import { navigateAndWait, waitForTabLoad } from '@/extension/ui/sidebar/util';

export interface ScrapeContext {
    config: ScrapeConfig;
    currentURL: string;
    results: ExtractedGroup[];
    error: string | null;
    currentPage: number;
    maxPages: number | undefined;
    pageHash?: string;
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
    startURL: string;
}

interface ExtractDataActorInput {
    selectors: SelectorGroup[];
}

interface ComputePageHashActorInput {
    selectors: SelectorGroup[];
}

interface ComputePageHashActorOutput {
    pageHash: string;
}

interface NavigateActorInput {
    config: ScrapeConfig;
    currentURL: string;
}

interface NavigateActorOutput {
    status: PaginationStateStatus;
    url: string;
}

interface NavigateNextActorOutput {
    type: 'navigation' | 'spa';
    status: PaginationStateStatus;
    url: string;
}

type ExtractDataActorOutput = ExtractedGroup[];

// Actors contract for different implementations
// prettier-ignore
export interface ScrapeActors {
    extractData:      (input: ExtractDataActorInput)     => Promise<ExtractDataActorOutput>,
    computePageHash:  (input: ComputePageHashActorInput) => Promise<ComputePageHashActorOutput>,
    navigateLinks:    (input: NavigateActorInput)        => Promise<NavigateActorOutput>,
    navigateTemplate: (input: NavigateActorInput)        => Promise<NavigateActorOutput>,
    navigateNext:     (input: NavigateActorInput)        => Promise<NavigateNextActorOutput>,
}

export const scrapeMachine = setup({
    types: {} as {
        context: ScrapeContext;
        events: ScrapeEvent | ErrorActorEvent;
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
        extractData: fromPromise<ExtractDataActorOutput, ExtractDataActorInput>(
            async ({ input }) => {
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
            },
        ),
        computePageHash: fromPromise<ComputePageHashActorOutput, ComputePageHashActorInput>(
            async ({ input }) => {
                const [tab] = await browser.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                if (!(tab?.id && tab?.url)) throw new Error('Cannot access tab');
                return await browser.tabs.sendMessage(tab.id, {
                    action: 'computePageHash',
                    selectors: input.selectors,
                });
            },
        ),
        navigateLinks: fromPromise<NavigateActorOutput, NavigateActorInput>(async ({ input }) => {
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
                throw new Error(
                    `Unable to navigate to Next Link using pagination: ${pagination.mode}`,
                );
            }
        }),
        navigateTemplate: fromPromise<NavigateActorOutput, NavigateActorInput>(
            async ({ input }) => {
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
                    const pageRegex = new RegExp(
                        escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'),
                    );

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
            },
        ),
        navigateNext: fromPromise<NavigateNextActorOutput, NavigateActorInput>(async ({ input }) => {
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
                        if (!res.success) throw new Error(res.error || 'SPA click failed');
                        return { type: 'spa', status: PaginationStateStatus.InProgress, url: currentURL };
                        // return { status: PaginationStateStatus.InProgress, url: currentURL };
                    }
                } finally {
                    if (listener) {
                        browser.tabs.onUpdated.removeListener(listener);
                    }
                }
            } else {
                console.debug(`Unable to navigate with next using pagination: ${pagination.mode}`);
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
        setError: assign({
            // ts-ignore
            error: ({ event }) => {
                const e = event as ErrorActorEvent<unknown, string>;
                return e.error instanceof Error ? e.error.message : String(e.error);
            }
        }),
    },
}).createMachine({
    id: 'scraper',
    initial: 'idle',
    context: ({ input }) => ({
        config: input.config,
        currentURL: input.startURL,
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
                src: 'extractData',
                input: ({ context }) => ({
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
                        actions: ['incrementRetry', 'setError'],
                    },
                    {
                        target: 'errored',
                        actions: 'setError',
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
                            { target: '#scraper.errored', actions: ['setError'] },
                        ],
                    },
                },
                template: {
                    invoke: {
                        src: 'navigateTemplate',
                        input: ({ context }) => ({
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
                                actions: ['incrementRetry', 'setError'],
                            },
                            { target: '#scraper.errored', actions: ['setError'] },
                        ],
                    },
                },
                next: {
                    initial: 'hashingBefore',
                    states: {
                        hashingBefore: {
                            invoke: {
                                src: 'computePageHash',
                                input: ({ context }) => ({
                                    selectors: context.config.selectors,
                                }),
                                onDone: {
                                    target: 'clicking',
                                    actions: assign({
                                        pageHash: ({ event }) =>
                                            (event as unknown as { output: { pageHash: string } })
                                                .output.pageHash,
                                    }),
                                },
                                onError: { target: '#scraper.errored', actions: 'setError' },
                            },
                        },
                        clicking: {
                            invoke: {
                                src: 'navigateNext',
                                input: ({ context }) => ({
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
                                    {
                                        target: '#scraper.errored',
                                        actions: 'setError',
                                    },
                                ],
                            },
                        },
                        hashingAfter: {
                            invoke: {
                                src: 'computePageHash',
                                input: ({ context }) => ({
                                    selectors: context.config.selectors,
                                }),
                                onDone: [
                                    {
                                        guard: ({ context, event }) =>
                                            context.pageHash ===
                                            (event as unknown as { output: { pageHash: string } })
                                                .output.pageHash,
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
                                onError: { target: '#scraper.errored', actions: 'setError' },
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
                TEST_PAGINATION: {
                    target: 'navigating',
                    actions: assign({ isTesting: true }),
                },
            },
        },
    },
});

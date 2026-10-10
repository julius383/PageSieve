// vim:set foldlevel=3 foldmethod=indent:
import { setup, assign, type ErrorActorEvent, type PromiseActorLogic, not } from 'xstate';
import type { ScrapeConfig, SelectorGroup } from './schema';
import { PaginationStateStatus, type ExtractedGroup } from './types';

export interface ScrapeContext {
    config: ScrapeConfig;
    currentURL: string | undefined;
    results: ExtractedGroup[];
    error: string | null;
    currentPage: number;
    maxPages: number | undefined;
    pageHash?: string;
    retries: number;
    isTesting: boolean;
    driverContext?: unknown;
}

type ScrapeEvent =
    { type: 'START' } | { type: 'STOP' } | { type: 'RETRY' } | { type: 'TEST_PAGINATION' };

interface InputType {
    config: ScrapeConfig;
    startURL: string | undefined;
    driverContext?: unknown;
}

export type ExtractDataActorInput = {
    selectors: SelectorGroup[];
    driverContext?: unknown;
};

export type ComputePageHashActorInput = {
    selectors: SelectorGroup[];
    driverContext?: unknown;
};

export type ComputePageHashActorOutput = {
    pageHash: string;
};

export type WaitForSelectorInput = {
    selector: string;
    timeout: number;
}

export type WaitForSelectorOutput = {
    succeeded: boolean;
}

export type StartNavigateActorInput = {
    config: ScrapeConfig;
    driverContext?: unknown;
};

export type StartNavigateActorOutput = {
    status: PaginationStateStatus;
    url: string;
};

export type NavigateActorInput = {
    config: ScrapeConfig;
    currentURL: string;
    driverContext?: unknown;
};

export type NavigateActorOutput = {
    status: PaginationStateStatus;
    url: string;
};

export type NavigateNextActorOutput = {
    type: 'navigation' | 'spa';
    status: PaginationStateStatus;
    url: string;
};

export type ExtractDataActorOutput = ExtractedGroup[];

// Actors contract for different implementations
// prettier-ignore
export type ScrapeActorDriver = {
    waitForSelector:  PromiseActorLogic<WaitForSelectorOutput,      WaitForSelectorInput>;
    extractData:      PromiseActorLogic<ExtractDataActorOutput,     ExtractDataActorInput>;
    computePageHash:  PromiseActorLogic<ComputePageHashActorOutput, ComputePageHashActorInput>;
    navigate:         PromiseActorLogic<StartNavigateActorOutput,   StartNavigateActorInput>;
    navigateLinks:    PromiseActorLogic<NavigateActorOutput,        NavigateActorInput>;
    navigateTemplate: PromiseActorLogic<NavigateActorOutput,        NavigateActorInput>;
    navigateNext:     PromiseActorLogic<NavigateNextActorOutput,    NavigateActorInput>;
}

export const createScrapeMachine = (driver: ScrapeActorDriver) =>
    setup({
        types: {} as {
            context: ScrapeContext;
            events: ScrapeEvent | ErrorActorEvent;
            input: InputType;
        },
        actors: driver,
        delays: {
            DELAY_MS: ({ context }) => context.config.options.pageDelayMs,
        },
        guards: {
            isValidURL: ({ context }) => context.currentURL != null,
            hasWaitForSelector: ({ context }) => context.config.options.waitForSelector != null,
            hasPagination: ({ context }) => context.config.pagination.mode !== 'none',
            previouslyNavigated: ({ context }) => {
                return (
                    !context.isTesting &&
                    context.config.pagination.mode == 'next' &&
                    context.error == 'SELECTOR NOT FOUND' &&
                    context.currentPage > 1
                );
            },
            isMaxPagesReached: ({ context }) => {
                const maxPages =
                    'maxPages' in context.config.pagination
                        ? context.config.pagination.maxPages
                        : 0;
                return !!(maxPages && maxPages !== 0 && context.currentPage >= maxPages);
            },
            canRetry: ({ context }) => context.retries < (context.config.options.maxRetries ?? 2),
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
                currentURL: ({ event }) =>
                    (event as unknown as { output: { url: string } }).output.url,
            }),
            incrementRetry: assign({
                retries: ({ context }) => context.retries + 1,
            }),
            resetRetries: assign({
                retries: 0,
            }),
            clearError: assign({
                error: null,
            }),
            setError: assign({
                error: ({ event }) => {
                    const e = event as ErrorActorEvent<unknown, string>;
                    return e.error instanceof Error ? e.error.message : String(e.error);
                },
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
            driverContext: input.driverContext,
            maxPages:
                'maxPages' in input.config.pagination
                    ? input.config.pagination.maxPages
                    : undefined,
        }),
        on: {
            STOP: { target: '.idle' },
        },
        states: {
            idle: {
                on: {
                    START: [
                        {
                            guard: 'isValidURL',
                            target: 'running.extracting',
                        },
                        {
                            target: 'running.navigating',
                        },
                    ],
                    TEST_PAGINATION: {
                        target: 'running.navigating',
                        actions: assign({ isTesting: true }),
                    },
                },
            },
            running: {
                on: {
                    'xstate.error.*': [
                        {
                            guard: 'canRetry',
                            target: '#scraper.retrying',
                            actions: ['incrementRetry', 'setError'],
                        },
                        {
                            target: '#scraper.errored',
                            actions: 'setError',
                        },
                    ]
                },
                initial: 'extracting',
                states: {
                    hist: {
                        type: 'history',
                        history: 'deep',
                        target: 'extracting',
                    },
                    extracting: {
                        invoke: {
                            src: 'extractData',
                            input: ({ context }) => ({
                                selectors: context.config.selectors,
                                driverContext: context.driverContext,
                            }),
                            onDone: [
                                {
                                    guard: 'hasPagination',
                                    target: 'waiting',
                                    actions: ['saveResults', 'resetRetries', 'clearError'],
                                },
                                {
                                    target: '#scraper.completed',
                                    actions: ['saveResults', 'resetRetries', 'clearError'],
                                },
                            ],
                        },
                    },
                    waiting: {
                        after: {
                            DELAY_MS: [
                                { guard: 'isMaxPagesReached', target: '#scraper.completed' },
                                { target: 'navigating' },
                            ],
                        },
                    },
                    waitingFor: {
                        invoke: {
                            src: 'waitForSelector',
                            input: ({ context }) => ({
                                selector: context.config.options.waitForSelector as string,
                                timeout: context.config.options.timeoutMs,
                            }),
                            onDone: [
                                {
                                    target: 'extracting',
                                    actions: 'clearError',
                                },
                            ],
                        },
                    },
                    navigating: {
                        initial: 'deciding',
                        states: {
                            deciding: {
                                always: [
                                    {
                                        guard: not('isValidURL'),
                                        target: 'navigateStart',
                                    },
                                    {
                                        guard: ({ context }) => context.config.pagination.mode === 'links',
                                        target: 'links',
                                    },
                                    {
                                        guard: ({ context }) =>
                                            context.config.pagination.mode === 'template',
                                        target: 'template',
                                    },
                                    {
                                        guard: ({ context }) => context.config.pagination.mode === 'next',
                                        target: 'next',
                                    },
                                ],
                            },
                            navigateStart: {
                                invoke: {
                                    src: 'navigate',
                                    input: ({ context }) => ({
                                        config: context.config,
                                        driverContext: context.driverContext,
                                    }),
                                    onDone: [
                                        {
                                            guard: ({ context }) => context.isTesting,
                                            target: 'deciding',
                                            actions: ['updateURL', 'resetRetries', 'clearError'],
                                        },
                                        {
                                            guard: 'hasWaitForSelector',
                                            target: '#scraper.running.waitingFor',
                                            actions: ['updateURL', 'resetRetries', 'clearError'],
                                        },
                                        {
                                            target: '#scraper.running.extracting',
                                            actions: ['updateURL', 'resetRetries', 'clearError'],
                                        },
                                    ],
                                },
                            },
                            links: {
                                invoke: {
                                    src: 'navigateLinks',
                                    input: ({ context }) => ({
                                        config: context.config,
                                        currentURL: context.currentURL as string,
                                        driverContext: context.driverContext,
                                    }),
                                    onDone: [
                                        {
                                            guard: ({ context }) => context.isTesting,
                                            target: '#scraper.completed',
                                            actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                        },
                                        {
                                            guard: ({ event }) =>
                                                event.output.status === PaginationStateStatus.Complete,
                                            target: '#scraper.completed',
                                        },
                                        {
                                            guard: 'hasWaitForSelector',
                                            target: '#scraper.running.waitingFor',
                                            actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                        },
                                        {
                                            target: '#scraper.running.extracting',
                                            actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                        },
                                    ],
                                },
                            },
                            template: {
                                invoke: {
                                    src: 'navigateTemplate',
                                    input: ({ context }) => ({
                                        config: context.config,
                                        currentURL: context.currentURL as string,
                                        driverContext: context.driverContext,
                                    }),
                                    onDone: [
                                        {
                                            guard: ({ context }) => context.isTesting,
                                            target: '#scraper.completed',
                                            actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                        },
                                        {
                                            guard: 'hasWaitForSelector',
                                            target: '#scraper.running.waitingFor',
                                            actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                        },
                                        {
                                            target: '#scraper.running.extracting',
                                            actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                        },
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
                                                driverContext: context.driverContext,
                                            }),
                                            onDone: {
                                                target: 'clicking',
                                                actions: assign({
                                                    pageHash: ({ event }) =>
                                                        (
                                                            event as unknown as {
                                                                output: { pageHash: string };
                                                            }
                                                        ).output.pageHash,
                                                }),
                                            },
                                        },
                                    },
                                    clicking: {
                                        invoke: {
                                            src: 'navigateNext',
                                            input: ({ context }) => ({
                                                config: context.config,
                                                currentURL: context.currentURL as string,
                                                driverContext: context.driverContext,
                                            }),
                                            onDone: [
                                                {
                                                    guard: ({ context, event }) =>
                                                        event.output.type === 'navigation' &&
                                                        context.isTesting,
                                                    target: '#scraper.completed',
                                                    actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                                },
                                                {
                                                    guard: 'hasWaitForSelector',
                                                    target: '#scraper.running.waitingFor',
                                                    actions: ['incrementPage', 'resetRetries', 'clearError'],
                                                },
                                                {
                                                    guard: ({ event }) =>
                                                        event.output.type === 'navigation',
                                                    target: '#scraper.running.extracting',
                                                    actions: ['incrementPage', 'updateURL', 'resetRetries', 'clearError'],
                                                },
                                                { target: 'hashingAfter' },
                                            ],
                                            onError: [
                                                {
                                                    guard: 'previouslyNavigated',
                                                    target: '#scraper.completed',
                                                },
                                                {
                                                    guard: 'canRetry',
                                                    target: '#scraper.retrying',
                                                    actions: ['incrementRetry', 'setError'],
                                                },
                                                {
                                                    target: '#scraper.errored',
                                                    actions: 'setError',
                                                },
                                            ]
                                        },
                                    },
                                    hashingAfter: {
                                        invoke: {
                                            src: 'computePageHash',
                                            input: ({ context }) => ({
                                                selectors: context.config.selectors,
                                                driverContext: context.driverContext,
                                            }),
                                            onDone: [
                                                {
                                                    guard: ({ context, event }) =>
                                                        context.pageHash ===
                                                        (
                                                            event as unknown as {
                                                                output: { pageHash: string };
                                                            }
                                                        ).output.pageHash,
                                                    target: '#scraper.completed',
                                                },
                                                {
                                                    guard: ({ context }) => context.isTesting,
                                                    target: '#scraper.completed',
                                                    actions: ['incrementPage', 'resetRetries', 'clearError'],
                                                },
                                                {
                                                    guard: 'hasWaitForSelector',
                                                    target: '#scraper.running.waitingFor',
                                                    actions: ['incrementPage', 'resetRetries', 'clearError'],
                                                },
                                                {
                                                    target: '#scraper.running.extracting',
                                                    actions: ['incrementPage', 'resetRetries', 'clearError'],
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            retrying: {
                after: {
                    DELAY_MS: {
                        target: '#scraper.running.hist',
                    },
                },
            },
            completed: {
                type: 'final',
            },
            errored: {
                always: [
                    {
                        guard: 'previouslyNavigated',
                        target: 'completed',
                    },
                ],
                on: {
                    RETRY: {
                        target: '#scraper.running.hist',
                        actions: ['resetRetries', 'clearError'],
                    },
                    STOP: { target: 'idle' },
                    TEST_PAGINATION: {
                        target: 'running.navigating',
                        actions: assign({ isTesting: true }),
                    },
                },
            },
        },
        output: ({ context }) => ({ results: context.results }),
    });

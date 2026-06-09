// vim:set foldlevel=3 foldmethod=indent:
import {
    setup,
    assign,
    type ErrorActorEvent,
    type PromiseActorLogic,
    type AnyActorLogic,
} from 'xstate';
import type { ScrapeConfig, SelectorGroup } from '@/core/schema';
import { PaginationStateStatus, type ExtractedGroup } from '@/core/types';

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
    driverContext?: any;
}

type ScrapeEvent =
    | { type: 'START' }
    | { type: 'STOP' }
    | { type: 'RETRY' }
    | { type: 'TEST_PAGINATION' };

interface InputType {
    config: ScrapeConfig;
    startURL: string;
    driverContext?: unknown;
}

interface ExtractDataActorInput {
    selectors: SelectorGroup[];
    driverContext?: unknown;
}

interface ComputePageHashActorInput {
    selectors: SelectorGroup[];
    driverContext?: unknown;
}

interface ComputePageHashActorOutput {
    pageHash: string;
}

interface NavigateActorInput {
    config: ScrapeConfig;
    currentURL: string;
    driverContext?: unknown;
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
export interface ScrapeActorDriver extends Record<string, AnyActorLogic> {
    extractData:      PromiseActorLogic<ExtractDataActorOutput,     ExtractDataActorInput>,
    computePageHash:  PromiseActorLogic<ComputePageHashActorOutput, ComputePageHashActorInput>,
    navigateLinks:    PromiseActorLogic<NavigateActorOutput,        NavigateActorInput>,
    navigateTemplate: PromiseActorLogic<NavigateActorOutput,        NavigateActorInput>,
    navigateNext:     PromiseActorLogic<NavigateNextActorOutput,    NavigateActorInput>,
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
            DELAY_MS: ({ context }) => context.config.options.delayMs,
        },
        guards: {
            hasPagination: ({ context } ) =>
                context.config.pagination.mode !== 'none',
            isMaxPagesReached: ({ context }) => {
                const maxPages =
                    'maxPages' in context.config.pagination
                        ? context.config.pagination.maxPages
                        : 0;
                return !!(maxPages && maxPages !== 0 && context.currentPage >= maxPages);
            },
            canRetry: ({ context }) =>
                context.retries < (context.config.options.maxRetries ?? 2),
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
            setError: assign({
                // ts-ignore
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
                        driverContext: context.driverContext,
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
                    links: {
                        invoke: {
                            src: 'navigateLinks',
                            input: ({ context }) => ({
                                config: context.config,
                                currentURL: context.currentURL,
                                driverContext: context.driverContext,
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
                                driverContext: context.driverContext,
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
                                    onError: { target: '#scraper.errored', actions: 'setError' },
                                },
                            },
                            clicking: {
                                invoke: {
                                    src: 'navigateNext',
                                    input: ({ context }) => ({
                                        config: context.config,
                                        currentURL: context.currentURL,
                                        driverContext: context.driverContext,
                                    }),
                                    onDone: [
                                        {
                                            guard: ({ context, event }) =>
                                                event.output.type === 'navigation' &&
                                                context.isTesting,
                                            target: '#scraper.completed',
                                            actions: ['incrementPage', 'updateURL', 'resetRetries'],
                                        },
                                        {
                                            guard: ({ event }) =>
                                                event.output.type === 'navigation',
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

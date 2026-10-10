import { describe, it, expect } from 'bun:test';
import { createActor, fromPromise } from 'xstate';
import { createScrapeMachine } from './scrapeMachine';
import type {
    ScrapeActorDriver ,
    ExtractDataActorOutput,
    ExtractDataActorInput,
    ComputePageHashActorInput,
    ComputePageHashActorOutput,
    WaitForSelectorInput,
    WaitForSelectorOutput,
    StartNavigateActorInput,
    StartNavigateActorOutput,
    NavigateActorInput,
    NavigateActorOutput,
    NavigateNextActorOutput,
} from './scrapeMachine';
import type { ScrapeConfig } from './schema';
import { PaginationStateStatus } from './types';

type VisitedStates = (string | object)[];

function createMockConfig(overrides?: Partial<ScrapeConfig>): ScrapeConfig {
    return {
        id: 'test-scraper',
        schemaVersion: '2.0.0',
        revision: 1,
        createdAt: '2026-10-10T05:38:14Z',
        updatedAt: '2026-10-10T05:38:14Z',
        name: 'test-scraper',
        url: 'https://example.com',
        selectors: [
            {
                id: 'group-1',
                name: 'Items',
                container: '.item',
                fields: [{ id: 'f_jbe59E', extract: 'text', required: false, name: 'title', selector: 'h1', type: 'single' }],
            },
        ],
        pagination: { mode: 'none' },
        options: {
            scrollToBottom: false,
            pageDelayMs: 0,
            timeoutMs: 1000,
            maxRetries: 2,
            waitforNetworkIdle: false,
            runJavaScript: false,
            appendData: true,
        },
        ...overrides,
    };
}

function createMockDriver(overrides?: Partial<ScrapeActorDriver>): ScrapeActorDriver {
    return {
        waitForSelector: fromPromise<WaitForSelectorOutput, WaitForSelectorInput>(
            async () => ({ succeeded: true }),
        ),
        extractData: fromPromise<ExtractDataActorOutput, ExtractDataActorInput>(
            async () => [{ id: 'group-1', results: [{ title: 'Item 1' }] }],
        ),
        computePageHash: fromPromise<ComputePageHashActorOutput, ComputePageHashActorInput>(
            async () => ({ pageHash: 'hash-abc' }),
        ),
        navigate: fromPromise<StartNavigateActorOutput, StartNavigateActorInput>(
            async ({ input }) => ({
                status: PaginationStateStatus.InProgress,
                url: input.config.url,
            }),
        ),
        navigateLinks: fromPromise<NavigateActorOutput, NavigateActorInput>(
            async () => ({
                status: PaginationStateStatus.Complete,
                url: 'https://example.com/page/2',
            }),
        ),
        navigateTemplate: fromPromise<NavigateActorOutput, NavigateActorInput>(
            async () => ({
                status: PaginationStateStatus.Complete,
                url: 'https://example.com?page=2',
            }),
        ),
        navigateNext: fromPromise<NavigateNextActorOutput, NavigateActorInput>(
            async () => ({
                type: 'navigation',
                status: PaginationStateStatus.InProgress,
                url: 'https://example.com/next',
            }),
        ),
        ...overrides,
    };
}

describe('scrapeMachine tests', () => {
    it('completes basic extraction without pagination', async () => {
        const config = createMockConfig({ pagination: { mode: 'none' } });
        const driver = createMockDriver();
        const machine = createScrapeMachine(driver);

        const actor = createActor(machine, {
            input: { config, startURL: 'https://example.com' },
        });

        actor.start();
        expect(actor.getSnapshot().value).toBe('idle');

        actor.send({ type: 'START' });

        await new Promise((resolve) => {
            actor.subscribe((snapshot) => {
                if (snapshot.value === 'completed') resolve(true);
            });
        });

        const snapshot = actor.getSnapshot();
        expect(snapshot.value).toBe('completed');
        expect(snapshot.context.results).toHaveLength(1);
        expect(snapshot.context.results[0].results).toEqual([{ title: 'Item 1' }]);
    });
    it('first navigates to url before extraction', async () => {
        const config = createMockConfig({ pagination: { mode: 'none' } });
        const driver = createMockDriver({
            navigate: fromPromise<StartNavigateActorOutput, StartNavigateActorInput>(async () => ({
                status: PaginationStateStatus.InProgress,
                url: "https://example.com",
            })),
        });
        const machine = createScrapeMachine(driver);

        const actor = createActor(machine, {
            input: { config, startURL: undefined },
        });


        const statesVisited: VisitedStates = [];
        actor.subscribe((s) => {
            const val = s.value;
            if (!statesVisited.includes(val)) statesVisited.push(val);
        });

        actor.start();
        actor.send({ type: 'START' });

        await new Promise((resolve) => {
            actor.subscribe((snapshot) => {
                if (snapshot.value === 'completed') resolve(true);
            });
        });

        const snapshot = actor.getSnapshot();
        expect(statesVisited).toContainEqual(expect.objectContaining({running: {navigating: "navigateStart"}}));
        expect(snapshot.value).toBe('completed');
        expect(snapshot.context.currentURL).toBe("https://example.com");

    })

    it('retries extracting using history when extractData fails once', async () => {
        let attempts = 0;
        const config = createMockConfig({
            options: { scrollToBottom: false, pageDelayMs: 0, maxRetries: 2, timeoutMs: 1000, waitforNetworkIdle: false, runJavaScript: false, appendData: true },
        });

        const driver = createMockDriver({
            extractData: fromPromise<ExtractDataActorOutput, ExtractDataActorInput>(async () => {
                attempts++;
                if (attempts === 1) {
                    throw new Error('Network timeout during extract');
                }
                return [
                    {
                        id: 'group-1',
                        name: 'Items',
                        results: [{ title: 'Recovered Item' }],
                    },
                ];
            }),
        });

        const machine = createScrapeMachine(driver);
        const actor = createActor(machine, {
            input: { config, startURL: 'https://example.com' },
        });

        const statesVisited: VisitedStates = [];
        actor.subscribe((s) => {
            const val = s.value;
            if (!statesVisited.includes(val)) statesVisited.push(val);
        });

        actor.start();
        actor.send({ type: 'START' });

        await new Promise((resolve) => {
            actor.subscribe((snapshot) => {
                if (snapshot.value === 'completed') resolve(true);
            });
        });

        expect(attempts).toBe(2);
        expect(statesVisited).toContain('retrying');
        expect(actor.getSnapshot().value).toBe('completed');
        expect(actor.getSnapshot().context.results[0].results).toEqual([{ title: 'Recovered Item' }]);
    });

    it('retries waitingFor using history without skipping to extracting', async () => {
        let waitAttempts = 0;
        let extractCalled = false;

        const config = createMockConfig({
            options: {
                scrollToBottom: false,
                pageDelayMs: 0,
                maxRetries: 2,
                timeoutMs: 1000,
                waitForSelector: '.must-exist',
                waitforNetworkIdle: false,
                runJavaScript: false,
                appendData: true,
            },
        });

        const driver = createMockDriver({
            waitForSelector: fromPromise<WaitForSelectorOutput, WaitForSelectorInput>(async () => {
                waitAttempts++;
                if (waitAttempts === 1) {
                    throw new Error('Element not ready yet');
                }
                return { succeeded: true };
            }),
            extractData: fromPromise<ExtractDataActorOutput, ExtractDataActorInput>(async () => {
                if (waitAttempts < 2) {
                    throw new Error('extractData called before waitForSelector succeeded!');
                }
                extractCalled = true;
                return [{ id: 'group-1', name: 'Items', results: [] }];
            }),
        });

        const machine = createScrapeMachine(driver);
        const actor = createActor(machine, {
            input: { config, startURL: undefined },
        });

        actor.start();
        actor.send({ type: 'START' });

        await new Promise((resolve) => {
            actor.subscribe((snapshot) => {
                if (snapshot.value === 'completed') resolve(true);
            });
        });

        expect(waitAttempts).toBe(2);
        expect(extractCalled).toBe(true);
        expect(actor.getSnapshot().value).toBe('completed');
    });

    it('retries links navigation using history when navigateLinks fails once', async () => {
        let linkNavAttempts = 0;
        const config = createMockConfig({
            pagination: {
                mode: 'links',
                pageLinks: ['https://example.com/p1', 'https://example.com/p2'],
            },
            options: {
                scrollToBottom: false,
                pageDelayMs: 0,
                maxRetries: 2,
                timeoutMs: 1000,
                waitforNetworkIdle: false,
                runJavaScript: false,
                appendData: true,
            },
        });

        const driver = createMockDriver({
            navigateLinks: fromPromise<NavigateActorOutput, NavigateActorInput>(async () => {
                linkNavAttempts++;
                if (linkNavAttempts === 1) {
                    throw new Error('Navigation failed temporarily');
                }
                return { status: PaginationStateStatus.Complete, url: 'https://example.com/p2' };
            }),
        });

        const machine = createScrapeMachine(driver);
        const actor = createActor(machine, {
            input: { config, startURL: 'https://example.com/p1' },
        });

        actor.start();
        actor.send({ type: 'START' });

        await new Promise((resolve) => {
            actor.subscribe((snapshot) => {
                if (snapshot.value === 'completed') resolve(true);
            });
        });

        expect(linkNavAttempts).toBe(2);
        expect(actor.getSnapshot().value).toBe('completed');
    });

    it('transitions to errored when maxRetries is exceeded and recovers via RETRY event', async () => {
        let allowSuccess = false;

        const config = createMockConfig({
            options: {
                scrollToBottom: false,
                pageDelayMs: 0,
                maxRetries: 2,
                timeoutMs: 1000,
                waitforNetworkIdle: false,
                runJavaScript: false,
                appendData: true,
            },
        });

        const driver = createMockDriver({
            extractData: fromPromise<ExtractDataActorOutput, ExtractDataActorInput>(async () => {
                if (!allowSuccess) {
                    throw new Error('Persistent error');
                }
                return [{ id: 'group-1', name: 'Items', results: [{ title: 'Manual Recovery' }] }];
            }),
        });

        const machine = createScrapeMachine(driver);
        const actor = createActor(machine, {
            input: { config, startURL: 'https://example.com' },
        });

        actor.start();
        actor.send({ type: 'START' });

        await new Promise((resolve) => {
            actor.subscribe((snapshot) => {
                if (snapshot.value === 'errored') resolve(true);
            });
        });

        expect(actor.getSnapshot().value).toBe('errored');
        expect(actor.getSnapshot().context.retries).toBe(2);
        expect(actor.getSnapshot().context.error).toBe('Persistent error');

        allowSuccess = true;
        actor.send({ type: 'RETRY' });

        await new Promise((resolve) => {
            actor.subscribe((snapshot) => {
                if (snapshot.value === 'completed') resolve(true);
            });
        });

        const finalSnapshot = actor.getSnapshot();
        expect(finalSnapshot.value).toBe('completed');
        expect(finalSnapshot.context.results[0].results).toEqual([{ title: 'Manual Recovery' }]);
    });
});

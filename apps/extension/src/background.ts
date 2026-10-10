import { createActor, type SnapshotFrom, type Actor, type Subscription } from 'xstate';
import { omit } from 'es-toolkit';
import { ScrapeContext, createScrapeMachine } from '@pagesieve/core/scrapeMachine';
import { extensionDriver } from '@/extensionDriver';
import { PaginationStateStatus } from '@pagesieve/core/types';
import type { BackgroundRequest, StatusLevel, ScrapeStatusUpdateRequest } from '@/types';
import { getLogger } from '@pagesieve/core/logger';
import { initExtensionLogger } from '@/logger';
initExtensionLogger();
const logger = getLogger(['ext', 'background']);

browser.browserAction.onClicked.addListener(() => {
    browser.sidebarAction.toggle();
});

const scrapeMachine = createScrapeMachine(extensionDriver);
let scrapeActor: Actor<typeof scrapeMachine> | null = null;

function getStateName(val: string | object) {
    if (val instanceof Object) {
        const v = val['running'];
        return v instanceof Object ? Object.keys(v)[0] : v;
    }
    return val;
}

function actorSubscriber(snapshot: SnapshotFrom<typeof scrapeMachine>) {
    const context: ScrapeContext = snapshot.context;
    let currentState = getStateName(snapshot.value) as StatusLevel;
    // logger.debug('Scrape context is {context}', { context: omit(context, ['config']) });
    logger.debug('Current state is {status} ({full}) {context}', {
        status: currentState,
        full: snapshot.value,
        context: omit(context, ['config', 'results']),
    });
    let message: string = currentState;
    let progress = {};
    if (currentState === 'errored') {
        logger.error('An error occurred: {error}', {
            status: currentState,
            error: context.error || 'Unknown error',
        });
        message = context.error || 'An error occurred during scraping';
    } else if (currentState === 'retrying') {
        logger.warning('Trying to recover ({retries}/{maxRetries}) from:\n {error}', {
            status: currentState,
            retries: context.retries,
            maxRetries: context.config.options.maxRetries,
            error: context.error || 'Unknown error',
        });
        message = `Trying to recover from ${context.error}`;
        progress = {
            progressIndex: context.retries,
            progressMax: context.config.options.maxRetries,
        };
    } else if (currentState === 'extracting') {
        logger.info('Extracting data from {currentURL}', {
            status: currentState,
            currentURL: context.currentURL,
        });
        message = `Extracting data from ${context.currentURL}: ${context.currentPage}${context.maxPages ? ' of ' + context.maxPages : ''}`;
        if (context.config.pagination.mode !== 'none') {
            progress = { progressIndex: context.currentPage, progressMax: context.maxPages };
        }
    } else if (currentState === 'navigating') {
        logger.info('Navigating from {currentURL} using {pagination}', {
            status: currentState,
            currentURL: context.currentURL,
            pagination: context.config.pagination.mode,
        });
        message = `Navigating to next page (${context.config.pagination.mode})`;
    } else if (currentState === 'waiting') {
        logger.info('Waiting for {delay} milliseconds', {
            status: currentState,
            delay: context.config.options.pageDelayMs,
        });
        message = `Waiting for ${context.config.options.pageDelayMs}`;
    } else if (currentState === 'waitingFor') {
        logger.info('Waiting for {selector} to be present', {
            status: currentState,
            selector: context.config.options.waitForSelector,
        });
        message = `Waiting for ${context.config.options.waitForSelector}`;
    } else if (currentState === 'completed') {
        const totalResults = context.results.reduce((sum, group) => sum + group.results.length, 0);
        logger.info('Finished scraping. Found {totalResults} items on {totalPages} pages', {
            status: currentState,
            totalResults: totalResults,
            totalPages: context.currentPage,
        });
        message = `Finished scraping. Found ${totalResults} items on ${context.currentPage} pages`;
    }

    browser.runtime.sendMessage({
        action: 'updateScrapeStatus',
        status: currentState,
        message,
        results: context.results,
        ...progress,
    } as ScrapeStatusUpdateRequest);
}

async function cleanupContentScripts() {
    console.log('Running cleanup');
    const tabs = await browser.tabs.query({});

    await Promise.all(
        tabs
            .filter((tab) => tab.id !== undefined)
            .map(async (tab) => {
                try {
                    await browser.tabs.sendMessage(tab.id!, {
                        action: 'sidebar-closing',
                    });
                } catch {
                    // No content script
                }
            }),
    );
}

browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'sidebar') return;

    port.onDisconnect.addListener(() => {
        cleanupContentScripts();
    });
});

browser.runtime.onMessage.addListener(async (request: BackgroundRequest) => {
    if (request.action === 'runMain') {
        if (scrapeActor) scrapeActor.stop();

        scrapeActor = createActor(scrapeMachine, {
            input: {
                config: request.config,
                startURL: request.tabUrl,
            },
        });

        logger.debug('Created actor with {config}', { config: request.config });
        scrapeActor.subscribe(actorSubscriber);
        scrapeActor.start();
        scrapeActor.send({ type: 'START' });
    } else if (request.action === 'stopMain') {
        // Handle stop request from Sidebar
        if (scrapeActor) {
            scrapeActor.send({ type: 'STOP' });
            scrapeActor?.stop();
            scrapeActor = null;
        }
        return Promise.resolve({ success: true });
    } else if (request.action === 'getTabUrl') {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id) {
            return { url: tab.url, title: tab.title };
        }
    } else if (request.action === 'openFullPage') {
        await browser.tabs.create({ url: '/fullpage.html', active: request?.makeActive ?? false });
        return;
    } else if (request.action === 'testNavigate') {
        if (scrapeActor) scrapeActor.stop();

        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id && tab?.url) {
            const testActor = createActor(scrapeMachine, {
                input: {
                    config: request.config,
                    startURL: request.tabUrl,
                },
            });
            scrapeActor = testActor;

            return new Promise((resolve) => {
                let subscription: Subscription | undefined;
                let settled = false;

                const finish = (paginationStatus: PaginationStateStatus) => {
                    if (settled) return;
                    settled = true;
                    subscription?.unsubscribe();
                    testActor.stop();
                    if (scrapeActor === testActor) {
                        scrapeActor = null;
                    }
                    resolve({ paginationStatus });
                };

                subscription = testActor.subscribe((snapshot) => {
                    actorSubscriber(snapshot);
                    const currentState = (
                        snapshot.value instanceof Object
                            ? Object.keys(snapshot.value)[0]
                            : snapshot.value
                    ) as StatusLevel;
                    if (currentState === 'completed') {
                        finish(PaginationStateStatus.InProgress);
                    } else if (currentState === 'errored') {
                        finish(PaginationStateStatus.Failed);
                    }
                });

                testActor.start();
                testActor.send({ type: 'TEST_PAGINATION' });
            });
        }
    }
});

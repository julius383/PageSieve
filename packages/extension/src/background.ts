import { createActor, type SnapshotFrom, type Actor } from 'xstate';
import { omit } from 'es-toolkit/object';
import { ScrapeContext, createScrapeMachine } from '@pagesieve/core/scrapeMachine';
import { extensionDriver } from '@/extensionDriver';
import { PaginationStateStatus } from '@pagesieve/core/types';
import type { BackgroundRequest, StatusLevel } from '@/types';
import { getLogger } from '@pagesieve/core/logger';
import { initExtensionLogger } from '@/logger';
initExtensionLogger();
const logger = getLogger(['ext', 'background']);

let sidebarOpen = false;

browser.browserAction.onClicked.addListener(() => {
    if (sidebarOpen !== undefined && sidebarOpen) {
        browser.sidebarAction.close();
    } else {
        browser.sidebarAction.open();
    }
    sidebarOpen = !sidebarOpen;
});

const scrapeMachine = createScrapeMachine(extensionDriver);
let scrapeActor: Actor<typeof scrapeMachine> | null = null;

function actorSubscriber(snapshot: SnapshotFrom<typeof scrapeMachine>) {
    const context: ScrapeContext = snapshot.context;
    const currentState = (
        snapshot.value instanceof Object ? Object.keys(snapshot.value)[0] : snapshot.value
    ) as StatusLevel;
    // logger.debug('Scrape context is {context}', { context: omit(context, ['config']) });
    logger.debug('Current state is {status} with context {context}', {
        status: currentState,
        context: omit(context, ['config', 'results']),
    });
    if (currentState === 'errored') {
        logger.error('An error occurred: {error}', {
            status: currentState,
            error: context.error || 'Unknown error',
        });
    } else if (currentState === 'extracting') {
        logger.info('Extracting data from {currentURL}', {
            status: currentState,
            currentURL: context.currentURL,
        });
    } else if (currentState === 'navigating') {
        logger.info('Navigating from {currentURL} using {pagination}', {
            status: currentState,
            currentURL: context.currentURL,
            pagination: context.config.pagination.mode,
        });
    } else if (currentState === 'waiting') {
        logger.info('Waiting for {delay} milliseconds', {
            status: currentState,
            delay: context.config.options.pageDelayMs,
        });
    }

    browser.runtime.sendMessage({
        action: 'updateScrapeStatus',
        status: currentState,
        results: context.results,
    });
}

browser.runtime.onMessage.addListener(async (request: BackgroundRequest) => {
    // Handle start request from Sidebar
    if (request.action === 'runMain') {
        if (scrapeActor) scrapeActor.stop();

        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id && tab?.url) {
            scrapeActor = createActor(scrapeMachine, {
                input: {
                    config: request.config,
                    startURL: tab.url,
                },
            });

            logger.debug('Created actor with {config}', { config: request.config });
            scrapeActor.subscribe(actorSubscriber);
            scrapeActor.start();
            scrapeActor.send({ type: 'START' });
        } else {
            logger.error('Failed to start in current tab');
        }
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
            scrapeActor = createActor(scrapeMachine, {
                input: {
                    config: request.config,
                    startURL: tab.url,
                },
            });

            return new Promise((resolve) => {
                scrapeActor!.subscribe((snapshot) => {
                    actorSubscriber(snapshot);
                    const currentState = (
                        snapshot.value instanceof Object
                            ? Object.keys(snapshot.value)[0]
                            : snapshot.value
                    ) as StatusLevel;
                    if (currentState === 'completed') {
                        resolve({ paginationStatus: PaginationStateStatus.InProgress });
                    } else if (currentState === 'errored') {
                        resolve({ paginationStatus: PaginationStateStatus.Failed });
                    }
                });

                scrapeActor!.start();
                scrapeActor!.send({ type: 'TEST_PAGINATION' });
            });
        }
    }
});

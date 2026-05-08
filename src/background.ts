import { createActor } from 'xstate';
import { omit } from 'es-toolkit/object';
import { ScrapeContext, scrapeMachine } from './scrapeMachine';
import { type BackgroundRequest, PaginationStateStatus, type StatusLevel } from './types';
import { getLogger } from "./logger";
const logger = getLogger(["ext", "background"]);

let sidebarOpen = false;

browser.browserAction.onClicked.addListener(() => {
    if (sidebarOpen) {
        browser.sidebarAction.close();
    } else {
        browser.sidebarAction.open();
    }
    sidebarOpen = !sidebarOpen;
});

let scrapeActor: ReturnType<typeof createActor> | null = null;

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
                    tabId: tab.id,
                    tabURL: tab.url,
                },
            });

            logger.debug('Created actor with {config}', {config: request.config});
            scrapeActor.subscribe((state) => {
                const context: ScrapeContext = state.context;
                const currentState = (
                    state.value instanceof Object ? Object.keys(state.value)[0] : state.value
                ) as StatusLevel;
                logger.debug('Scrape context is {context}', { context: omit(context, ['config']) });
                if (currentState === 'errored') {
                    logger.error("An error occurred: {error}", {
                        status: currentState,
                        error: context.error || 'Unknown error',
                    });
                } else if (currentState === 'extracting') {
                    logger.info("Extracting data from {currentURL}", {
                        status: currentState,
                        currentURL: context.currentURL,
                    });
                } else if (currentState === 'navigating') {
                    logger.info("Navigating from {currentURL} using {pagination}", {
                        status: currentState,
                        currentURL: context.currentURL,
                        pagination: context.config.pagination.mode,
                    });
                } else if (currentState === 'waiting') {
                    logger.info("Waiting for {delay} milliseconds", {
                        status: currentState,
                        delay: context.config.options.delayMs,
                    });
                }

                browser.runtime.sendMessage({
                    action: 'updateScrapeStatus',
                    status: currentState,
                    results: context.results,
                });
            });

            scrapeActor.start();
            scrapeActor.send({ type: 'START' });
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
                    tabId: tab.id,
                    tabURL: tab.url,
                },
            });

            return new Promise((resolve) => {
                scrapeActor!.subscribe((state) => {
                    const currentState = (
                        state.value instanceof Object ? Object.keys(state.value)[0] : state.value
                    ) as StatusLevel;

                    let message: string = '';
                    if (currentState === 'errored') {
                        message = state.context.error || 'Unknown error';
                    } else if (currentState === 'navigating') {
                        message = `navigating from ${state.context.currentURL} using ${state.context.config.pagination.mode}`;
                    }

                    browser.runtime.sendMessage({
                        action: 'updateScrapeStatus',
                        status: currentState,
                        message: message,
                        results: state.context.results,
                    });

                    if (state.value === 'completed') {
                        resolve({ paginationStatus: PaginationStateStatus.InProgress });
                    } else if (state.value === 'errored') {
                        resolve({ paginationStatus: PaginationStateStatus.Failed });
                    }
                });

                scrapeActor!.start();
                scrapeActor!.send({ type: 'TEST_PAGINATION' });
            });
        }
    }
});

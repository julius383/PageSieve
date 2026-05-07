import { createActor } from 'xstate';
import { scrapeMachine } from './scrapeMachine';
import { type BackgroundRequest, PaginationStateStatus, type StatusLevel } from './types';

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

            // Broadcast state and context changes to the Sidebar UI
            scrapeActor.subscribe((state) => {
                const currentState = (
                    state.value instanceof Object ? Object.keys(state.value)[0] : state.value
                ) as StatusLevel;
                console.log(`State: ${currentState}`);
                console.dir(state.context);
                console.log('---');
                let message: string = '';
                if (currentState === 'errored') {
                    message = state.context.error || 'Unknown error';
                } else if (currentState === 'extracting') {
                    message = `extracting data from ${state.context.currentURL}`;
                } else if (currentState === 'navigating') {
                    message = `navigating from ${state.context.currentURL} using ${state.context.config.pagination.mode}`;
                } else if (currentState === 'waiting') {
                    message = `waiting for ${state.context.config.options.delayMs} milliseconds`;
                }

                browser.runtime.sendMessage({
                    action: 'updateScrapeStatus',
                    status: currentState,
                    message: message,
                    results: state.context.results,
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
    } else if (request.action === 'logMessage') {
        console.log('[content] ' + request.message);
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

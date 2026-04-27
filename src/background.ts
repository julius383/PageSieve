import { createActor } from 'xstate';
import { scrapeMachine } from './scrapeMachine';
import type { BackgroundRequest } from './types';

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
                }
            });

            // Broadcast state and context changes to the Sidebar UI
            scrapeActor.subscribe((state) => {
                console.log(`State: `);
                console.dir(state.value);
                console.dir(state.context)
                console.log('---');
                browser.runtime.sendMessage({
                    action: 'updateScrapeStatus',
                    status: state.value instanceof Object ? Object.keys(state.value)[0] : state.value,
                    results: state.context.results,
                });
            });

            scrapeActor.start();
            scrapeActor.send({type: 'START'})
        }
    } else if (request.action === 'stopMain') {
        // Handle stop request from Sidebar
        scrapeActor?.stop();
        scrapeActor = null;
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
    }
});

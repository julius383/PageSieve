import { ExtensionStatus } from './types';

let currentStatus: ExtensionStatus = {
    level: 'idle',
    message: 'Ready',
    timestamp: Date.now(),
};

let sidebarOpen = false;

// Listen for a click on the browser action icon.
browser.browserAction.onClicked.addListener(() => {
    // Toggle the sidebar's open state.
    if (sidebarOpen) {
        browser.sidebarAction.close();
    } else {
        browser.sidebarAction.open();
    }
    // Update the state variable.
    sidebarOpen = !sidebarOpen;
});

browser.runtime.onMessage.addListener(async (request, sender) => {
    if (request.action === 'getTabUrl') {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id) {
            return { url: tab.url, title: tab.title };
        }
    }

    if (request.action === 'set-status') {
        setStatus(request.data);
    }

    if (request.action === 'get-status') {
        return currentStatus;
    }
});

function setStatus(newStatus: ExtensionStatus) {
    currentStatus = {
        ...newStatus,
        timestamp: Date.now(),
    };
    console.log(`changed status to ${currentStatus.level}`);

    // Broadcast to all extension pages
    browser.runtime.sendMessage({
        action: 'status-updated',
        status: currentStatus,
    });
}

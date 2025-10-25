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


browser.runtime.onMessage.addListener(
  (
    request: any,
    sender: any,
    sendResponse: (response: any) => void
  ): boolean => {
    if (request.action === 'getTabUrl') {

      browser.tabs.query({ active: true, currentWindow: true }).then((tabs: browser.tabs.Tab[]) => {
        if (tabs[0]?.id) {
          sendResponse({ url: tabs[0].url });
        }
      })
    }
    return true; // Keep the message channel open for async sendResponse
  }
);


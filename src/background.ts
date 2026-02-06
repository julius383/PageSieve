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
    } else if (request.action === 'pageNavigate') {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab?.id && tab?.url) {
            if (request.config.mode === 'links') {
                const idx = request.config.pageLinks.findIndex((elem: string) => elem === tab.url)
                let next_idx = 0
                if (idx + 1 < request.config.pageLinks.length) {
                    next_idx = idx + 1
                }
                const nextURL = request.config.pageLinks[next_idx];
                const newTab = await browser.tabs.update(tab.id, {
                    url: nextURL
                })
                return { previousURL: tab.url, currentURL: newTab.url};


            } else if (request.config.mode === 'next') {
                await browser.tabs.sendMessage(tab.id, {action: 'clickElement', selector: request.config.nextSelector});
                const [newTab] = await browser.tabs.query({
                    active: true,
                    currentWindow: true,
                });
                return { previousURL: tab.url, currentURL: newTab.url};
            } else if (request.config.mode === 'template') {
                const currentTabUrl = tab.url;
                const { urlTemplate, increment, startPage, maxPages } = request.config;

                const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Escape special regex characters, then replace '{{page}}' with a digit capture group.
                const escapedTemplate = escapeRegExp(urlTemplate);
                const pageRegex = new RegExp(escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'));

                let currentPage = startPage;
                const match = currentTabUrl.match(pageRegex);

                if (match && match[1]) {
                    currentPage = parseInt(match[1], 10);
                }

                const nextPage = currentPage + increment;

                if (maxPages && nextPage > maxPages) {
                    console.log(`Reached max pages (${maxPages}). Cannot navigate further.`);
                    return { previousURL: currentTabUrl, currentURL: null };
                }

                const newUrl = urlTemplate.replace('{{page}}', nextPage.toString());
                const updatedTab = await browser.tabs.update(tab.id, { url: newUrl });

                return { previousURL: currentTabUrl, currentURL: updatedTab.url };
            } else {
                console.log('Not implemented');

            }
        }
    }
});

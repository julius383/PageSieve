import { fromPromise } from 'xstate';
import type { Frame, Page } from 'playwright';
import { ScrapeActorDriver } from '@pagesieve/core/scrapeMachine';
import { type ExtractedGroup, PaginationStateStatus } from '@pagesieve/core/types';
import { SelectorGroup } from '@pagesieve/core';
import { extractWithPlaywright } from './playwrightEngine.js';

// TODO: simplify and improve this function
async function computeHashFromPage(
    page: Page,
    selectors: SelectorGroup[],
): Promise<{ pageHash: string }> {
    let text = '';
    selectors.forEach(async (elem) => {
        if (elem.container) {
            const texts = await page.locator(elem.container).allInnerTexts();
            // logger.debug('Found {count} container elements', { count: texts.length });
            if (texts.length > 0) {
                text += texts.join();
            }
        }
    });

    // if (text.trim() === '') {
    //     text = document.body.innerText.replace(/\s+/g, ' ').trim();
    // }

    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

    const hash = [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

    return { pageHash: hash };
}
export function createPlaywrightDriver(page: Page): ScrapeActorDriver {
    return {
        extractData: fromPromise(async ({ input }) => {
            const results = await extractWithPlaywright(page, input.selectors);
            return results as ExtractedGroup[];
        }),

        computePageHash: fromPromise(
            async ({ input }) => await computeHashFromPage(page, input.selectors),
        ),

        navigateLinks: fromPromise(async ({ input }) => {
            const { config, currentURL } = input;
            const pagination = config.pagination;
            if (pagination.mode !== 'links') {
                throw new Error(
                    `Unable to navigate to Next Link using pagination: ${pagination.mode}`,
                );
            }
            const idx = pagination.pageLinks.findIndex((url: string) => url === currentURL);
            if (idx + 1 >= pagination.pageLinks.length) {
                return { status: PaginationStateStatus.Complete, url: currentURL };
            }
            const nextURL = pagination.pageLinks[idx + 1];
            await page.goto(nextURL, { timeout: config.options.timeoutMs, waitUntil: 'load' });
            return { status: PaginationStateStatus.InProgress, url: nextURL };
        }),

        navigateTemplate: fromPromise(async ({ input }) => {
            const { config, currentURL } = input;
            const pagination = config.pagination;
            if (pagination.mode !== 'template') {
                throw new Error(
                    `Unable to navigate with template using pagination: ${pagination.mode}`,
                );
            }
            const { urlTemplate, startPage, increment } = pagination;

            const escapedTemplate = urlTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pageRegex = new RegExp(escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'));

            let currentPageNum = startPage;
            const match = (currentURL || '').match(pageRegex);
            if (match && match[1]) currentPageNum = parseInt(match[1], 10);

            const nextURL = urlTemplate.replace(
                '{{page}}',
                (currentPageNum + increment).toString(),
            );
            await page.goto(nextURL, { timeout: config.options.timeoutMs, waitUntil: 'load' });
            return { status: PaginationStateStatus.InProgress, url: nextURL };
        }),

        // FIXME: make sure this works properly
        navigateNext: fromPromise(async ({ input }) => {
            const { config, currentURL } = input;
            const pagination = config.pagination;
            if (pagination.mode !== 'next') {
                throw new Error(
                    `Unable to navigate with next using pagination: ${pagination.mode}`,
                );
            }
            const timeoutMs = config.options.timeoutMs;

            let navListener: ((frame: Frame) => void) | undefined;
            const navigationPromise = new Promise<{ type: 'navigation'; url: string }>(
                (resolve) => {
                    navListener = (frame) => {
                        if (frame === page.mainFrame()) {
                            resolve({ type: 'navigation', url: frame.url() });
                        }
                    };
                    page.on('framenavigated', navListener);
                },
            );

            const beforeHash = (await computeHashFromPage(page, config.selectors))?.pageHash;

            const spaPromise = (async () => {
                await page.locator(pagination.nextSelector).click({ timeout: timeoutMs });
                const deadline = Date.now() + timeoutMs;
                while (Date.now() < deadline) {
                    await page.waitForTimeout(200);
                    const hash = (await computeHashFromPage(page, config.selectors))?.pageHash;
                    if (hash !== beforeHash) {
                        return { type: 'spa' as const };
                    }
                }
                throw new Error('SELECTOR NOT FOUND');
            })();
            // Prevent an unhandled-rejection warning if navigationPromise
            // wins the race and this one later fails in the background.
            spaPromise.catch(() => {});

            try {
                const result = await Promise.race([navigationPromise, spaPromise]);

                if (result.type === 'navigation') {
                    console.debug('Using navigation for next pagination');
                    return {
                        type: 'navigation',
                        status: PaginationStateStatus.InProgress,
                        url: result.url,
                    };
                } else {
                    console.debug('Using SPA for next pagination');
                    return {
                        type: 'spa',
                        status: PaginationStateStatus.InProgress,
                        url: currentURL,
                    };
                }
            } finally {
                if (navListener) {
                    page.off('framenavigated', navListener);
                }
            }
        }),
    };
}

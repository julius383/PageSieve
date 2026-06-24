import type { ExtractedGroup } from '@pagesieve/core/types';
import type { MessageRequest } from '@/types';
import type { SelectorGroup } from '@pagesieve/core/schema';
import { DOMInspector } from '@/dominspector.mjs';
import { getLogger } from '@pagesieve/core/logger';
import { initExtensionLogger } from '@/logger';
initExtensionLogger();
import { executeExtraction } from '@pagesieve/core/extractor';
import { browserEngine } from './browserEngine';

const logger = getLogger(['ext', 'content']);
const inspector = new DOMInspector();

/**
 * Waits for the DOM to stop changing for a specified duration
 */
async function waitForDOMStable(
    timeout: number = 5_000,
    stabilityDuration: number = 700,
): Promise<boolean> {
    return new Promise((resolve) => {
        let stabilityTimer: NodeJS.Timeout | null = null;

        const timeoutTimer = setTimeout(() => {
            observer.disconnect();
            if (stabilityTimer) clearTimeout(stabilityTimer);
            logger.debug('timeout timer elapsed');
            resolve(false);
        }, timeout);

        const observer = new MutationObserver(() => {
            if (stabilityTimer) {
                clearTimeout(stabilityTimer);
            }

            stabilityTimer = setTimeout(() => {
                observer.disconnect();
                clearTimeout(timeoutTimer);
                logger.debug('stability timer elapsed');
                resolve(true);
            }, stabilityDuration);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    });
}

/**
 * Extracts data from DOM elements using provided selectors
 */
function extractDataFromPage(selectors: SelectorGroup[]): ExtractedGroup[] {
    return executeExtraction(browserEngine, document, selectors);
}

browser.runtime.onMessage.addListener(async (request: MessageRequest): Promise<unknown> => {
    if (request.action === 'extractData') {
        try {
            const result = extractDataFromPage(request.selectors);
            return {
                result,
                success: true,
            };
        } catch (error) {
            return {
                result: [],
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    } else if (request.action === 'inspector-toggle') {
        if (inspector.isActive && inspector.activePickerId !== request.pickerId) {
            inspector.deactivate();
        }
        inspector.toggle(request.pickerId, request.container);
        return { isActive: inspector.isActive };
    } else if (request.action === 'inspector-accept') {
        const selector = inspector.guessSelector();
        inspector.deactivate();
        return { computedSelector: selector };
    } else if (request.action === 'computePageHash') {
        let text: string = '';

        request.selectors.forEach((elem) => {
            if (elem.container) {
                const containers = browserEngine.querySelectorAll(document.body, elem.container);
                logger.debug('Found {count} container elements', { count: containers.length });
                if (containers.length > 0) {
                    text += containers.map((i) => (i as HTMLElement).innerText).join();
                }
            }
        });

        if (text.trim() === '') {
            text = document.body.innerText.replace(/\s+/g, ' ').trim();
        }

        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

        const hash = [...new Uint8Array(buffer)]
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        return { bodyHash: hash };
    } else if (request.action === 'clickAndWaitForStable') {
        const el = browserEngine.querySelector(document.body, request.selector);
        if (!el) {
            logger.error('Element not found for click: {selector}', {
                selector: request.selector,
            });
            return {
                success: false,
                error: `Element with selector '${request.selector}' not found.`,
            };
        }
        logger.debug('setting up dom stability');

        const stabilityDuration = request.stabilityDuration ?? 700;

        const waitPromise = waitForDOMStable(request.timeout, stabilityDuration);

        (el as HTMLElement).click();

        logger.debug('Click initiated, now waiting for DOM to stabilize...');
        const stable = await waitPromise;

        if (!stable) {
            return {
                success: false,
                error: `DOM did not stabilize within ${request.timeout}ms after click.`,
            };
        }

        logger.debug('DOM is stable after click.');
        return { success: true };
    }
    return false;
});

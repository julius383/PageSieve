import type { ExtractedGroup } from '@/core/types';
import type { MessageRequest } from '@/extension/types';
import type { SelectorGroup } from '@/core/schema';
import { DOMInspector } from '@/extension/dominspector.mjs';
import { getLogger } from '@/core/logger';
import { ExtractionEngine, executeExtraction, isXPath } from '@/core/extractor';

const logger = getLogger(['ext', 'content']);
const inspector = new DOMInspector();

interface QueryOptions {
    context?: Element | Node;
    extractContent?: boolean;
}

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

function extractXpathResult(result: XPathResult) {
    switch (result.resultType) {
        case XPathResult.STRING_TYPE:
            return result.stringValue;
        case XPathResult.NUMBER_TYPE:
            return result.numberValue;
        case XPathResult.BOOLEAN_TYPE:
            return result.booleanValue;
        default:
            return null;
    }
}

function xpathQuerySelectorAll(
    xpath: string,
    { context = document.body, extractContent = true }: QueryOptions = {},
) {
    if (!extractContent) {
        const result = document.evaluate(
            xpath,
            context,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null,
        );

        const nodes = [];
        for (let i = 0; i < result.snapshotLength; i++) {
            nodes.push(result.snapshotItem(i));
        }
        return nodes;
    }
    const result = document.evaluate(xpath, context, null, XPathResult.ANY_TYPE, null);
    const scalar = extractXpathResult(result);
    if (scalar !== null) return [scalar];

    const nodes = [];
    let node;
    while ((node = result.iterateNext())) {
        nodes.push(node.textContent?.trim());
    }
    return nodes;
}

function xpathQuerySelector(
    xpath: string,
    { context = document.body, extractContent = true }: QueryOptions = {},
) {
    if (!extractContent) {
        return document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
            .singleNodeValue;
    }
    const result = document.evaluate(xpath, context, null, XPathResult.ANY_TYPE, null);
    const scalar = extractXpathResult(result);
    if (scalar !== null) return scalar;

    const node = result.iterateNext();
    return node ? node.textContent?.trim() : null;
}

const domEngine: ExtractionEngine<Document | Element, Element> = {
    querySelectorAll: (ctx, sel) => {
        if (isXPath(sel)) {
            return xpathQuerySelectorAll(sel, {
                context: ctx,
                extractContent: false,
            }) as Element[];
        }
        return Array.from((ctx as Element | Document).querySelectorAll(sel));
    },
    querySelector: (ctx, sel) => {
        if (isXPath(sel)) {
            return xpathQuerySelector(sel, {
                context: ctx,
                extractContent: false,
            }) as Element;
        }
        return (ctx as Element | Document).querySelector(sel);
    },
    getAttribute: (el, attr) => el.getAttribute(attr),
    getText: (el) => el.textContent?.trim(),
};

/**
 * Extracts data from DOM elements using provided selectors
 */
function extractDataFromPage(selectors: SelectorGroup[]): ExtractedGroup[] {
    return executeExtraction(domEngine, document, selectors);
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
        inspector.toggle(request.pickerId);
        return { isActive: inspector.isActive };
    } else if (request.action === 'clickElement') {
        const el = document.querySelector<HTMLElement>(request.selector);
        if (!el) {
            console.error('Element not found: ', request.selector);
            return { didNavigate: false };
        }
        el.click();
        return { didNavigate: true };
    } else if (request.action === 'inspector-accept') {
        const selector = inspector.guessSelector();
        inspector.deactivate();
        return { computedSelector: selector };
    } else if (request.action === 'computePageHash') {
        let text: string = '';

        request.selectors.forEach((elem) => {
            if (elem.container) {
                const containers = domEngine.querySelectorAll(document.body, elem.container);
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
        const el = domEngine.querySelector(document.body, request.selector);
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

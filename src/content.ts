import type { MessageRequest, ExtractedGroup, ExtractedRow } from './types';
import type { SelectorGroup } from './schema';
import { DOMInspector } from './dominspector.mjs';

const inspector = new DOMInspector();

type SelectorSingleReturn = string | null | undefined;
type SelectorReturns = SelectorSingleReturn | SelectorSingleReturn[];
type ContextType = Element | Node | null;
type SelectorFunType = (ctx: ContextType) => SelectorReturns;
type StringArrayMap = {
    [key: string]: SelectorReturns;
};

async function bgLog(msg: string) {
    await browser.runtime.sendMessage({
        type: 'LOG',
        message: msg,
    });
}

/**
 * Waits for the DOM to stop changing for a specified duration
 * @param timeout - Maximum time to wait in milliseconds
 * @param stabilityDuration - How long the DOM must be stable in milliseconds
 * @returns Promise that resolves when DOM is stable or timeout is reached
 */
async function waitForDOMStable(
    timeout: number = 5_000,
    stabilityDuration: number = 700, // TODO: make timer configurable
): Promise<boolean> {
    return new Promise((resolve) => {
        let stabilityTimer: NodeJS.Timeout | null = null;

        const timeoutTimer = setTimeout(() => {
            observer.disconnect();
            if (stabilityTimer) clearTimeout(stabilityTimer);
            console.log('timout timer elapsed');
            resolve(false);
        }, timeout);

        const observer = new MutationObserver(() => {
            if (stabilityTimer) {
                clearTimeout(stabilityTimer);
            }

            stabilityTimer = setTimeout(() => {
                observer.disconnect();
                clearTimeout(timeoutTimer);
                console.log('stability timer elapsed');
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

function xpathQuerySelectorAll(xpath: string, context: Element | Node = document.body) {
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

function xpathQuerySelector(xpath: string, context: Element | Node = document.body) {
    return document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
}

function isXPath(selector: string): boolean {
    return selector.startsWith('./') || selector.startsWith('//') || selector.startsWith('../');
}

function pickSelectorFunction(selector: string, type = 'single'): SelectorFunType {
    if (isXPath(selector)) {
        // selector is xpath
        if (type === 'single') {
            return (ctx) => {
                const foundItem = xpathQuerySelector(selector, ctx === null ? document.body : ctx);
                return foundItem?.nodeValue;
            };
        } else {
            return (ctx) => {
                const foundItems = xpathQuerySelectorAll(
                    selector,
                    ctx === null ? document.body : ctx,
                );
                return foundItems.map((i) => i?.nodeValue);
            };
        }
    } else {
        // selector is css
        // img?src - extracts the src attribute from img tag
        const parts = /\?([-a-zA-Z]+)$/gm.exec(selector);
        let attribute = null;
        if (parts != null) {
            attribute = parts[1];
            selector = selector.slice(0, parts.index);
        }
        if (type === 'single') {
            return (ctx) => {
                const foundItem = (ctx as HTMLElement).querySelector(selector);
                return attribute
                    ? foundItem?.getAttribute(attribute)?.trim()
                    : foundItem?.textContent?.trim();
            };
        } else {
            return (ctx) => {
                const foundItems = (ctx as HTMLElement).querySelectorAll(selector);
                return Array.from(foundItems).map((i) => {
                    return attribute ? i?.getAttribute(attribute)?.trim() : i?.textContent?.trim();
                });
            };
        }
    }
}

/**
 * Extracts data from DOM elements using provided selectors
 * @param selectors - Array of selector configurations
 * @returns Array of extracted data objects
 */
function extractDataFromPage(selectors: SelectorGroup[]): ExtractedGroup[] {
    const extractionResults: ExtractedGroup[] = [];

    selectors.forEach(({ id, container, fields }) => {
        if (container) {
            let containerItems;
            if (isXPath(container)) {
                containerItems = xpathQuerySelectorAll(container);
            } else {
                containerItems = document.querySelectorAll(container);
            }
            if (!containerItems) {
                return;
            }
            const rows: ExtractedRow[] = [];
            containerItems.forEach((containerItem) => {
                const fieldData = fields.map(({ name, selector, type }) => {
                    const fn = pickSelectorFunction(selector, type);
                    const value = fn(containerItem);
                    return { [name]: value };
                });
                const row = Object.assign({}, ...fieldData);
                console.dir(row);
                rows.push(row);
            });

            extractionResults.push({ id, results: rows });
        } else {
            // no container so assume no missing fields and zip
            const foundItems: StringArrayMap = {};
            fields.forEach(({ name, selector }) => {
                const fn = pickSelectorFunction(selector, 'array');
                const found = fn(document);
                if (found) {
                    foundItems[name] = found;
                }
            });
            const rows = zipObjectArrays(foundItems as Record<string, unknown[]>) as ExtractedRow[];
            extractionResults.push({ id, results: rows });
        }
    });
    return extractionResults;
}

function zipObjectArrays<T extends Record<string, unknown[]>>(
    obj: T,
): Array<{ [K in keyof T]: T[K][number] }> {
    const keys = Object.keys(obj) as (keyof T)[];
    const length = Math.min(...keys.map((k) => obj[k].length));

    return Array.from(
        { length },
        (_, i) =>
            Object.fromEntries(keys.map((k) => [k, obj[k][i]])) as {
                [K in keyof T]: T[K][number];
            },
    );
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
    } else if (request.action === 'hashBody') {
        const text = document.body.innerText.replace(/\s+/g, ' ').trim();

        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

        const hash = [...new Uint8Array(buffer)]
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        return { bodyHash: hash };
    } else if (request.action === 'clickAndWaitForStable') {
        const el = document.querySelector<HTMLElement>(request.selector);
        if (!el) {
            await bgLog(`Element not found for click:  ${request.selector}`);
            return {
                success: false,
                error: `Element with selector '${request.selector}' not found.`,
            };
        }
        await bgLog(`setting up dom stability`);

        const stabilityDuration = request.stabilityDuration ?? 700;

        const waitPromise = waitForDOMStable(request.timeout, stabilityDuration);

        el.click();

        await bgLog('Click initiated, now waiting for DOM to stabilize...');
        const stable = await waitPromise;

        if (!stable) {
            return {
                success: false,
                error: `DOM did not stabilize within ${request.timeout}ms after click.`,
            };
        }

        await bgLog('DOM is stable after click.');
        return { success: true };
    }
    return false;
});

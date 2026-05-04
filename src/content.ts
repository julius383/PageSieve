import type { MessageRequest, ExtractedGroup, ExtractedRow } from './types';
import type { SelectorGroup } from './schema';
import { DOMInspector } from './dominspector.mjs';

const inspector = new DOMInspector();

type SelectorSingleReturn = string | null | undefined;
type SelectorReturns =
    | SelectorSingleReturn
    | SelectorSingleReturn[]
    | Element
    | NodeListOf<Element>;
type ContextType = Element | Node | null;
type SelectorFunType = (ctx: ContextType) => SelectorReturns;
type StringArrayMap = {
    [key: string]: SelectorReturns;
};

interface QueryOptions {
    context?: Element | Node;
    extractContent?: boolean;
}

interface PickSelectorOptions {
    type?: 'single' | 'array';
    extractContent?: boolean;
}

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

function extractXpathResult(result: XPathResult) {
    switch (result.resultType) {
        case XPathResult.STRING_TYPE: // text() or @attr expressions
            return result.stringValue;
        case XPathResult.NUMBER_TYPE:
            return result.numberValue;
        case XPathResult.BOOLEAN_TYPE:
            return result.booleanValue;
        default: // UNORDERED_NODE_ITERATOR_TYPE or ORDERED_NODE_ITERATOR_TYPE
            return null; // it's a node result, handle separately
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
    console.debug(`Found data of type ${result.resultType} for query ${xpath} in qsa`);
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

    console.debug(`Found data of type ${result.resultType} for query ${xpath} in s`);
    const scalar = extractXpathResult(result);
    if (scalar !== null) return scalar;

    // Otherwise grab the first node
    const node = result.iterateNext();
    return node ? node.textContent?.trim() : null;
}

function parseCSS(expr: string): [string | null, string] {
    // expr is css
    // img?src - extracts the src attribute from img tag
    const parts = /\?([-a-zA-Z]+)$/gm.exec(expr);
    let attribute = null;
    if (parts != null) {
        attribute = parts[1];
        expr = expr.slice(0, parts.index);
    }
    return [attribute, expr];
}

function cssQuerySelector(
    css: string,
    { context = document.body, extractContent = true }: QueryOptions = {},
) {
    const [attribute, selector] = parseCSS(css);

    const foundItem = (context as HTMLElement).querySelector(selector);
    if (!extractContent) return foundItem;

    return attribute ? foundItem?.getAttribute(attribute)?.trim() : foundItem?.textContent?.trim();
}

function cssQuerySelectorAll(
    css: string,
    { context = document.body, extractContent = true }: QueryOptions = {},
) {
    const [attribute, selector] = parseCSS(css);

    const foundItems = (context as HTMLElement).querySelectorAll(selector);

    if (!extractContent) return foundItems;

    return Array.from(foundItems).map((i) => {
        return attribute ? i?.getAttribute(attribute)?.trim() : i?.textContent?.trim();
    });
}

function isXPath(selector: string): boolean {
    return selector.startsWith('./') || selector.startsWith('//') || selector.startsWith('../');
}

function pickSelectorFunction(
    selector: string,
    { type = 'single', extractContent = true }: PickSelectorOptions = {},
): SelectorFunType {
    if (isXPath(selector)) {
        // selector is xpath
        if (type === 'single') {
            return (ctx) => {
                const foundItem = xpathQuerySelector(selector, {
                    context: ctx === null ? document.body : ctx,
                    extractContent,
                });
                return foundItem;
            };
        } else {
            return (ctx) => {
                const foundItems = xpathQuerySelectorAll(selector, {
                    context: ctx === null ? document.body : ctx,
                    extractContent,
                });
                return foundItems;
            };
        }
    } else {
        if (type === 'single') {
            return (ctx) => {
                const foundItem = cssQuerySelector(selector, {
                    context: ctx as HTMLElement,
                    extractContent,
                });
                return foundItem;
            };
        } else {
            return (ctx) => {
                const foundItems = cssQuerySelectorAll(selector, {
                    context: ctx as HTMLElement,
                    extractContent,
                });
                return foundItems;
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
                containerItems = xpathQuerySelectorAll(container, {
                    context: document.body,
                    extractContent: false,
                });
            } else {
                containerItems = cssQuerySelectorAll(container, {
                    context: document.body,
                    extractContent: false,
                });
            }
            if (!containerItems) {
                return;
            }
            const rows: ExtractedRow[] = [];
            containerItems.forEach((containerItem) => {
                const fieldData = fields.map(({ name, selector, type }) => {
                    const fn = pickSelectorFunction(selector, { type });
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
                const fn = pickSelectorFunction(selector, { type: 'array' });
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

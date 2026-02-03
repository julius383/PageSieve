import type { SelectorGroup } from './types';
import { DOMInspector } from './dominspector.mjs';

const inspector = new DOMInspector();

type StringArrayMap = {
    [key: string]: unknown[];
};
type UnknownObject = {
    [key: string]: unknown;
};

type ExtractDataRequest = {
    action: 'extractData';
    selectors: SelectorGroup[];
};

type InspectorToggleRequest = {
    action: 'inspector-toggle';
    pickerId: string;
};

type InspectorAcceptRequest = {
    action: 'inspector-accept';
};

type MessageRequest = ExtractDataRequest | InspectorToggleRequest | InspectorAcceptRequest;

// FIXME: show error when user
function xpathQuerySelectorAll(xpath: string, context: Element | Document = document) {
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

function xpathQuerySelector(xpath: string, context: Element | Document = document) {
    return document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
}

function pickSelectorFunction(selector: string, type = 'single') {
    if (selector.startsWith('./') || selector.startsWith('//')) {
        // selector is xpath
        if (type === 'single') {
            return (ctx: Element | Document) => {
                const foundItem = xpathQuerySelector(selector, ctx);
                return foundItem?.nodeValue;
            };
        } else {
            return (ctx: Element | Document) => {
                const foundItems = xpathQuerySelectorAll(selector, ctx);
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
            return (item: Element | Document) => {
                const foundItem = item.querySelector(selector);
                return attribute
                    ? foundItem?.getAttribute(attribute)?.trim()
                    : foundItem?.textContent?.trim();
            };
        } else {
            return (item: Element | Document) => {
                const foundItems = item.querySelectorAll(selector);
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
function extractDataFromPage(
    selectors: SelectorGroup[],
): { id: number; results: UnknownObject[] }[] {
    console.log('Attempting to extract data with');
    console.dir(selectors);
    const extractionResults: { id: number; results: UnknownObject[] }[] = [];

    selectors.forEach(({ id, container, fields }) => {
        if (container) {
            const containerItems = document.querySelectorAll(container);
            const rows: UnknownObject[] = [];
            containerItems.forEach((containerItem) => {
                const fieldData = fields.map(({ name, selector, type }) => {
                    const fn = pickSelectorFunction(selector, type);
                    const value = fn(containerItem);
                    return { [name]: value };
                });
                console.log('found the following data');
                const row = Object.assign({}, ...fieldData);
                console.dir(row);
                rows.push(row);
            });

            extractionResults.push({ id, results: rows });
        } else {
            // no container so assume no missing fields and zip
            const foundItems: StringArrayMap = {};
            fields.forEach(({ name, selector }) => {
                try {
                    const fn = pickSelectorFunction(selector, 'array');
                    const found = fn(document);
                    if (found) {
                        foundItems[name] = found;
                    }
                } catch (error) {
                    // FIXME: improve error handling here
                    console.error(`Error with selector "${selector}":`, error);
                }
            });
            const rows = zipObjectArrays(foundItems);
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

browser.runtime.onMessage.addListener(
    (
        request: MessageRequest,
        sender: browser.runtime.MessageSender,
        sendResponse: (response: any) => void,
    ): boolean => {
        if (request.action === 'extractData') {
            try {
                const result = extractDataFromPage(request.selectors);
                sendResponse({
                    result,
                    success: true,
                });
            } catch (error) {
                console.error('Failed to extract data:', error);
                sendResponse({
                    result: [],
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error occurred',
                });
            }
            return true;
        } else if (request.action === 'inspector-toggle') {
            if (inspector.isActive && inspector.activePickerId !== request.pickerId) {
                inspector.deactivate();
            }
            inspector.toggle(request.pickerId);
            sendResponse({ isActive: inspector.isActive });
            return true;
        } else if (request.action === 'inspector-accept') {
            const selector = inspector.guessSelector();
            inspector.deactivate();
            sendResponse({ computedSelector: selector });
            return true;
        }

        // Not handling this message type
        return false;
    },
);

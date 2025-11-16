interface SelectorConfig {
    id: number;
    name: string;
    selector: string;
}

/**
 * Extracts data from DOM elements using provided selectors
 * @param selectors - Array of selector configurations
 * @param parentSelector - Optional parent container selector
 * @returns Array of extracted data objects
 */
function extractDataFromPage(selectors: SelectorConfig[]): any {
    // Validate input
    if (!selectors || selectors.length === 0) {
        console.warn('No selectors provided');
        return null;
    }

    type StringArrayMap = {
        [key: string]: string[];
    };
    const foundItems: StringArrayMap = {};
    console.log('Attempting to extract data with');
    console.dir(selectors);

    selectors.forEach(({ name, selector }) => {
        const items: string[] = [];
        const parts = /\?(\w+)$/gm.exec(selector);
        let attribute: string;
        if (parts != null) {
            attribute = parts[1];
            selector = selector.slice(0, parts.index);
        }
        try {
            const found = document.querySelectorAll(selector);
            found.forEach((item, _) => {
                if (attribute) {
                    // TODO: add special handling for different attributes such as using full URL for href
                    items.push(item.getAttribute(attribute));
                } else {
                    items.push(item.textContent?.trim());
                }
                foundItems[name] = items;
            });
        } catch (error) {
            console.error(`Error with selector "${selector}":`, error);
        }
    });
    return foundItems;
}

function zipObjectArrays<T extends Record<string, any[]>>(
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
        request: any,
        sender: browser.runtime.MessageSender,
        sendResponse: (response: any) => void,
    ): boolean => {
        if (request.action === 'extractData') {
            try {
                const data = extractDataFromPage(request.selectors);
                const result = zipObjectArrays(data);
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

            // Return true to indicate async response
            return true;
        }

        // Not handling this message type
        return false;
    },
);

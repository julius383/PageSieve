import type { SelectorGroup } from './types';
import { DOMInspector } from './dominspector.mjs';

const inspector = new DOMInspector();

/**
 * Extracts data from DOM elements using provided selectors
 * @param selectors - Array of selector configurations
 * @returns Array of extracted data objects
 */
function extractDataFromPage(selectors: SelectorGroup[]): any {

    type StringArrayMap = {
        [key: string]: string[];
    };
    type UnknownObject = {
        [key: string]: unknown
    }
    console.log('Attempting to extract data with');
    console.dir(selectors);
    const extractionResults: {id: number, results: UnknownObject[]}[] = []

    selectors.forEach(({ id, container, fields }) => {
        if (container) {
            const containerItems = document.querySelectorAll(container);
            const rows: UnknownObject[] = []
            containerItems.forEach((containerItem) => {
                const fieldData = fields.map(({name, selector}) => {
                    const parts = /\?(\w+)$/gm.exec(selector);
                    let attribute = null;
                    if (parts != null) {
                        attribute = parts[1];
                        selector = selector.slice(0, parts.index);
                    }
                    // TODO: add xpath support
                    const foundItem = containerItem.querySelector(selector);
                    const value = attribute ? foundItem?.getAttribute(attribute)?.trim() : foundItem?.textContent?.trim();
                    return {[name]: value};
                })
                const row = { ...fieldData };
                rows.push(row);
            });

            extractionResults.push({id, results: rows});
        } else {
            // no container so assume no missing fields and zip
            const foundItems: StringArrayMap = {};
            fields.forEach(({name, selector}) => {

                const items: string[] = [];
                const parts = /\?(\w+)$/gm.exec(selector);
                let attribute: string;
                if (parts != null) {
                    attribute = parts[1];
                    selector = selector.slice(0, parts.index);
                }
                try {
                    const found = document.querySelectorAll(selector);
                    found.forEach((item) => {
                        if (attribute) {
                            // TODO: add special handling for different attributes such as using full URL for href
                            const attr = item.getAttribute(attribute);
                            items.push(attr ?? '');
                        } else {
                            items.push(item.textContent?.trim());
                        }
                        foundItems[name] = items;
                    });
                } catch (error) {
                    // FIXME: improve error handling here
                    console.error(`Error with selector "${selector}":`, error);
                }
            });

            const rows = zipObjectArrays(foundItems);
            extractionResults.push({id, results: rows})
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

let dialogContainer: HTMLElement | null = null;

// Removes any existing dialog
function cleanup() {
    if (dialogContainer) {
        dialogContainer.remove();
        dialogContainer = null;
    }
}

browser.runtime.onMessage.addListener(
    (
        request: any,
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
        } else if (request.action === 'showConfirmation') {
            cleanup();

            // Create container + shadow root
            dialogContainer = document.createElement('div');
            dialogContainer.id = 'extension-confirmation-dialog';
            const shadow = dialogContainer.attachShadow({ mode: 'closed' });
            document.body.appendChild(dialogContainer);

            // Inject styles + dialog markup
            shadow.innerHTML = `
                <style>
                .backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999999;
                font-family: sans-serif;
                }

                .dialog {
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 350px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.25);
                animation: fadeIn 0.2s ease;
                }

                .title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 8px;
                color: black;
                }

                .message {
                margin-bottom: 16px;
                color: black;
                }

                .buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                }

                button {
                padding: 6px 12px;
                border: none;
                cursor: pointer;
                border-radius: 4px;
                font-size: 14px;
                }

                .confirm {
                background: #d62828;
                color: white;
                }

                .cancel {
                background: #ccc;
                }

                @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to   { opacity: 1; transform: scale(1); }
                }
                </style>

                <div class="backdrop">
                    <div class="dialog">
                        <div class="title">${request.data.title}</div>
                        <div class="message">${request.data.message}</div>
                        <div class="buttons">
                            <button class="cancel">${request.data.cancelText}</button>
                            <button class="confirm">${request.data.confirmText}</button>
                        </div>
                    </div>
                </div>
                `;

            const confirmBtn = shadow.querySelector('.confirm') as HTMLButtonElement;
            const cancelBtn = shadow.querySelector('.cancel') as HTMLButtonElement;
            const backdrop = shadow.querySelector('.backdrop') as HTMLDivElement;

            confirmBtn.onclick = () => {
                cleanup();
                sendResponse({ confirmed: true });
            };

            cancelBtn.onclick = () => {
                cleanup();
                sendResponse({ confirmed: false });
            };

            // Clicking outside closes (optional)
            backdrop.onclick = (e) => {
                if (e.target === backdrop) {
                    cleanup();
                    sendResponse({ confirmed: false });
                }
            };

            return true; // keep sendResponse alive
        }

        // Not handling this message type
        return false;
    },
);

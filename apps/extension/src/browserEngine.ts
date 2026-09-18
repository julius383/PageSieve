import { match } from 'ts-pattern';
import { ExtractionEngine, isXPath } from '@pagesieve/core/extractor';
import type { PropertyType } from '@pagesieve/core';

interface QueryOptions {
    context?: Element | Node;
    extractContent?: boolean;
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

export const browserEngine: ExtractionEngine<Document | Element, Element> = {
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
    getAttribute: (el, attr) => {
        let v = el.getAttribute(attr);
        // TODO: make this configurable as extension settings
        if ((attr == 'href' || attr == 'src') && v?.startsWith('/')) {
            const l = window.location;
            if (l !== undefined) {
                const urlBase = `${l.protocol}//${l.host}`
                v = urlBase + v;
            }
        }
        return v;
    },
    getText: (el) => el.textContent?.trim(),
    getProperty: (el, prop: PropertyType) => {
        return match(prop)
            .with('innerHTML', () => el?.innerHTML.trim())
            .with('outerHTML', () => el?.outerHTML.trim())
            .with('textContent', () => el?.textContent.trim())
            .with('innerText', () => (el as HTMLElement)?.innerText.trim())
            .exhaustive();
    },
};

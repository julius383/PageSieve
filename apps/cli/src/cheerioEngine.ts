/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheerioAPI, Cheerio } from 'crawlee';
import { ExtractionEngine, executeExtraction } from '@pagesieve/core/extractor';
import { SelectorGroup } from '@pagesieve/core/schema';
import { ExtractedGroup } from '@pagesieve/core/types';

export const cheerioEngine: ExtractionEngine<CheerioAPI | Cheerio<any>, Cheerio<any>> = {
    querySelectorAll: (ctx, sel) => {
        const result = (ctx as any).find ? (ctx as any).find(sel) : (ctx as any)(sel);
        const items = [];
        for (let i = 0; i < result.length; i++) {
            items.push(result.eq(i));
        }
        return items;
    },
    querySelector: (ctx, sel) => {
        const result = (ctx as any).find
            ? (ctx as any).find(sel).first()
            : (ctx as any)(sel).first();
        return result.length > 0 ? result : null;
    },
    getAttribute: (el, attr) => el.attr(attr),
    getText: (el) => el.text().trim(),
    getProperty: (el, prop) => el.prop(prop),
};

export async function extractWithCheerio(
    $: CheerioAPI,
    selectors: SelectorGroup[],
): Promise<ExtractedGroup[]> {
    return executeExtraction(cheerioEngine, $, selectors);
}

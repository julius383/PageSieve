/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page, Locator } from 'playwright';
import { match } from 'ts-pattern';
import { ExtractionEngine, executeExtraction, isXPath } from '@pagesieve/core/extractor';
import type { PropertyType } from '@pagesieve/core/schema';
import { SelectorGroup } from '@pagesieve/core/schema';
import { ExtractedGroup } from '@pagesieve/core/types';

function toPlaywrightSelector(selector: string): string {
    return isXPath(selector) ? `xpath=${selector}` : selector;
}

export const playwrightEngine: ExtractionEngine<Page | Locator, Locator> = {
    querySelectorAll: async (ctx, sel) => {
        const locator = ctx.locator(toPlaywrightSelector(sel));
        return locator.all(); // array of Locators, one per match
    },

    querySelector: async (ctx, sel) => {
        const locator = ctx.locator(toPlaywrightSelector(sel)).first();
        const count = await locator.count();
        return count > 0 ? locator : null;
    },
    getAttribute: async (el, attr) => {
        let v = await el.getAttribute(attr);

        // TODO: make this configurable as extension settings (mirrors browserEngine)
        if ((attr === 'href' || attr === 'src') && v?.startsWith('/')) {
            // Resolve relative to the owning page's current URL rather than
            // reaching for `window.location`, since there's no ambient window here.
            const page = el.page();
            const base = new URL(page.url());
            v = `${base.protocol}//${base.host}${v}`;
        }

        return v;
    },

    getText: async (el) => {
        const text = await el.textContent();
        return text?.trim();
    },

    getProperty: async (el, prop: PropertyType) => {
        return match(prop)
            .with('innerHTML', () => el.innerHTML())
            .with('outerHTML', () => el.evaluate((node) => node.outerHTML))
            .with('textContent', async () => ((await el.textContent()) ?? '').trim())
            .with('innerText', () => el.innerText())
            .exhaustive()
            .then((v) => (typeof v === 'string' ? v.trim() : v));
    },
};

export async function extractWithPlaywright(
    page: Page,
    selectors: SelectorGroup[],
): Promise<ExtractedGroup[]> {
    return await executeExtraction(playwrightEngine, page, selectors);
}

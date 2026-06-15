import { parseCSS, zipObjectArrays } from './util';
import type { ExtractedGroup, ExtractedRow } from './types';
import type { SelectorGroup, SelectorDefinition } from './schema';

export interface ExtractionEngine<TContext, TElement> {
    querySelectorAll(context: TContext | TElement, selector: string): TElement[];
    querySelector(context: TContext | TElement, selector: string): TElement | null;
    getAttribute(element: TElement, attr: string): string | null | undefined;
    getText(element: TElement): string | null | undefined;
}

/**
 * High-level extraction logic that can be reused across different environments.
 */
export function executeExtraction<TContext, TElement>(
    engine: ExtractionEngine<TContext, TElement>,
    rootContext: TContext,
    selectors: SelectorGroup[],
): ExtractedGroup[] {
    const extractionResults: ExtractedGroup[] = [];

    selectors.forEach(({ id, container, fields }) => {
        if (container) {
            const containerItems = engine.querySelectorAll(rootContext, container);
            const rows: ExtractedRow[] = [];

            containerItems.forEach((containerItem) => {
                const fieldData = fields.map((field) => {
                    const value = extractField(engine, containerItem, field);
                    return { [field.name]: value };
                });
                rows.push(Object.assign({}, ...fieldData));
            });

            extractionResults.push({ id, results: rows });
        } else {
            const foundItems: Record<string, (string | null | undefined)[]> = {};
            fields.forEach((field) => {
                const values = extractField(engine, rootContext, field, true);
                foundItems[field.name] = Array.isArray(values) ? values : [values];
            });

            const rows = zipObjectArrays(foundItems) as ExtractedRow[];
            extractionResults.push({ id, results: rows });
        }
    });

    return extractionResults;
}

function extractField<TContext, TElement>(
    engine: ExtractionEngine<TContext, TElement>,
    context: TContext | TElement,
    field: SelectorDefinition,
    forceArray = false,
): (string | null | undefined) | (string | null | undefined)[] {
    const [attr, selector] = parseCSS(field.selector);
    const isArray = forceArray || field.type === 'array';

    if (isArray) {
        const elements = engine.querySelectorAll(context, selector);
        return elements.map((el) => (attr ? engine.getAttribute(el, attr) : engine.getText(el)));
    } else {
        const element = engine.querySelector(context, selector);
        if (!element) return null;
        return attr ? engine.getAttribute(element, attr) : engine.getText(element);
    }
}

export function isXPath(selector: string): boolean {
    return (
        selector.startsWith('./') ||
        selector.startsWith('//') ||
        selector.startsWith('../') ||
        selector.startsWith('(') ||
        selector.startsWith('/')
    );
}

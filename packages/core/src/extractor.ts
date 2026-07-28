import { zipObjectArrays } from './util';
import { match } from 'ts-pattern';
import type { ExtractedGroup, ExtractedRow } from './types';
import type { SelectorGroup, FieldType } from './schema';

export interface ExtractionEngine<TContext, TElement> {
    querySelectorAll(context: TContext | TElement, selector: string): TElement[];
    querySelector(context: TContext | TElement, selector: string): TElement | null;
    getAttribute(element: TElement, attr: string): string | null | undefined;
    getText(element: TElement): string | null | undefined;
    getProperty(element: TElement, prop: string): string | null | undefined;
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
    field: FieldType,
    forceArray = false,
): (string | null | undefined) | (string | null | undefined)[] {
    const isArray = forceArray || field.type === 'multiple';

    if (isArray) {
        const elements =
            field.selector === '.'
                ? [context as TElement]
                : engine.querySelectorAll(context, field.selector);
        return elements.map((el) => {
            return match(field.extract)
                .with('text', () => engine.getText(el))
                .with('property', () => engine.getProperty(el, field.property as string))
                .with('attribute', () => engine.getAttribute(el, field.attribute as string))
                .exhaustive();
        });
    } else {
        let element: TElement | null = null;
        if (field.selector === '.') {
            element = context as TElement;
        } else {
            element = engine.querySelector(context, field.selector);
        }
        if (element == null) return null;

        return match(field.extract)
            .with('text', () => engine.getText(element))
            .with('property', () => engine.getProperty(element, field.property as string))
            .with('attribute', () => engine.getAttribute(element, field.attribute as string))
            .exhaustive();
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

import { zipObjectArrays } from './util';
import { match } from 'ts-pattern';
import type { ExtractedGroup, ExtractedRow } from './types';
import type { SelectorGroup, FieldType } from './schema';

type MaybePromise<T> = T | Promise<T>;

export interface ExtractionEngine<TContext, TElement> {
    querySelectorAll(context: TContext | TElement, selector: string): MaybePromise<TElement[]>;
    querySelector(context: TContext | TElement, selector: string): MaybePromise<TElement | null>;
    getAttribute(element: TElement, attr: string): MaybePromise<string | null | undefined>;
    getText(element: TElement): MaybePromise<string | null | undefined>;
    getProperty(element: TElement, prop: string): MaybePromise<string | null | undefined>;
}

/**
 * High-level extraction logic that can be reused across different environments.
 */
export async function executeExtraction<TContext, TElement>(
    engine: ExtractionEngine<TContext, TElement>,
    rootContext: TContext,
    selectors: SelectorGroup[],
): Promise<ExtractedGroup[]> {
    const extractionResults: ExtractedGroup[] = [];

    for (const { id, name, container, fields } of selectors) {
        if (container) {
            const containerItems = await engine.querySelectorAll(rootContext, container);
            const rows: ExtractedRow[] = await Promise.all(
                containerItems.map(async (containerItem) => {
                    const fieldData = await Promise.all(
                        fields.map(async (field) => {
                            const value = await extractField(engine, containerItem, field);
                            return { [field.name]: value };
                        }),
                    );
                    return Object.assign({}, ...fieldData);
                }),
            );

            // TODO: make it configurable to either use ID or Group name for results
            extractionResults.push({ id: name, results: rows });
        } else {
            const foundItems: Record<string, (string | null | undefined)[]> = {};
            await Promise.all(
                fields.map(async (field) => {
                    const values = await extractField(engine, rootContext, field, true);
                    // @ts-expect-error : type check this later
                    foundItems[field.name] = Array.isArray(values) ? values : [values];
                }),
            );

            const rows = zipObjectArrays(foundItems) as ExtractedRow[];
            extractionResults.push({ id: name, results: rows });
        }
    }

    return extractionResults;
}

async function extractField<TContext, TElement>(
    engine: ExtractionEngine<TContext, TElement>,
    context: TContext | TElement,
    field: FieldType,
    forceArray = false,
): Promise<(string | number | null | undefined) | (string | number | null | undefined)[]> {
    if (field.type === 'multiple' || forceArray) {
        const elements =
            field.selector === '.'
                ? [context as TElement]
                : await engine.querySelectorAll(context, field.selector);
        return await Promise.all(
            elements.map((el) => resolveFieldValue(engine, el, field)),
        );
    } else if (field.type === 'single') {
        let element: TElement | null = null;
        if (field.selector === '.') {
            element = context as TElement;
        } else {
            element = await engine.querySelector(context, field.selector);
        }
        return element ? resolveFieldValue(engine, element, field) : null;
    } else if (field.type === 'count') {
        const elements = await engine.querySelectorAll(context, field.selector);
        return elements ? elements.length : null;
    }
}

async function resolveFieldValue<TContext, TElement>(
    engine: ExtractionEngine<TContext, TElement>,
    element: TElement,
    field: FieldType,
) {
    return match(field.extract)
        .with('text', () => engine.getText(element))
        .with('property', () => engine.getProperty(element, field.property as string))
        .with('attribute', () => engine.getAttribute(element, field.attribute as string))
        .exhaustive();

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

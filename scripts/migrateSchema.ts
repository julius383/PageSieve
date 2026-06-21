#!/usr/bin/env bun
import { parseArgs } from 'util';
import { ScrapeConfig } from '../packages/core/src/schema';
import { omit } from 'es-toolkit';
import { nanoid } from 'nanoid'
import * as z from 'zod';

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        file: {
            type: 'string',
        },
        write: {
            type: 'boolean',
        },
    },
    strict: true,
    allowPositionals: true,
});

const file = Bun.file(values.file);
const json = await file.json();


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


function isXPath(selector: string): boolean {
    return (
        selector.startsWith('./') ||
        selector.startsWith('//') ||
        selector.startsWith('../') ||
        selector.startsWith('(') ||
        selector.startsWith('/')
    );
}

function transformSelector(selector: string) {
    if (isXPath(selector)) {
        return {
            selector: selector,
            extract: 'text',
        }
    } else {
        const [attr, sel] = parseCSS(selector);
        return {
            selector: sel,
            ...(attr === null ? { extract: 'text' } :  { extract: 'attribute', attribute: attr } )
        }
    }
}

const migrateV1toV2 = (data) => ({
    id: data.config.metadata.id,
    schemaVersion: '2.0.0',
    revision: 1,

    url: data.config.metadata.url,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,

    ...(data.config.metadata.author !== undefined && { author: data.config.metadata.author }),
    ...(data.config.metadata.description !== undefined && { description: data.config.metadata.description }),


    selectors: data.config.selectors.map((elem) => {
        return {
            id: `g_${nanoid(6)}`,
            ...(elem.name !== undefined && { name: elem.name }),
            ...(elem.container !== undefined && { container: elem.container }),
            fields: elem.fields.map((field) => ({
                id: `f_${nanoid(6)}`,
                name: field.name,
               ...(transformSelector(field.selector)),
                type: field.type == 'array' ? 'multiple' : 'single',
                required: false,
            }))
        }

    }),
    options: { ...omit(data.options, ['delayMs']), pageDelayMs: data.config.options.delayMs },
    pagination: data.config.pagination,
    ...(data.config.variables !== undefined && { variables: data.config.variables }),
})

const result = ScrapeConfig.safeParse(migrateV1toV2(json));
if (!result.success) {
    console.log(`Found Errors in ${values.file}`);
    console.log(z.prettifyError(result.error));
    console.dir(json, { depth: null });
} else {
    console.log(`No Errors on ${values.file}`);
    if (values.write) {
        await Bun.write(values.file, JSON.stringify(result.data, null, 4));
    }
    // console.dir(result.data, { depth: null });
}
console.log('---------------------------------')

import { zipObject } from 'es-toolkit';
import { Parser } from '@json2csv/plainjs';
import type { SelectorGroup } from '@/core/schema';
import type { SupportedExportDataTypes } from '@/core/types';
// @ts-expect-error: handlebars integration through vite plugin
import htmlTemplate from '@/extension/ui/sidebar/templates/htmltemplate.hbs';
// @ts-expect-error: handlebars integration through vite plugin
import mdTemplate from '@/extension/ui/sidebar/templates/mdtemplate.hbs';

function escapeCell(value: unknown) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\') // backslashes first (must be before other escapes)
        .replace(/\|/g, '\\|') // pipes
        .replace(/\n/g, '&#10;'); // newlines
}


export function convertTo(data: object[], format: SupportedExportDataTypes): string {
    if (data.length == 0) {
        return '';
    }
    switch (format) {
        case 'json': {
            return JSON.stringify(data);
        }
        case 'ndjson': {
            const items = data.map((x) => JSON.stringify(x));
            return items.join('\n');
        }
        case 'csv': {
            const parser = new Parser();
            const csv = parser.parse(data);
            return csv;
        }
        case 'html': {
            const columns = Object.keys(data[0]);
            const result = htmlTemplate({ columns, rows: data });
            return result;
        }
        case 'markdown': {
            const columns = Object.keys(data[0]) as string[];
            // eslint-disable-next-line
            const escaped = data.map((row: Record<string, any>) => {
                const newVals = columns.map((col) => escapeCell(row[col]));
                return zipObject(columns, newVals);
            });
            const result = mdTemplate({
                columns,
                rows: escaped,
            });
            // restore newline escape
            return result.replace(/&amp;#10;/g, '&#10;');
        }
    }
}

export function getMimeType(type: SupportedExportDataTypes) {
    switch (type) {
        case 'json':
            return 'application/json';
        case 'ndjson':
            return 'application/x-ndjson';
        case 'csv':
            return 'text/csv';
        case 'html':
            return 'application/html';
        case 'markdown':
            return 'text/markdown';
    }
}

// Characters not allowed in filenames across major OSes
// eslint-disable-next-line no-control-regex
const INVALID_CHARS = new RegExp('[<>:"/\\\\|?*\\x00-\\x1F]', 'g');

export function sanitizeSegment(input: string): string {
    return input
        .normalize('NFKD') // normalize unicode
        .replace(INVALID_CHARS, '') // remove illegal chars
        .replace(/\s+/g, '-') // spaces → dashes
        .replace(/-+/g, '-') // collapse dashes
        .replace(/^\.+|\.+$/g, '') // trim dots
        .replace(/^[-_]+|[-_]+$/g, '') // trim separators
        .toLowerCase();
}

/**
 * Guesses a unique part of a URL
 */
export function createPathSlug(url: string): string {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter((s) => s && s !== 'index.html');
    return segments
        .slice(-2)
        .join('-')
        .replace(/\.[^.]+$/, '');
}

/**
 * Computes SHA-256 hash of an object
 */
export async function shortHash(data: object): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Take first 4 bytes (8 hex chars) for readability
    return hashArray
        .slice(0, 4)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function generateConfigId(url: string, selectors: SelectorGroup[]): Promise<string> {
    const contentHashShort = await shortHash(selectors);

    const domain = new URL(url).hostname.replace('www.', '');
    const pathslug = createPathSlug(url);

    let filename = [domain, pathslug, contentHashShort].map((s) => sanitizeSegment(s)).join('__');
    filename = filename.slice(0, 200);
    return filename;
}


export function validateSelectors(selectors: SelectorGroup[]): boolean {
    const allFields = selectors.flatMap((item) => item.fields);
    return allFields.some((f) => f.name && f.selector);
}


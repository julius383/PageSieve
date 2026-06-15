import { zipObject } from 'es-toolkit';
import { Parser } from '@json2csv/plainjs';
import type { SupportedExportDataTypes } from './types';
// @ts-expect-error: handlebars integration through vite plugin
import htmlTemplate from './templates/htmltemplate.hbs';
// @ts-expect-error: handlebars integration through vite plugin
import mdTemplate from './templates/mdtemplate.hbs';

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

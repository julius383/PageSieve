import { stringify } from 'yaml';
import { Parser } from '@json2csv/plainjs';
import type { SupportedExportDataTypes } from './types';

export interface TableData {
    columns: string[];
    rows: object[];
}

function escapeMd(value: unknown) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\') // backslashes first (must be before other escapes)
        .replace(/\|/g, '\\|') // pipes
        .replace(/\r?\n/g, '&#10;'); // newlines
}

function escapeHtml(s: unknown) {
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

type Row = Record<string, unknown>;

export function toHtmlTable(rows: Row[], columns = Object.keys(rows[0] ?? {})) {
    const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
    const body = rows
        .map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(r[c])}</td>`).join('')}</tr>`)
        .join('\n');
    return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

export function toMarkdownTable(rows: Row[], columns = Object.keys(rows[0] ?? {})) {
    const line = (cells: unknown[]) => `| ${cells.map(escapeMd).join(' | ')} |`;
    return [
        line(columns),
        line(columns.map(() => '---')),
        ...rows.map((r) => line(columns.map((c) => r[c]))),
    ].join('\n');
}

export function convertTo(data: Row[], format: SupportedExportDataTypes): string {
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
            const result = toHtmlTable(data, columns);
            return result;
        }
        case 'markdown': {
            const columns = Object.keys(data[0]) as string[];
            const result = toMarkdownTable(data, columns);
            return result;
        }
        case 'yaml': {
            return stringify(data);
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
        case 'yaml':
            return 'application/yaml';
    }
}

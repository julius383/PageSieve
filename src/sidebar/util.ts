import { Parser } from '@json2csv/plainjs';
import type { SelectorGroup, StatusLevel } from '../types';
import { extensionStatus } from './stores/ui.svelte';

// Helper function to capitalize column names
export function formatColumnName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export function downloadJSON(data: object, filename: string = 'data.json') {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function downloadCSV(data: object, filename: string = 'data.csv') {
    try {
        const parser = new Parser();
        const csv = parser.parse(data);

        const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', filename);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (err) {
        console.error(err);
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

export function getIndicatorColor(status: StatusLevel): { label: string; style: string;} {
    const capitalize = (str: string) =>  str.charAt(0).toUpperCase() + str.slice(1)
    switch (status) {
        case 'idle':
            return { label: capitalize(status) ,style: '#CBD5E1'}
        case 'running':
        case 'extracting':
        case 'inspecting':
        case 'navigating':
            return { label: capitalize(status), style: '#3B82F6'}
        case 'saving':
        case 'loading':
        case 'importing':
        case 'exporting':
            return { label: capitalize(status), style: '#FBBF24'}
        case 'errored':
            return { label: capitalize(status), style: '#F87171'}
        default:
            return { label: capitalize(status) ,style: '#CBD5E1'}
    }
}

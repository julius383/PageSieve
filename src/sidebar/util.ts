import { Parser } from '@json2csv/plainjs';


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


/**
 * Removes characters illegal in filenames
 *
 * @param {string} str - string to sanitize
 * @returns {string} string with illegal characters
 */
export function sanitizeForFilename(str: string) {
    return str
        .replace(/[^.a-zA-Z0-9\-_]/g, '')
        .replace(/^\.+/, '')
        .replace(/\.+$/, '');
}


/**
 * Guesses a unique part of a URL
 *
 * @param {string} url - full web page URL
 * @returns {string} - substring of URL
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
 *
 * @param {object} data - object hash
 * @returns {string} - hex substring of hash
 */
export async function shortHash(data:object): Promise<string> {
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

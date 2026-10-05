import type { SelectorGroup } from './schema';
import { isXPath } from './extractor';

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

export function normalizeUrl(url: string) {
    const u = new URL(url);

    // Strip fragment (hash)
    u.hash = '';

    // Optional: strip trailing slash for consistency
    u.pathname = u.pathname.replace(/\/$/, '') || '/';

    return u.toString();
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

type ValidationResult = { valid: true } | { valid: false; error: string };
type Validation = ValidationResult & { id: string };

export function validateSelectors(selectors: SelectorGroup[]): Record<string, Validation[]> {
    const validations: Validation[] = [];
    for (const group of selectors) {
        // validate container
        if (group.container != null && group.container != '') {
            const valid = { id: group.id, ...isValidSelector(group.container) };
            validations.push(valid);
        } else {
            validations.push({ id: group.id, valid: true });
        }
        // validate fields
        for (const field of group.fields) {
            validations.push({
                id: field.id,
                ...(field.name
                    ? { valid: true }
                    : { valid: false, error: 'Field name cannot be empty' }),
            });
            const valid = { id: field.id, ...isValidSelector(field.selector) };
            validations.push(valid);
        }
    }
    return Object.groupBy(validations, ({ id }) => id) as Record<string, Validation[]>;
}

export function isValidSelector(selector: string): ValidationResult {
    if (!selector || selector.trim() === '') {
        return { valid: false, error: 'Selector cannot be empty' };
    }
    if (selector.trim() === '.') {
        // special self container selector see docs/reference/selectors.qmd
        return { valid: true };
    }
    try {
        if (typeof document !== 'undefined') {
            if (isXPath(selector)) {
                document.createExpression(selector);
            } else {
                document.createDocumentFragment().querySelector(selector);
            }
        }
        return { valid: true };
    } catch (err) {
        if (err instanceof DOMException) {
            return {
                valid: false,
                error: 'Invalid selector',
            };
        }
        return {
            valid: false,
            error: err instanceof Error ? err.message : 'Invalid CSS selector syntax',
        };
    }
}

export function zipObjectArrays<T extends Record<string, unknown[]>>(
    obj: T,
): Array<{ [K in keyof T]: T[K][number] }> {
    const keys = Object.keys(obj) as (keyof T)[];
    const length = Math.min(...keys.map((k) => obj[k].length));

    return Array.from(
        { length },
        (_, i) =>
            Object.fromEntries(keys.map((k) => [k, obj[k][i]])) as {
                [K in keyof T]: T[K][number];
            },
    );
}

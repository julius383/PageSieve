import { SupportedExportDataTypesSchema } from '../../../apps/cli/src/commands';

export enum PaginationStateStatus {
    InProgress = 1,
    Complete,
    Failed,
}

/**
 * Represents a single row of extracted data.
 */
export type ExtractedRow = Record<
    string,
    string | number | boolean | null | undefined | (string | number | boolean | null | undefined)[]
>;

/**
 * Represents a group of extracted data, typically corresponding to a SelectorGroup.
 */
export interface ExtractedGroup {
    id: string;
    results: ExtractedRow[];
}

const dataTypes = ['json', 'ndjson', 'csv', 'html', 'markdown', 'yaml'] as const;
const nonNestableTypes = ['ndjson', 'csv'] as const;

export type SupportedExportDataTypes = (typeof dataTypes)[number];
export type NonNestableExportDataTypes = (typeof nonNestableTypes)[number];

export function isSupportedExportType(value: string): value is SupportedExportDataTypes {
    return (dataTypes as readonly string[]).includes(value);
}

export function isNestableType(value: string): value is NonNestableExportDataTypes {
    return (
        (dataTypes as readonly string[]).includes(value) &&
        !(nonNestableTypes as readonly string[]).includes(value)
    );
}

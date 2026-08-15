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

export type SupportedExportDataTypes = 'json' | 'ndjson' | 'csv' | 'html' | 'markdown' | 'yaml';

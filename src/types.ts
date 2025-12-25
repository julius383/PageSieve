export interface Metadata {
    id: string;
    description?: string;
    url: string;
    version: string;
    author?: string;

    selectorCount?: number;
    lastRunAt?: number; // timestamp
}

export type VariableType = 'string' | 'number' | 'boolean' | 'list' | 'enum' | 'json';

export interface VariableDefinition {
    type: VariableType;
    value: string | number | boolean | string[] | object | number[];
    description?: string;
    required?: boolean;
}

export interface ExtractionOptions {
    waitForNetworkIdle?: boolean;
    scrollToBottom?: boolean;
    runJavaScript?: boolean;
    delayMs?: number;
    timeoutMs?: number;
    appendData?: boolean;
    // javascript: string;
}

export type PaginationMode = 'none' | 'next' | 'links' | 'template';

export interface PaginationConfig {
    mode: PaginationMode;

    // Next button mode
    nextSelector?: string;
    clickNext?: boolean;
    stopIfMissing?: boolean;

    // links mode
    pageLinks?: string[];

    // URL template mode
    urlTemplate?: string; // e.g. /page={{page}}
    startPage?: number;
    increment?: number;
}

export interface SelectorDefinition {
    id: number;
    name: string;
    selector: string;
    type?: string;
    description?: string;
}

export interface ScrapeConfig {
    metadata: Metadata;
    selectos: SelectorDefinition[];
    options: ExtractionOptions;
    pagination: PaginationConfig;
    variables?: Record<string, VariableDefinition>;
}

export interface StoredScrape {
    id: string;
    createdAt: number;
    updatedAt: number;
    config: ScrapeConfig;
}

export interface ScrapeInstance {
    url: string;
    shortHash: string;
    timestamp: number;
}

export type StatusLevel =
    | 'idle'
    | 'extracting'
    | 'error'
    | 'importing'
    | 'exporting'
    | 'saving'
    | 'selecting';

export interface ExtensionStatus {
    level: StatusLevel;
    message: string;
    timestamp: number;
}

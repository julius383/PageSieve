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

export type PaginationConfig =
  | { mode: 'none' }

  | {
      mode: 'next';
      nextSelector: string;
      maxPages?: number;
    }

  | {
      mode: 'links';
      pageLinks: string[];
    }

  | {
      mode: "template";
      urlTemplate: string;     // e.g. "/products?page={{page}}"
      startPage: number;       // default: 1
      increment?: number;      // default: 1
      maxPages?: number;       // optional safety cap
    };


export interface SelectorDefinition {
    id: number;
    name: string;
    selector: string;
    type?: string;
    description?: string;
}

export interface ScrapeConfig {
    metadata: Metadata;
    selectors: SelectorDefinition[];
    options: ExtractionOptions;
    pagination: PaginationConfig;
    variables?: Record<string, VariableDefinition>;
}

export interface StoredConfig {
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

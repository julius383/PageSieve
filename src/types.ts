export interface SelectorConfig {
    id: number;
    name: string;
    selector: string;
}

export interface PropConfig {
    id: number;
    key: string;
    value: string;
}

export interface ScrapeConfig {
    fieldConf: SelectorConfig[];
    propsConf: PropConfig[];
    createdAt: number;
    updatedAt: number;
    id: string;
    url: string;
}

export interface ScrapInstance {
    url: string;
    shortHash: string;
}

export type StatusLevel = 'idle' | 'extracting' | 'error' | 'importing' | 'exporting' | 'saving';

export interface ExtensionStatus {
    level: StatusLevel;
    message: string;
    timestamp: number;
}

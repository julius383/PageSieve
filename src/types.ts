import * as z from 'zod';
import type { ScrapeConfig, SelectorGroup } from './schema';

z.config({ jitless: true });

const StatusLevel = z.enum([
    'idle',

    'inspecting',

    'running',
    'extracting',
    'waiting',
    'navigating',
    'completed',

    'errored',

    'importing',
    'exporting',
    'saving',
    'loading',
]);

const ExtensionStatus = z.object({
    status: StatusLevel,
    message: z.string(),
    timestamp: z.iso.datetime(),
});

type LogMessageRequest = {
    action: 'logMessage';
    message: string;
};

type OpenFullPageRequest = {
    action: 'openFullPage';
    makeActive?: boolean;
};

type GetTabInfoRequest = {
    action: 'getTabUrl';
};

type TestNavigateRequest = {
    action: 'testNavigate';
    config: ScrapeConfig;
    configHash: string;
    testing: boolean;
};

type ExtractDataRequest = {
    action: 'extractData';
    selectors: SelectorGroup[];
};

type RunMainRequest = {
    action: 'runMain';
    config: ScrapeConfig;
};

type StopMainRequest = {
    action: 'stopMain';
};

type InspectorToggleRequest = {
    action: 'inspector-toggle';
    pickerId: string;
};

type InspectorAcceptRequest = {
    action: 'inspector-accept';
};

type ClickElementRequest = {
    action: 'clickElement';
    selector: string;
};

type ClickAndWaitRequest = {
    action: 'clickAndWaitForStable';
    selector: string;
    stabilityDuration?: number;
    timeout?: number;
};

type BodyHashRequest = {
    action: 'hashBody';
};

type WaitPageLoadRequest = {
    action: 'waitPageLoad';
    timeout: number;
    options: object;
};

export type SelectedElementRequest = {
    action: 'selector-elementSelected';
    pickerId: string;
    selector: string;
    foundElements: number;
};

export type ScrapeStatusUpdateRequest = {
    action: 'updateScrapeStatus';
    status: StatusLevel;
    message: string;
    results: ExtractedGroup[];
};

export type ExtensionStatus = z.infer<typeof ExtensionStatus>;
export type StatusLevel = z.infer<typeof StatusLevel>;
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
    id: number;
    results: ExtractedRow[];
}

export type SupportedExportDataTypes = 'json' | 'csv' | 'html' | 'markdown';

export type MessageRequest =
    | ExtractDataRequest
    | InspectorToggleRequest
    | InspectorAcceptRequest
    | ClickElementRequest
    | ClickAndWaitRequest
    | BodyHashRequest
    | WaitPageLoadRequest;

export type BackgroundRequest =
    | GetTabInfoRequest
    | RunMainRequest
    | StopMainRequest
    | TestNavigateRequest
    | LogMessageRequest
    | OpenFullPageRequest;

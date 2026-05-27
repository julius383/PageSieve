import type { ScrapeConfig, SelectorGroup } from '@/core/schema';
import type { ExtractedGroup } from '@/core/types';

import * as z from 'zod';

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



export type ExtensionStatus = z.infer<typeof ExtensionStatus>;
export type StatusLevel = z.infer<typeof StatusLevel>;

type LogMessageRequest = {
    action: 'logMessage';
    payload: {
        level: string;
        logger: string;
        message: string;
        properties: Record<string, unknown>;
        ts: number;
    };
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

type PageHashRequest = {
    action: 'computePageHash';
    selectors: SelectorGroup[],
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

export type MessageRequest =
    | ExtractDataRequest
    | InspectorToggleRequest
    | InspectorAcceptRequest
    | ClickElementRequest
    | ClickAndWaitRequest
    | PageHashRequest
    | WaitPageLoadRequest;

export type BackgroundRequest =
    | GetTabInfoRequest
    | RunMainRequest
    | StopMainRequest
    | TestNavigateRequest
    | LogMessageRequest
    | OpenFullPageRequest;

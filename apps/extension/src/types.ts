import type { ScrapeConfig, SelectorGroup } from '@pagesieve/core/schema';
import type { ExtractedGroup } from '@pagesieve/core/types';

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

type InspectorActivateRequest = {
    action: 'inspector-activate';
    pickerId: string;
    container?: string;
};

type InspectorDeactivateRequest = {
    action: 'inspector-deactivate';
    pickerId: string;
    container?: string;
};

type InspectorPreviewRequest = {
    action: 'inspector-highlight';
    pickerId: string;
    selector: string;
    container?: string;
};

type InspectorAcceptRequest = {
    action: 'inspector-accept';
};

type SidebarClosingRequest = {
    action: 'sidebar-closing';
};

type ClickAndWaitRequest = {
    action: 'clickAndWaitForStable';
    selector: string;
    stabilityDuration?: number;
    timeout?: number;
};

type PageHashRequest = {
    action: 'computePageHash';
    selectors: SelectorGroup[];
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
    | InspectorActivateRequest
    | InspectorDeactivateRequest
    | InspectorPreviewRequest
    | InspectorAcceptRequest
    | ClickAndWaitRequest
    | SidebarClosingRequest
    | PageHashRequest;

export type BackgroundRequest =
    | GetTabInfoRequest
    | RunMainRequest
    | StopMainRequest
    | TestNavigateRequest
    | OpenFullPageRequest;

import * as z from 'zod';

z.config({ jitless: true });

export const Metadata = z.object({
    id: z.string().default(''),
    description: z.string().optional(),
    url: z.url().default('https://pagesieve.xyz'),
    version: z.string().default('1.0.0'),
    author: z.string().optional(),
});

export const ExtractionOptions = z.object({
    waitforNetworkIdle: z.boolean().default(true),
    scrollToBottom: z.boolean().optional().default(false),
    runJavaScript: z.boolean().optional().default(true),
    delayMs: z.number().positive().default(3_000),
    timeoutMs: z.number().positive().optional().default(60_000),
    appendData: z.boolean().default(true),
});

export const PaginationConfig = z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('none') }),
    z.object({
        mode: z.literal('next'),
        nextSelector: z.string(),
        maxPages: z.int().max(1000).optional(),
    }),
    z.object({ mode: z.literal('links'), pageLinks: z.array(z.string()) }),
    z.object({
        mode: z.literal('template'),
        urlTemplate: z
            .string()
            .regex(/.*{{page}}.*/)
            .default('page={{page}}'),
        startPage: z.int().default(1),
        increment: z.int().default(1),
        maxPages: z.int().max(1000).optional(),
    }),
]);

const datatypes = ['array', 'single'] as const;

export const SelectorDefinition = z.object({
    id: z.int().positive(),
    name: z.string(),
    selector: z.string(),
    type: z.enum(datatypes).default('single').optional(),
    description: z.string().optional(),
});

export const SelectorGroup = z.object({
    id: z.int().positive(),
    container: z.string().optional(),
    fields: z.array(SelectorDefinition),
});

export const VariableDefinition = z.object({
    type: z.enum(datatypes),
    value: z.any(),
    description: z.string().optional(),
    required: z.boolean().optional(),
});

export const ScrapeConfig = z.object({
    metadata: Metadata,
    selectors: z.array(SelectorGroup),
    options: ExtractionOptions,
    pagination: PaginationConfig,
    variables: z.record(z.string(), VariableDefinition).optional(),
});

export const StoredConfig = z.object({
    id: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    config: ScrapeConfig,
});

const ScrapeStatusLevel = z.enum(['idle', 'in_progress', 'completed', 'errored']);

export const ScrapeInstance = z.object({
    runId: z.string().regex(/[a-f0-9]{6}/), // Hash of the scrape configuration
    url: z.url(),
    timestamp: z.iso.datetime(),
    currentPage: z.number().optional(),
    maxPages: z.number().optional(),
    status: ScrapeStatusLevel.default('in_progress'),
});

const StatusLevel = z.enum([
    'idle',
    'extracting',
    'errored',
    'importing',
    'exporting',
    'saving',
    'loading',
    'inspecting',
    'navigating',
]);

const ExtensionStatus = z.object({
    status: StatusLevel,
    message: z.string(),
    timestamp: z.iso.datetime(),
});

type GetTabInfoRequest = {
    action: 'getTabUrl';
};

type NavigatePageRequest = {
    action: 'pageNavigate';
    config: ScrapeConfig;
    configHash: string;
};

type ExtractDataRequest = {
    action: 'extractData';
    selectors: SelectorGroup[];
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

export type ScrapeRunUpdateRequest = {
    action: 'updateScrapeRun';
    runId: string;
    url: string;
    currentPage: number | undefined;
    maxPages: number | undefined;
    status: ScrapeStatusLevel;
};

export type ScrapeRunStatusSetRequest = {
    action: 'setScrapeRunStatus';
    runId: string;
    status: ScrapeStatusLevel;
};

export type TriggerPaginationCommitRequest = {
    action: 'triggerCommitPagination';
};

export type Metadata = z.infer<typeof Metadata>;
export type ExtractionOptions = z.infer<typeof ExtractionOptions>;
export type PaginationConfig = z.infer<typeof PaginationConfig>;
export type SelectorDefinition = z.infer<typeof SelectorDefinition>;
export type VariableDefinition = z.infer<typeof VariableDefinition>;
export type ScrapeConfig = z.infer<typeof ScrapeConfig>;
export type StoredConfig = z.infer<typeof StoredConfig>;
export type ExtensionStatus = z.infer<typeof ExtensionStatus>;
export type SelectorGroup = z.infer<typeof SelectorGroup>;
export type StatusLevel = z.infer<typeof StatusLevel>;
export type ScrapeStatusLevel = z.infer<typeof ScrapeStatusLevel>;
export type ScrapeInstance = z.infer<typeof ScrapeInstance>;

export type MessageRequest =
    | ExtractDataRequest
    | InspectorToggleRequest
    | InspectorAcceptRequest
    | ClickElementRequest
    | BodyHashRequest
    | WaitPageLoadRequest;

export type BackgroundRequest = GetTabInfoRequest | NavigatePageRequest;

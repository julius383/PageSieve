import * as z from 'zod';

z.config({ jitless: true });

export const Metadata = z.object({
    id: z.string().default(''),
    description: z.string().optional(),
    url: z.url().default('https://pagesieve.xyz'),
    version: z.string().default('1.0.0'),
    author: z.string().optional(),

    selectorCount: z.number().nonnegative().optional().default(0),
    lastRunAt: z.iso.datetime({ offset: true }).optional(),
});

export const ExtractionOptions = z.object({
    waitforNetworkIdle: z.boolean().default(true),
    scrollToBottom: z.boolean().optional().default(false),
    runJavaScript: z.boolean().optional().default(true),
    delayMs: z.number().optional().default(0),
    timeoutMs: z.number().optional().default(60_000),
    appendData: z.boolean().default(false),
});

export const PaginationConfig = z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('none') }),
    z.object({
        mode: z.literal('next'),
        nextSelector: z.string(),
        maxPages: z.int().max(1000).optional(),
    }),
    z.object({ mode: z.literal('links'), pageLinks: z.string().array() }),
    z.object({
        mode: z.literal('template'),
        urlTemplate: z
            .string()
            .regex(/.*{{page}}.*/)
            .default('page={{page}}'),
        startPage: z.int().default(1),
        increment: z.int().optional().default(1),
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
    variables: z.optional(z.array(z.record(z.string(), VariableDefinition))),
});

export const StoredConfig = z.object({
    id: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    config: ScrapeConfig,
});

export const ScrapeInstance = z.object({
    url: z.url(),
    shortHash: z.string().regex(/[a-f0-9]{6}/),
    timestamp: z.iso.datetime(),
});

export type ScrapeInstance = z.infer<typeof ScrapeInstance>;

const StatusLevel = z.enum([
    'idle',
    'extracting',
    'errored',
    'importing',
    'exporting',
    'saving',
    'loading',
    'inspecting',
]);

const ExtensionStatus = z.object({
    status: StatusLevel,
    message: z.string(),
    timestamp: z.iso.datetime(),
});

export type Metadata = z.infer<typeof Metadata>;
export type ExtractionOptions = z.infer<typeof ExtractionOptions>;
export type PaginationConfig = z.infer<typeof PaginationConfig>;
export type SelectorDefinition = z.infer<typeof SelectorDefinition>;
export type VariableDefinition = z.infer<typeof VariableDefinition>;
export type ScrapeConfig = z.infer<typeof ScrapeConfig>;
export type StoredConfig = z.infer<typeof StoredConfig>;
export type ExtensionStatus = z.infer<typeof ExtensionStatus>;
export type SelectorGroup = z.infer<typeof SelectorGroup>;

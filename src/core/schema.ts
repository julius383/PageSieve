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
    maxRetries: z.number().nonnegative().optional().default(2),
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
    name: z.string().default('New Group'),
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

export type Metadata = z.infer<typeof Metadata>;
export type ExtractionOptions = z.infer<typeof ExtractionOptions>;
export type PaginationConfig = z.infer<typeof PaginationConfig>;
export type SelectorDefinition = z.infer<typeof SelectorDefinition>;
export type VariableDefinition = z.infer<typeof VariableDefinition>;
export type ScrapeConfig = z.infer<typeof ScrapeConfig>;
export type StoredConfig = z.infer<typeof StoredConfig>;
export type SelectorGroup = z.infer<typeof SelectorGroup>;

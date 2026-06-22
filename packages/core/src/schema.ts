import * as z from 'zod';
import { nanoid } from 'nanoid';

z.config({ jitless: true });

export const ExtractionOptions = z
    .object({
        waitforNetworkIdle: z
            .boolean()
            .default(true)
            .meta({ description: 'Wait for until no more network requests. For browser clients.' }),
        waitForSelector: z
            .string()
            .optional()
            .meta({ description: 'Wait for element before running extraction on page.' }),
        scrollToBottom: z
            .boolean()
            .optional()
            .default(false)
            .meta({ description: 'Scroll to bottom of page before running extraction on page.' }),
        runJavaScript: z
            .boolean()
            .optional()
            .default(true)
            .meta({ description: 'Extraction requires javascript to be runnable.' }),
        pageDelayMs: z
            .number()
            .positive()
            .default(3_000)
            .meta({ description: 'Delay this many milliseconds after navigating to a new page.' }),
        timeoutMs: z.number().positive().optional().default(60_000).meta({
            description:
                'Maximum amount of time to wait for action before it is considered failed.',
        }),
        maxRetries: z
            .number()
            .nonnegative()
            .optional()
            .default(2)
            .meta({ description: 'Maximum times to retry on failed actions.' }),
        appendData: z
            .boolean()
            .default(true)
            .meta({ description: 'Whether to append results to existing data or start fresh.' }),
    })
    .meta({
        title: 'ExtractionOptions',
        description: 'Options that control how extraction is done',
    });

export const PaginationConfig = z
    .discriminatedUnion('mode', [
        z.object({ mode: z.literal('none') }),
        z.object({
            mode: z.literal('next'),
            nextSelector: z
                .string()
                .meta({ description: 'Selector for element that navigates to next page.' }),
            maxPages: z.int().default(100).meta({
                description: 'Maximum number of pages to navigate to using in one session.',
            }),
            waitAfterClickMs: z
                .int()
                .positive()
                .optional()
                .meta({ description: 'Wait this many milliseconds after clicking the element.' }),
        }),
        z.object({
            mode: z.literal('links'),
            pageLinks: z.array(z.string()).meta({ description: 'List of links to process.' }),
        }),
        z.object({
            mode: z.literal('template'),
            urlTemplate: z
                .string()
                .regex(/.*{{page}}.*/)
                .default('page={{page}}')
                .meta({
                    description: 'Template for urls. Must have {{page}} is replaced with numbers.',
                }),
            startPage: z.int().default(1).meta({ description: 'First number to use in template.' }),
            increment: z.int().default(1).meta({ description: 'Number to add during each step.' }),
            maxPages: z
                .int()
                .default(100)
                .meta({ description: 'Maximum number of pages to navigate in one session.' }),
        }),
    ])
    .meta({ title: 'PaginationConfig', description: 'Controls how to move to the next page' });

const FieldTypeEnum = z.enum(['single', 'multiple', 'count']);
const ExtractEnum = z.enum(['text', 'property', 'attribute']);
const DataTypeEnum = z.enum(['string', 'number', 'boolean', 'date']);
const PropertyTypeEnum = z.enum(['innerHTML', 'outerHTML', 'innerText', 'textContent']);
export type PropertyType = z.infer<typeof PropertyTypeEnum>;

export const Field: z.ZodType<FieldType> = z.lazy(() =>
    z
        .object({
            id: z
                .string()
                .default(() => `f_${nanoid(6)}`)
                .meta({ description: 'Random and stable id.' }),
            name: z
                .string()
                .default('')
                .meta({ description: 'Field name used as column key in results.' }),
            selector: z.string().default('').meta({ description: 'Selector for data point.' }),
            type: FieldTypeEnum.default('single').meta({
                description: 'How to treat selector. Individual, collection or count',
            }),
            extract: ExtractEnum.default('text').meta({
                description: 'What part of element to extract.',
            }),
            attribute: z.string().optional().meta({
                description: "Which attribute to extract. Required when extract === 'attribute'.",
            }),
            property: PropertyTypeEnum.optional().meta({
                description: "Which property to extract. Required when extract === 'property'.",
            }),
            required: z
                .boolean()
                .default(false)
                .meta({ description: 'Should absence of element be treated as error.' }),
            default: z.string().optional().meta({
                description: 'Default value for this element when it cannot be extracted.',
            }),
            datatype: DataTypeEnum.optional().meta({ description: 'Datatype to cast result to.' }),
            fields: z
                .array(Field)
                .optional()
                .meta({ description: "Recursive sub-fields. Only valid when type === 'multiple'" }), //
        })
        .refine((f) => f.extract !== 'attribute' || !!f.attribute, {
            message: "attribute is required when extract is 'attribute'",
        })
        .refine((f) => f.extract !== 'property' || !!f.property, {
            message: "property is required when extract is 'property'",
        })
        .refine((f) => !(f.fields && f.fields.length > 0) || f.type === 'multiple', {
            message: "nested fields are only valid when type is 'multiple'",
        })
        .refine((f) => !(f.fields && f.fields.length > 0) || f.extract === 'text', {
            message: 'a field with children cannot also use attribute/html extraction',
        }),
);

export type FieldType = {
    id: string;
    name: string;
    selector: string;
    type: z.infer<typeof FieldTypeEnum>;
    extract: z.infer<typeof ExtractEnum>;
    attribute?: string;
    property?: z.infer<typeof PropertyTypeEnum>;
    required: boolean;
    default?: string;
    datatype?: string;
    fields?: FieldType[];
};

export const SelectorGroup = z.object({
    id: z
        .string()
        .default(() => `g_${nanoid(6)}`)
        .meta({
            description: 'Random and stable id. Used to group results when multiple groups exist.',
        }),
    name: z.string().optional().default('Group 1'),
    container: z.string().optional().meta({
        description: 'Item container selector when omitted => page-level group (scrape once)',
    }),
    fields: z.array(Field),
});

export const VariableConfig = z.discriminatedUnion('type', [
    z
        .object({
            type: z.literal('string'),
            value: z.string(),
        })
        .meta({ description: 'Plain text value embedded in config.' }),
    z
        .object({
            type: z.literal('secret'),
        })
        .meta({
            description: 'Secret value provided through client e.g env variable or user prompt',
        }),
]);

export const VariablesMap = z.record(z.string(), VariableConfig);

// Results format hint. Overrideable in clients.
export const OutputConfig = z.object({
    format: z.enum(['json', 'ndjson', 'csv', 'html', 'markdown']).default('json'),
    mergeStrategy: z
        .enum(['join', 'separate', 'zip'])
        .default('join')
        .meta({ description: 'How to combine results in different field groups.' }),
    flatten: z.boolean().default(true).meta({ description: 'Flatten nested columns.' }),
});

export const ScrapeConfig = z.object({
    id: z.string().default('').meta({ description: 'Auto-generated id.' }),
    name: z.string().optional().meta({ description: 'Human readable name for config.' }),
    schemaVersion: z
        .string()
        .default('2.0.0')
        .meta({ description: 'Schema version. Incremented when breaking changes to format made.' }),
    revision: z
        .number()
        .positive()
        .default(1)
        .meta({ description: 'Increment when config is modified.' }),

    url: z.url().meta({ description: 'URL to start extraction.' }),
    urlPattern: z
        .string()
        .optional()
        .meta({ description: 'glob/pattern this config applies to; omitted = exact url only' }),
    createdAt: z.iso.datetime({ offset: true }).meta({ description: 'When config was created.' }),
    updatedAt: z.iso
        .datetime({ offset: true })
        .meta({ description: 'When config was updated. Should change alongside revision.' }),

    description: z
        .string()
        .optional()
        .meta({ description: 'Description of config e.g what type of data it extracts' }),
    author: z.string().optional().meta({ description: 'Who made this config. Typically username' }),
    tags: z
        .array(z.string())
        .optional()
        .meta({ description: 'Content tags for easier categorization.' }),

    selectors: z.array(SelectorGroup).meta({ description: 'Defines what to extract from page.' }),
    options: ExtractionOptions,
    pagination: PaginationConfig,
    variables: VariablesMap.optional(),
    output: OutputConfig.default({
        format: 'json',
        mergeStrategy: 'join',
        flatten: true,
    })
        .optional()
        .meta({ description: 'Results output hint.' }),
});

export type ExtractionOptions = z.infer<typeof ExtractionOptions>;
export type PaginationConfig = z.infer<typeof PaginationConfig>;
export type ScrapeConfig = z.infer<typeof ScrapeConfig>;
export type SelectorGroup = z.infer<typeof SelectorGroup>;

import {
    ScrapeConfig,
    SelectorGroup,
    ExtractionOptions,
    PaginationConfig,
    Field,
    VariableConfig,
} from '../packages/core/src/schema';


type JSONSchema = Record<string, unknown>;

function slug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function typeLabel(schema: JSONSchema, rootTitle: string): string {
    if (schema.$ref) {
        return `#`;
    }
    if (schema.enum) return (schema.enum as string[]).map((v: unknown) => `\`${v}\``).join(' \\| ');
    if (schema.type === 'array') return `${typeLabel(schema.items, rootTitle)}[]`;
    if (Array.isArray(schema.type)) return schema.type.join(' \\| '); // e.g. nullable unions
    return schema.type as string ?? 'unknown';
}

function renderObjectSection(schema: JSONSchema, title: string, rootTitle: string): string {
    const required: string[] = schema.required as (string[]) ?? [];
    const lines = [`## ${title}`, ''];
    if (schema.description) lines.push(schema.description as string, '');

    lines.push('| Field | Type | Required | Default | Description |');
    lines.push('|-------|------|----------|---------|-------------|');

    for (const [key, prop] of Object.entries(schema.properties  ?? {})) {
        const label = typeLabel(prop, rootTitle);
        const isRequired = required.includes(key) ? 'Yes' : 'No';
        const defaultVal = prop.default !== undefined ? `\`${JSON.stringify(prop.default)}\`` : '-';
        const desc = prop.description ?? '-';
        lines.push(`| \`${key}\` | ${label} | ${isRequired} | ${defaultVal} | ${desc} |`);
    }

    return lines.join('\n');
}

function jsonSchemaToMarkdown(schema: JSONSchema, title: string): string {
    const root = schema;

    const sections = new Map<string, string>();
    if (schema?.oneOf) {
        for (const elem of schema.oneOf as JSONSchema[]) {
            const curr = sections.get(slug(title)) ?? ""
            sections.set(slug(title), curr + '\n\n' + renderObjectSection(elem, title, title));
        }

    } else {
        sections.set(slug(title), renderObjectSection(root, title, title));
    }

    for (const [name, def] of Object.entries(schema.$defs ?? {})) {
        if (def.type === 'object' && !sections.has(slug(name))) {
            sections.set(slug(name), renderObjectSection(def, name, title));
        }
    }

    return [...sections.values()].join('\n\n') + '\n';
}

for (const val of [
    [ScrapeConfig, 'ScrapeConfig'],
    [SelectorGroup, 'SelectorGroup'],
    [ExtractionOptions, 'ExtractionOptions'],
    [PaginationConfig, 'PaginationConfig'],
    [VariableConfig, 'VariableConfig'],
    [Field, 'Field'],
]) {
    const [schema, name] = val;
    const json = schema?.toJSONSchema();
    const markdown = jsonSchemaToMarkdown(json, name);
    console.log(markdown);
    // writeFileSync("user-schema.md", markdown);
}

import type { ScrapeConfig, PaginationConfig } from '@pagesieve/core/schema';
import { ExtractionOptions, SelectorGroup, Field } from '@pagesieve/core/schema';
import { nanoid } from 'nanoid';
import { SvelteDate } from 'svelte/reactivity';

export const scrapeConfig = $state<ScrapeConfig>({
    id: '',
    url: '',
    schemaVersion: '2.0.0',
    revision: 1,
    createdAt: new SvelteDate().toISOString(),
    updatedAt: new SvelteDate().toISOString(),
    selectors: [SelectorGroup.parse({ fields: [Field.parse({})] })],
    options: ExtractionOptions.parse({}),
    pagination: { mode: 'none' },
});

export function setScrapeConfig(config: ScrapeConfig) {
    Object.assign(scrapeConfig, {});
    Object.assign(scrapeConfig, config);
}

export function setPaginationConfig(pagination: PaginationConfig) {
    Object.assign(scrapeConfig.pagination, pagination);
}

export function addGroup() {
    const newID = `g_${nanoid(6)}`;
    const newGroup = {
        id: newID,
        name: `Group ${newID}`,
        fields: [Field.parse({})],
    };
    scrapeConfig.selectors.push(newGroup as SelectorGroup);
}

export function renameGroup(groupID: string, name: string) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupID);
    if (group) {
        group.name = name;
    }
}

export function removeGroup(groupID: string) {
    const groupIdx = scrapeConfig.selectors.findIndex((element) => element.id == groupID);
    if (groupIdx != -1) {
        scrapeConfig.selectors.splice(groupIdx, 1);
    }
}

export function addField(itemID: string) {
    for (const group of scrapeConfig.selectors) {
        if (itemID == group.id) {
            group.fields.push(Field.parse({}));
            return;
        }
        for (const field of group.fields) {
            if (itemID == field.id) {
                if (field.fields) {
                    field.fields.push(Field.parse({}))
                } else {
                    field.fields = [Field.parse({})];
                }
            }

        }
    }
}

export function removeField(selectorId: string) {
    for (const group of scrapeConfig.selectors) {
        const index = group.fields.findIndex((element) => element.id === selectorId);
        if (index !== -1) {
            group.fields.splice(index, 1);
            return;
        }
        for (const field of group.fields) {
            if (field.fields !== undefined) {
                const index = field.fields.findIndex((element) => element.id === selectorId);
                if (index !== -1) {
                    field.fields.splice(index, 1);
                    if (field.fields.length == 0) {
                        delete field.fields;
                    }
                    return;
                }

            }
        }

    }
}

export function duplicateField(selectorId: string) {
    for (const group of scrapeConfig.selectors) {
        const index = group.fields.findIndex((element) => element.id === selectorId);
        if (index !== -1) {
            const field = $state.snapshot(group.fields[index])
            field.id = `f_${nanoid(6)}`;
            if (field.fields) {
                for (const f of field.fields) {
                    f.id = `f_${nanoid(6)}`;
                }
            }
            group.fields.push(field);
            return;
        }
    }
}

export function resetDefinitions() {
    scrapeConfig.selectors = [SelectorGroup.parse({ fields: [Field.parse({})] })];
}

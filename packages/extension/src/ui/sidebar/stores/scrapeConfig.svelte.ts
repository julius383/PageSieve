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

export function addDefinition(groupID: string) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupID);
    if (group) {
        group.fields.push(Field.parse({}));
    }
}

export function removeDefinition(selectorId: string, groupId: string) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupId);
    if (group) {
        const index = group.fields.findIndex((element) => element.id === selectorId);
        if (index !== -1) {
            group.fields.splice(index, 1);
        }
    }
}

export function resetDefinitions() {
    scrapeConfig.selectors = [SelectorGroup.parse({ fields: [Field.parse({})] })];
}

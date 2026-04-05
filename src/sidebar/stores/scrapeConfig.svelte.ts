import type { ScrapeConfig, SelectorGroup, PaginationConfig } from '../../types';
import { ExtractionOptions, Metadata } from '../../types';

let nextSelectorId = 2;
// eslint-disable-next-line prefer-const
let activeGroup = 1;

export const scrapeConfig = $state<ScrapeConfig>({
    metadata: Metadata.parse({}),
    selectors: [{ id: 1, fields: [{ id: 1, name: '', selector: '', type: 'single' }] }],
    options: ExtractionOptions.parse({}),
    pagination: { mode: 'none' },
});

export function setScrapeConfig(config: ScrapeConfig) {
    Object.assign(scrapeConfig, config);
    updateIds();
}

export function setPaginationConfig(pagination: PaginationConfig) {
    Object.assign(scrapeConfig.pagination, pagination);
}

export function getActiveGroup() {
    return scrapeConfig.selectors.find((element) => element.id == activeGroup);
}

export function addGroup() {
    const lastID = scrapeConfig.selectors[scrapeConfig.selectors.length - 1].id;
    const newGroup = {
        id: lastID + 1,
        fields: [{ id: 1, name: '', selector: '', type: 'single' }],
    };
    scrapeConfig.selectors.push(newGroup as SelectorGroup);
}

export function removeGroup(groupID: number) {
    const groupIdx = scrapeConfig.selectors.findIndex((element) => element.id == groupID);
    if (groupIdx != -1) {
        scrapeConfig.selectors.splice(groupIdx, 1);
    }
}

export function addDefinition(groupID: number = activeGroup) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupID);
    if (group) {
        group.fields.push({ id: nextSelectorId++, name: '', selector: '', type: 'single' });
    }
}

export function removeDefinition(selectorId: number, groupId: number = activeGroup) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupId);
    if (group) {
        const index = group.fields.findIndex((element) => element.id === selectorId);
        group.fields.splice(index, 1);

        updateIds(group);
    }
}

function updateIds(group: SelectorGroup | null = null) {
    if (group) {
        group.fields.forEach((elem, idx) => {
            elem.id = idx + 1;
        });
        nextSelectorId = group.fields.length + 1;
    } else {
        scrapeConfig.selectors.forEach((group) => {
            group.fields.forEach((elem, idx) => {
                elem.id = idx + 1;
            });
            nextSelectorId = group.fields.length + 1;
        });
    }
}

export function resetDefinitions() {
    nextSelectorId = 1;
    const group = getActiveGroup();
    if (group) {
        group.container = '';
        group.fields.length = 0;
        addDefinition();
    }
}

import type { ScrapeConfig, SelectorGroup, PaginationConfig } from '../../types';
import { ExtractionOptions, Metadata } from '../../types';


export const scrapeConfig = $state<ScrapeConfig>({
    metadata: Metadata.parse({}),
    selectors: [
        { id: 1, name: 'Group 1', fields: [{ id: 1, name: '', selector: '', type: 'single' }] },
    ],
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

export function addGroup() {
    const lastID =
        scrapeConfig.selectors.length > 0
            ? scrapeConfig.selectors[scrapeConfig.selectors.length - 1].id
            : 0;
    const newID = lastID + 1;
    const newGroup = {
        id: newID,
        name: `Group ${newID}`,
        fields: [{ id: 1, name: '', selector: '', type: 'single' }],
    };
    scrapeConfig.selectors.push(newGroup as SelectorGroup);
}

export function renameGroup(groupID: number, name: string) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupID);
    if (group) {
        group.name = name;
    }
}

export function removeGroup(groupID: number) {
    const groupIdx = scrapeConfig.selectors.findIndex((element) => element.id == groupID);
    if (groupIdx != -1) {
        scrapeConfig.selectors.splice(groupIdx, 1);
    }
}

export function addDefinition(groupID: number) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupID);
    if (group) {
        const nextId =
            group.fields.length > 0 ? Math.max(...group.fields.map((f) => f.id)) + 1 : 1;
        group.fields.push({ id: nextId, name: '', selector: '', type: 'single' });
        updateIds(group);
    }
}

export function removeDefinition(selectorId: number, groupId: number) {
    const group = scrapeConfig.selectors.find((element) => element.id == groupId);
    if (group) {
        const index = group.fields.findIndex((element) => element.id === selectorId);
        if (index !== -1) {
            group.fields.splice(index, 1);
            updateIds(group);
        }
    }
}

function updateIds(group: SelectorGroup | null = null) {
    if (group) {
        group.fields.forEach((elem, idx) => {
            elem.id = idx + 1;
        });
    } else {
        scrapeConfig.selectors.forEach((group) => {
            group.fields.forEach((elem, idx) => {
                elem.id = idx + 1;
            });
        });
    }
}

export function resetDefinitions() {
    scrapeConfig.selectors = [
        { id: 1, name: 'Group 1', fields: [{ id: 1, name: '', selector: '', type: 'single' }] },
    ];
}

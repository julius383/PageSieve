import type { ScrapeConfig, SelectorGroup } from '../../types';
import { ExtractionOptions, Metadata } from '../../types';

let nextSelectorId = 2;
// TODO: add function to increase number of groups
export let activeGroup = 1;

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

export function getActiveGroup() {
    return scrapeConfig.selectors.find((element) => element.id == activeGroup);
}

export function addDefinition() {
    const group = scrapeConfig.selectors.find((element) => element.id == activeGroup);
    if (group) {
        group.fields.push({ id: nextSelectorId++, name: '', selector: '', type: 'single' });
    }
}

export function removeDefinition(id: number) {
    const group = scrapeConfig.selectors.find((element) => element.id == activeGroup);
    if (group) {
        const index = group.fields.findIndex((element) => element.id === id);
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

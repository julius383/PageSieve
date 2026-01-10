import type { ScrapeConfig } from "../../types";
import { ExtractionOptions, Metadata } from "../../types";


let nextSelectorId = 2;

export const scrapeConfig = $state<ScrapeConfig>({
    metadata: Metadata.parse({}),
    selectors: [{id: 1, name: '', selector: ''}],
    options: ExtractionOptions.parse({}),
    pagination: { mode: 'none' },

});

export function addDefinition() {
    scrapeConfig.selectors.push(
        { id: nextSelectorId++, name: '', selector: '' }
    )
}

export function removeDefinition(id: number) {
    const index = scrapeConfig.selectors.findIndex(element => element.id === id)
    scrapeConfig.selectors.splice(index, 1);

    // update ids to be in order
    scrapeConfig.selectors.forEach((elem, idx) => {
        elem.id = idx + 1;
    });
    nextSelectorId = scrapeConfig.selectors.length;
}

export function resetDefinitions() {
    nextSelectorId = 1
    scrapeConfig.selectors.length = 0;
    scrapeConfig.selectors.push({id: 1, name: '', selector: ''})
}

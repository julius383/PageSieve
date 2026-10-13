import { MatchPattern } from '@webext-core/match-patterns';
import {
    type ScrapeConfig as ScrapeConfigT,
    PaginationConfig,
    type PaginationConfig as PaginationConfigT,
} from '@pagesieve/core/schema';
import { ExtractionOptions, SelectorGroup, Field } from '@pagesieve/core/schema';
import { nanoid } from 'nanoid';
import { SvelteDate } from 'svelte/reactivity';
import * as z from 'zod';
import { setStatus } from '@/ui/sidebar/stores/ui.svelte';

export const scrapeConfig: ScrapeConfigT = $state({
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

type ConfigKey = keyof ScrapeConfigT;

export function setScrapeConfig(config: ScrapeConfigT) {
    for (const key of Object.keys(scrapeConfig) as ConfigKey[]) {
        delete scrapeConfig[key];
    }
    Object.assign(scrapeConfig, config);
}

export function setScrapeConfigValue<K extends keyof ScrapeConfigT>(
    key: K,
    value: ScrapeConfigT[K],
) {
    scrapeConfig[key] = value;
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
                    field.fields.push(Field.parse({}));
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
            const field = $state.snapshot(group.fields[index]);
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

export function resetSelectors() {
    scrapeConfig.selectors = [SelectorGroup.parse({ fields: [Field.parse({})] })];
}

export function resetConfig() {
    scrapeConfig.id = '';
    scrapeConfig.url = '';
    scrapeConfig.schemaVersion = '2.0.0';
    scrapeConfig.revision = 1;
    scrapeConfig.createdAt = new SvelteDate().toISOString();
    scrapeConfig.updatedAt = new SvelteDate().toISOString();
    scrapeConfig.selectors = [SelectorGroup.parse({ fields: [Field.parse({})] })];
    scrapeConfig.options = ExtractionOptions.parse({});
    scrapeConfig.pagination = { mode: 'none' };
}

/**
 * Creates the initial state for the pagination store by mapping the pagination
 * config from the main scrapeConfig store. This ensures the UI has a full object
 * to bind to, even for modes that are not currently active.
 */
function createInitialPaginationState(config: PaginationConfigT) {
    const newState = {
        mode: config.mode,
        none: { mode: 'none' as const },
        next: {
            mode: 'next' as const,
            nextSelector: '',
            maxPages: 0,
        },
        links: {
            mode: 'links' as const,
            pageLinks: [''],
        },
        template: {
            mode: 'template' as const,
            urlTemplate: '',
            startPage: 1,
            increment: 1,
            maxPages: 0,
        },
    };

    // Populate the active mode with data from the scrapeConfig
    if (config.mode === 'next') {
        newState.next.nextSelector = config.nextSelector;
        if (config.maxPages) {
            newState.next.maxPages = config.maxPages;
        }
    } else if (config.mode === 'links') {
        newState.links.pageLinks = config.pageLinks;
    } else if (config.mode === 'template') {
        newState.template.urlTemplate = config.urlTemplate;
        newState.template.startPage = config.startPage;
        newState.template.increment = config.increment;
        if (config.maxPages) {
            newState.template.maxPages = config.maxPages;
        }
    }
    return newState;
}

// Create the reactive paginationState store, initialized from the main scrapeConfig.
export const paginationState = $state(createInitialPaginationState(scrapeConfig.pagination));

/**
 * Validates the current UI pagination state and, if successful,
 * commits it to the global `scrapeConfig.pagination` store.
 * Sets UI status based on validation result.
 * @returns {boolean} True if the commit was successful, false otherwise.
 */
export function commitPaginationToScrapeConfig(): boolean {
    const snapshot = $state.snapshot(paginationState);
    const result = PaginationConfig.safeParse(snapshot[snapshot.mode]);

    if (!result.success) {
        setStatus('errored', z.prettifyError(result.error));
        return false;
    } else {
        if (JSON.stringify(scrapeConfig.pagination) !== JSON.stringify(result.data)) {
            scrapeConfig.pagination = result.data;
        }
        setStatus('idle', 'Ready');
        return true;
    }
}

/**
 * Use simple prefix matching if possible otherwise
 * fallback to glob based match patterns
 */
export function matchURLPattern(pattern: string | undefined, s: string | URL | undefined): boolean {
    if (!pattern || !s) return false;
    const converted = s.toString();
    const containsWildcards = s.toString().includes('*');
    if (containsWildcards) {
        const matcher = new MatchPattern(pattern);
        return matcher.includes(converted);
    }
    return converted.startsWith(pattern);
}

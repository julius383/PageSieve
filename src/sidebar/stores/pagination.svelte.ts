import * as z from 'zod';

import { PaginationConfig } from '../../types';
import type { PaginationConfig as PaginationConfigT } from '../../types';
import { scrapeConfig } from './scrapeConfig.svelte';
import { setStatus } from './ui.svelte';

/**
 * Creates the initial state for the pagination store by mapping the pagination
 * config from the main scrapeConfig store. This ensures the UI has a full object
 * to bind to, even for modes that are not currently active.
 */
function createInitialPaginationState(config: PaginationConfigT) {
    const newState = {
        mode: config.mode,
        none: { mode: 'none' },
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
export let paginationState = $state(createInitialPaginationState(scrapeConfig.pagination));

/**
 * Validates the current UI pagination state and, if successful,
 * commits it to the global `scrapeConfig.pagination` store.
 * Sets UI status based on validation result.
 * @returns {boolean} True if the commit was successful, false otherwise.
 */
export function commitPaginationToScrapeConfig(): boolean {
    const snapshot = $state.snapshot(paginationState);
    // Select the data for the currently active mode to validate.
    const result = PaginationConfig.safeParse(snapshot[snapshot.mode]);

    if (!result.success) {
        setStatus('errored', z.prettifyError(result.error));
        return false;
    } else {
        // Only update scrapeConfig.pagination if the data has actually changed
        if (JSON.stringify(scrapeConfig.pagination) !== JSON.stringify(result.data)) {
            Object.assign(scrapeConfig.pagination, result.data);
        }
        setStatus('idle', 'Ready'); // Clear any previous error upon successful validation
        return true;
    }
}

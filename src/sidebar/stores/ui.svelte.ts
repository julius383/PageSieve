import type { ScrapeInstance } from '../../types';

export const scrapeRuns = $state<{ runs: ScrapeInstance[] }>({ runs: [] });

export const extractedData = $state({ data: [] });

export function resetExtractedData() {
    extractedData.data = [];
}

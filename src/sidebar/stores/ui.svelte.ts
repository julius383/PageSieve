import type { ScrapeInstance } from '../../types';
import { StoredConfig } from '../../types';
import { getAllConfigs } from '../services/storage';

export const scrapeRuns = $state<{ runs: ScrapeInstance[] }>({ runs: [] });

export const extractedData = $state({ data: [] });

export function resetExtractedData() {
    extractedData.data = [];
}

// Library of saved configs
export const allConfigs = $state<{configs: StoredConfig[]}>({configs: []});
export async function refreshConfigs() {
    const configs = await getAllConfigs();
    allConfigs.configs = configs
}

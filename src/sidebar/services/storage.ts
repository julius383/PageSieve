import { StoredConfig } from "../../types";
import localforage from 'localforage';


const CONFIG_STORAGE_KEY = 'pagesieve-configs';

localforage.config({
    name: CONFIG_STORAGE_KEY,
    driver: localforage.LOCALSTORAGE,
});


export async function getAllConfigs(): Promise<StoredConfig[]> {
    const configs: StoredConfig[] = [];
    await localforage.iterate((value) => {
        configs.push(value as StoredConfig);
    });
    return configs;
}


export async function getConfig(id: string): Promise<StoredConfig | null> {
    const item = await localforage.getItem(id);
    if (item) {
        return StoredConfig.parse(item);
    }
    return null;
}

export async function saveConfig(id: string, config: StoredConfig): Promise<boolean> {
    const existing = await getConfig(id);
    if (existing) {
        // TODO: prompt user to rename or overwrite
        browser.runtime.sendMessage({
            action: 'set-status',
            data: { level: 'error', message: `Config with id ${config.id} already exists` },
        });
        return false;
    }
    await localforage.setItem(id, config);
    return true;
}

/**
 * Rename config stored in browser localstorage
 */
export async function renameConfig(oldId: string, newId: string): Promise<boolean> {
    const existing = await localforage.getItem(newId);
    if (existing) {
        console.error(`Config with id "${newId}" already exists.`);
        return false;
    }
    const result = StoredConfig.safeParse(await localforage.getItem(oldId));
    if (!result.success) {
        console.error(result.error)
    } else {
        await localforage.removeItem(oldId);
        result.data.id = newId;
        result.data.updatedAt = new Date().toISOString();
        await localforage.setItem(newId, result.data);
        return true;
    }
    return false;
}


/**
 * Remove config stored in browser localstorage
 */
export async function removeConfig(itemId: string): Promise<boolean> {
    const existing = await localforage.getItem(itemId)
    if (existing) {
        await localforage.removeItem(itemId);
        return true;
    }
    return false;
}

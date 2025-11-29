import localforage from "localforage";

const CONFIG_STORAGE_KEY = "pageweave-configs";

localforage.config({
    name: CONFIG_STORAGE_KEY,
    driver: localforage.LOCALSTORAGE,
});

type Ok<T> = {
    ok: true;
    value: T;
};

type Err<E> = {
    ok: false;
    error: E;
};

type Result<T, E> = Ok<T> | Err<E>;

const Ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const Err = <E>(error: E): Err<E> => ({ ok: false, error });

interface SelectorConfig {
    id: number;
    name: string;
    selector: string;
}

interface PropConfig {
    id: number;
    key: string;
    value: string;
}

interface ScrapeConfig {
    fieldConf: SelectorConfig[];
    propsConf: PropConfig[];
    createdAt: string;
    updatedAt: string;
    name: string;
}

export async function saveConfig(configKey: string, config: ScrapeConfig) {
    try {
        await localforage.setItem(configKey, config);
        console.log("Configuration saved successfully");
    } catch (err) {
        console.error("Error saving configuration:", err);
        throw err;
    }
}

export async function loadConfig(
    configKey: string,
): Promise<ScrapeConfig | null> {
    try {
        const config = await localforage.getItem<ScrapeConfig>(configKey);
        if (config) {
            console.log("Configuration loaded successfully");
            return config;
        } else {
            console.log("No configuration found");
            return null;
        }
    } catch (err) {
        console.error("Error loading configuration:", err);
        throw err;
    }
}

// Helper function to capitalize column names
export function formatColumnName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

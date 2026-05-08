import { writable, derived } from 'svelte/store';

const MAX = 100;

export interface LogEntry {
  id: string;
  level: string;
  category: string;
  message: unknown[];
  properties: Record<string, unknown>;
  timestamp: number | Date;
}

function createLogStore() {
  const { subscribe, update } = writable<LogEntry[]>([]);

  return {
    subscribe,

    /**
     * LogTape sink function
     */
    sink(record: any) {
      update((logs) => {
        const entry: LogEntry = {
          id: crypto.randomUUID(),
          level: record.level,
          category: record.category.join("/"),
          message: [...record.message],
          properties: record.properties,
          timestamp: Number(record.timestamp),
        };
        const next = [entry, ...logs];
        console.dir(entry);
        return next.length > MAX ? next.slice(0, MAX) : next;
      });
    },

    setLogs(newLogs: LogEntry[]) {
      update(() => newLogs.slice(0, MAX));
    },

    clear() {
      update(() => []);
    },
  };
}

export const logStore = createLogStore();

// Listen for logs from other contexts (e.g., background script)
if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'log' && message.record) {
      logStore.sink(message.record);
    }
  });
}

// Only display logs with a status in LogViewer component
export const displayLogs = derived(logStore, ($logs) =>
  $logs.filter((e) => 'status' in e.properties)
);

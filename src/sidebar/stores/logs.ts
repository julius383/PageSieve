import { writable } from 'svelte/store';
import type { StatusLevel } from '../../types';


export interface LogEntry {
    id: number;
    timestamp: Date;
    message: string;
    status: StatusLevel;
}

function createLogStore() {
    const { subscribe, update } = writable<LogEntry[]>([]);
    let id = 0;

    function addLog(status: StatusLevel = 'idle', message: string) {
        const newLog: LogEntry = {
            id: id++,
            timestamp: new Date(),
            message,
            status,
        };
        // add new entry at the start
        update((entries) => [newLog, ...entries]);
    }

    return {
        subscribe,
        addLog,
    };
}

export const logs = createLogStore();

export const addLog = logs.addLog;

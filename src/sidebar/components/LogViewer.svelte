<script lang="ts">
    import { cn } from '$lib/utils';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { CircleSmall } from '@lucide/svelte';

    import { fly } from 'svelte/transition';
    import { displayLogs, logStore } from '../stores/logs';
    import { getIndicatorColor } from '../util';
    import type { StatusLevel } from '../../types';

    import { getLatestLogs } from '../services/storage';
    import { onMount } from 'svelte';

    let { openInNewTab = false } = $props();

    onMount(async () => {
        if (openInNewTab) {
            const results = await getLatestLogs();
            if (results) {
                logStore.setLogs(results);
            }
        }
    });

    function getStatus(log: any): StatusLevel {
        if (log.properties?.status) return log.properties.status as StatusLevel;
    }

    function formatMessage(message: unknown[]): string {
        return message.map((m) => (typeof m === 'object' ? JSON.stringify(m) : String(m))).join('');
    }

    function formatTime(ts: number | Date): string {
        return new Date(ts).toLocaleTimeString();
    }
</script>

<div class={cn('flex flex-col', openInNewTab ? 'h-full' : 'h-60')}>
    <div class="flex-1 overflow-y-auto p-4">
        <div class="flex flex-col gap-2">
            {#each $displayLogs as log (log.id)}
                {@const status = getStatus(log)}
                {@const indicator = getIndicatorColor(status)}
                <div
                    in:fly={{ y: -10, duration: 300 }}
                    class="flex items-start gap-2 rounded-lg bg-gray-100 p-2 text-sm dark:bg-gray-800"
                >
                    <div class="flex items-center gap-2">
                        <Tooltip.Provider>
                            <Tooltip.Root>
                                <Tooltip.Trigger>
                                    <CircleSmall fill={indicator.style} color={indicator.style} />
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                    <span>{indicator.label}</span>
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    </div>

                    <div class="flex flex-1 flex-col gap-1">
                        <div
                            class="flex items-center justify-between gap-2 font-bold uppercase text-[10px] text-gray-500"
                        >
                            <span>{log.category}</span>
                            <span>{formatTime(log.timestamp)}</span>
                        </div>
                        <p class="break-all font-mono text-gray-800 dark:text-gray-200">
                            {formatMessage(log.message)}
                        </p>
                        {#if Object.keys(log.properties).length > (log.properties.status ? 1 : 0)}
                            <div class="mt-1 opacity-70 text-[10px]">
                                <pre class="whitespace-pre-wrap">{JSON.stringify(
                                        Object.fromEntries(
                                            Object.entries(log.properties).filter(
                                                ([k]) => k !== 'status',
                                            ),
                                        ),
                                        null,
                                        2,
                                    )}</pre>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

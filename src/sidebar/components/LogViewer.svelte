<script lang="ts">
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { CircleSmall } from '@lucide/svelte';

    import { fly } from 'svelte/transition';
    import { logs } from '../stores/logs';
    import { getIndicatorColor } from '../util';

</script>

<div class="flex h-60 flex-col">
    <div class="flex-1 overflow-y-auto p-4">
        <div class="flex flex-col gap-2">
            {#each $logs as log (log.id)}
                <div
                    in:fly={{ y: -10, duration: 300 }}
                    class="flex items-start gap-2 rounded-lg bg-gray-100 p-2 text-sm dark:bg-gray-800"
                >
                    <div class="flex items-center gap-2">
                        <Tooltip.Provider>
                            <Tooltip.Root>
                                <Tooltip.Trigger>
                                    <CircleSmall
                                        fill={getIndicatorColor(log.status).style}
                                        color={getIndicatorColor(log.status).style}
                                    />
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                    <span>{getIndicatorColor(log.status).label}</span>
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    </div>
                    <p class="flex-1 break-all font-mono text-gray-800 dark:text-gray-200">
                        {log.message}
                    </p>
                </div>
            {/each}
        </div>
    </div>
</div>
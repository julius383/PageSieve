<script lang="ts">
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { CircleSmall } from '@lucide/svelte';

    import { extensionStatus } from '@/ui/sidebar/stores/ui.svelte';
    import { getIndicatorColor } from '@/ui/sidebar/util';

    let cfg = $derived(getIndicatorColor(extensionStatus.status));
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger>
            <Badge variant={extensionStatus.status === 'errored' ? 'destructive': "secondary"} class="gap-2">
                <CircleSmall
                    fill={cfg.style}
                    color={cfg.style}
                    class={['idle', 'errored', 'completed'].includes(extensionStatus.status)
                        ? ''
                        : 'animate-pulse'}
                    size={32}
                />
                <span class="text-sm mx-0.5 font-medium">
                    {cfg.label}
                </span>
                <span>
                {#if extensionStatus?.progress}
                    <span class="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-mono">
                        {extensionStatus?.progress.progressIndex}/{extensionStatus.progress.progressMax}
                    </span>
                {/if}
                </span>
            </Badge>
        </Tooltip.Trigger>
        <Tooltip.Content class="max-w-xs space-y-1.5 p-3 bg-slate-900 text-slate-100 border border-slate-800 shadow-xl rounded-lg">
            <p class="text-sm wrap-break-word leading-relaxed">{extensionStatus.message}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>

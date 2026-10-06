<script lang="ts">
    import { match } from 'ts-pattern';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { Badge, type BadgeVariant } from '$lib/components/ui/badge/index.js';
    import {
        CircleSmall,
        Eye,
        LoaderCircle,
        Compass,
        Hourglass,
        Download,
        Pickaxe,
        Upload,
        CircleCheck,
        SaveCheck,
        RotateCw,
        TriangleAlert,
    } from '@lucide/svelte';

    import { extensionStatus } from '@/ui/sidebar/stores/ui.svelte';
    import { getIndicatorColor } from '@/ui/sidebar/util';
    import type { StatusLevel } from '@/types';

    let cfg = $derived(getIndicatorColor(extensionStatus.status));

    let icons: Record<StatusLevel, any> = {
        idle: CircleSmall,

        inspecting: Eye,

        running: LoaderCircle,
        extracting: Pickaxe,
        waiting: Hourglass,
        navigating: Compass,
        completed: CircleCheck,
        retrying: RotateCw,

        errored: TriangleAlert,
        importing: Upload,
        exporting: Download,
        saving: SaveCheck,
        loading: Upload,
    };

    let currentIcon = $derived(icons[extensionStatus.status]);
    let statusGroup = $derived.by(() => {
        return match(extensionStatus.status)
            .with(
                'running',
                'extracting',
                'navigating',
                'waiting',
                'retrying',
                () => 'animate-spin',
            )
            .with(
                'inspecting',
                'loading',
                'importing',
                'exporting',
                'saving',
                'errored',
                'completed',
                () => 'animate-pulse',
            )
            .with('idle', () => '')
            .exhaustive();
    });
    let badgeVariant = $derived.by(() => {
        return match(extensionStatus.status)
            .returnType<BadgeVariant>()
            .with('running', 'extracting', 'navigating', 'waiting', () => 'ongoing')
            .with('errored', () => 'failure')
            .with('completed', () => 'success')
            .with('retrying', () => 'recovering')
            .with('inspecting', 'loading', 'importing', 'exporting', 'saving', () => 'loading')
            .with('idle', () => 'secondary')
            .exhaustive();
    });
</script>

<Tooltip.Root>
    <Tooltip.Trigger class="min-w-0 shrink">
        <Badge variant={badgeVariant} class="min-w-0 shrink max-w-full">
            {@const Icon = currentIcon}
            <Icon class="shrink-0 {statusGroup}" />
            <span class="text-sm font-medium truncate min-w-0">
                {cfg.label}
            </span>
            {#if extensionStatus?.progress}
                <span
                    class="text-sm bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-mono shrink-0"
                >
                    {extensionStatus?.progress.progressIndex}/{extensionStatus.progress.progressMax}
                </span>
            {/if}
        </Badge>
    </Tooltip.Trigger>
    <Tooltip.Content
        class="max-w-xs space-y-1.5 p-3  bg-slate-900 text-slate-100 border border-slate-800 shadow-xl rounded-lg"
    >
        <p class="font-bold text-sm text-slate-400">{cfg.label}</p>
        <hr />
        <p class="text-sm wrap-break-word leading-relaxed">{extensionStatus.message}</p>
    </Tooltip.Content>
</Tooltip.Root>

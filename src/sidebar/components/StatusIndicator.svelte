<script lang="ts">
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { CircleSmall } from '@lucide/svelte';

    import { extensionStatus } from '../stores/ui.svelte';
    import { getIndicatorColor } from '../util';

    let cfg = () => getIndicatorColor(extensionStatus.status);
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger>
            <Badge variant="secondary" class="gap-2">
                <CircleSmall
                    fill={cfg().style}
                    color={cfg().style}
                    class={['idle', 'errored'].includes(extensionStatus.status)
                        ? ''
                        : 'animate-pulse'}
                    size={32}
                />
                <span class="text-base">
                    {cfg().label}
                </span>
            </Badge>
        </Tooltip.Trigger>
        <Tooltip.Content>
            {extensionStatus.message}
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>

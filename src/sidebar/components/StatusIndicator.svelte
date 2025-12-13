<script lang="ts">
    import { cn } from '$lib/utils';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';

    import { status } from '../state.svelte'


    const STATUS_CONFIG = {
        ['idle']: { label: 'Idle', style: 'bg-gray-500' },
        ['extracting']: { label: 'Extracting', style: 'bg-green-500 animate-pulse' },
        ['error']: { label: 'Error', style: 'bg-red-500 animate-bounce' },
        ['importing']: { label: 'Importing', style: 'bg-[#8a3ffc] animate-pulse' },
        ['exporting']: { label: 'Exporting', style: 'bg-[#0043ce] animate-pulse' },
        ['saving']: { label: 'Saving', style: 'bg-[#8a3ffc] animate-pulse' },
    };
    let cfg = () => STATUS_CONFIG[$status?.level] ?? STATUS_CONFIG['idle'];
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger>
            <Badge variant="secondary" class="gap-2">
                <span class={cn('size-2 rounded-full', cfg().style)}></span>
                <span class="text-base">
                    {cfg().label}
                </span>
            </Badge>
        </Tooltip.Trigger>
        <Tooltip.Content>
          {$status.message}
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
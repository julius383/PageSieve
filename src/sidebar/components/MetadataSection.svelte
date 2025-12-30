<script lang="ts">
    import * as Item from '$lib/components/ui/item/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Textarea } from '$lib/components/ui/textarea/index.js';
    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';
    import { Copy, ExternalLink } from '@lucide/svelte';

    import { default as dayjs } from 'dayjs';
    import advancedFormat from 'dayjs/plugin/advancedFormat.js';
    dayjs.extend(advancedFormat);

    import { metadata } from '../state.svelte';

    function copyId() {
        navigator.clipboard.writeText($metadata.id);
    }

    function update(key: string, value: string) {
        metadata.update((current) => {
            return { ...current, [key]: value };
        });
    }
</script>

<!-- ID -->
<Item.Root>
    <Item.Content>
        <Item.Title>ID</Item.Title>
        <Item.Description>
            <div class="flex items-center gap-2">
                <code class="text-wrap rounded-md text-xs">
                    {$metadata.id}
                </code>
            </div>
        </Item.Description>
    </Item.Content>
    <Item.Actions>
        <Button size="icon" variant="ghost" onclick={copyId}>
            <Copy class="h-4 w-4" />
        </Button>
    </Item.Actions>
</Item.Root>

<!-- Description -->
<Item.Root>
    <Item.Content>
        <Item.Title>Description</Item.Title>
        <Item.Description>
            <Textarea
                placeholder="What does this scrape collect?"
                rows={2}
                value={$metadata.description ?? ''}
                oninput={(e) => update('description', e.currentTarget.value)}
            />
        </Item.Description>
    </Item.Content>
</Item.Root>

<!-- URL -->
<Item.Root>
    <Item.Content>
        <Item.Title>Target URL</Item.Title>
        <Item.Description>
            <span class="underline decoration-sky-500">{$metadata.url}</span>
        </Item.Description>
    </Item.Content>
    <Item.Actions>
        <Button size="icon" variant="ghost" onclick={() => window.open($metadata.url, '_blank')}>
            <ExternalLink class="h-4 w-4" />
        </Button>
    </Item.Actions>
</Item.Root>

<!-- Version + Author -->
<div class="grid grid-cols-2">
    <div class="space-y-1">
        <Item.Root>
            <Item.Content>
                <Item.Title>Version</Item.Title>
                <Item.Description>
                    <Input
                        value={$metadata.version}
                        oninput={(e) => update('version', e.currentTarget.value)}
                    />
                </Item.Description>
            </Item.Content>
        </Item.Root>
    </div>

    <div class="space-y-1">
        <Item.Root>
            <Item.Content>
                <Item.Title>Author</Item.Title>
                <Item.Description>
                    <Input
                        placeholder="Optional"
                        value={$metadata.author ?? ''}
                        oninput={(e) => update('author', e.currentTarget.value)}
                    />
                </Item.Description>
            </Item.Content>
        </Item.Root>
    </div>
</div>

<Separator />

<!-- Derived / Read-only -->
<div class="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
    <Item.Root>
        <Item.Content>
            <Item.Title class="font-medium">Selectors</Item.Title>
            <Item.Description>{$metadata.selectorCount ?? '—'}</Item.Description>
        </Item.Content>
    </Item.Root>

    <Item.Root>
        <Item.Content>
            <Item.Title class="font-medium">Last run</Item.Title>
            <Item.Description>
                {dayjs($metadata.lastRunAt).format('D MMM YYYY h:mm A')}
            </Item.Description>
        </Item.Content>
    </Item.Root>
</div>

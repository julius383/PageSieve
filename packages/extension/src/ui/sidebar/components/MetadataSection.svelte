<script lang="ts">
    import * as Item from '$lib/components/ui/item/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Textarea } from '$lib/components/ui/textarea/index.js';
    import { Button } from '$lib/components/ui/button';
    import { Copy, ExternalLink } from '@lucide/svelte';

    import { default as dayjs } from 'dayjs';
    import advancedFormat from 'dayjs/plugin/advancedFormat.js';
    dayjs.extend(advancedFormat);

    import { scrapeConfig } from '@/ui/sidebar/stores/scrapeConfig.svelte';

    function copyId() {
        navigator.clipboard.writeText(scrapeConfig.id);
    }

    function update(key: string, value: unknown) {
        scrapeConfig[key] = value;
    }
</script>

<!-- TODO: add new toplevel fields -->
<div class="space-y-4">
    <Item.Root variant="outline">
        <Item.Content>
            <Item.Title>ID</Item.Title>
            <Item.Description>
                <div class="flex items-center gap-2">
                    <code class="text-wrap rounded-md text-xs">
                        {scrapeConfig.id}
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

    <Item.Root>
        <Item.Content>
            <Item.Title>Description</Item.Title>
            <Item.Description>
                <Textarea
                    placeholder="What does this scrape collect?"
                    rows={2}
                    value={scrapeConfig.description ?? ''}
                    oninput={(e) => update('description', e.currentTarget.value)}
                />
            </Item.Description>
        </Item.Content>
    </Item.Root>

    <Item.Root>
        <Item.Content>
            <Item.Title>Target URL</Item.Title>
            <Item.Description>
                {scrapeConfig.url}
            </Item.Description>
        </Item.Content>
        <Item.Actions>
            <Button
                size="icon"
                variant="ghost"
                onclick={() => window.open(scrapeConfig.url, '_blank')}
            >
                <ExternalLink class="h-4 w-4" />
            </Button>
        </Item.Actions>
    </Item.Root>

    <div class="grid grid-cols-2">
        <div class="space-y-1">
            <Item.Root>
                <Item.Content>
                    <Item.Title>Revision</Item.Title>
                    <Item.Description>
                        <Input
                            type="number"
                            min="1"
                            step="1"
                            value={scrapeConfig.revision}
                            oninput={(e) => update('revision', e.currentTarget.value)}
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
                            value={scrapeConfig.author ?? ''}
                            oninput={(e) => update('author', e.currentTarget.value)}
                        />
                    </Item.Description>
                </Item.Content>
            </Item.Root>
        </div>
    </div>
</div>

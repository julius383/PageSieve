<script lang="ts">
    import * as Tabs from '$lib/components/ui/tabs/index.js';
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';

    import FieldGroup from './FieldGroup.svelte';
    import ElementPicker from './ElementPicker.svelte';
    import { scrapeConfig } from '../stores/scrapeConfig.svelte';
    import { PaginationConfig } from '../../types';

    import { Trash2, Plus } from '@lucide/svelte';

    const stored = scrapeConfig.pagination;

    // TODO: make sure defaults are set correctly
    let paginationState = $state({
        mode: stored.mode,

        none: { mode: 'none' },
        next: {
            mode: 'next',
            nextSelector: 'nextSelector' in stored ? stored.nextSelector : '',
            maxPages: 'maxPages' in stored ? stored.maxPages : 0,
        },

        links: {
            mode: 'links',
            pageLinks: 'pageLinks' in stored ? stored.pageLinks : [],
        },

        template: {
            mode: 'template',
            urlTemplate: 'urlTemplate' in stored ? stored.urlTemplate : '',
            startPage: 'startPage' in stored ? stored.startPage : 1,
            increment: 'increment' in stored ? stored.increment : 1,
            maxPages: 'maxPages' in stored ? stored.maxPages : 0,
        },
    });

    $effect(() => {
        const snapshot = $state.snapshot(paginationState);
        const result = PaginationConfig.safeParse(snapshot[snapshot.mode]);
        if (!result.success) {
            // TODO: improve show error in UI
            console.error(result.error); // ZodError instance
        } else {
            Object.assign(scrapeConfig.pagination, result.data);
        }
    });

    function addLink() {
        updateLinks([...paginationState.links.pageLinks, '']);
    }

    function updateLinks(nextLinks: string[]) {
        paginationState.links.pageLinks = nextLinks;
    }

    function updateLinkAt(index: number, value: string) {
        const next = [...paginationState.links.pageLinks];
        next[index] = value;
        updateLinks(next);
    }
    function removeLink(index: number) {
        updateLinks(paginationState.links.pageLinks.filter((_, i) => i !== index));
    }
</script>

<Tabs.Root bind:value={paginationState.mode} class="flex-1 min-h-0 flex flex-col">
    <Tabs.List class="grid w-full grid-cols-4">
        <Tabs.Trigger value="none">None</Tabs.Trigger>
        <Tabs.Trigger value="next">Next button</Tabs.Trigger>
        <Tabs.Trigger value="links">Page links</Tabs.Trigger>
        <Tabs.Trigger value="template">URL Template</Tabs.Trigger>
    </Tabs.List>

    <!-- TODO: make sure setting none config works as expected -->
    <Tabs.Content value="none"></Tabs.Content>
    <Tabs.Content value="next">
        <ElementPicker
            label="Next Button Selector"
            bind:cssSelector={paginationState.next.nextSelector}
        />

        <Field.Set>
            <Field.Group>
                <Field.Field>
                    <Field.Label>Max Pages</Field.Label>
                    <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 1000"
                        bind:value={paginationState.next.maxPages}
                    />
                    <Field.Description>Maximum number of pages to scrape</Field.Description>
                </Field.Field>
            </Field.Group>
        </Field.Set>
    </Tabs.Content>
    <Tabs.Content value="links">
        <!-- pageLinks?: string[]; -->
        {#if paginationState.links.pageLinks.length === 0}
            <p class="text-sm text-muted-foreground">No links added yet.</p>
        {/if}

        <div class="space-y-2">
            {#each paginationState.links.pageLinks as link, i}
                <div class="flex items-center gap-2">
                    <Input
                        class="flex-1"
                        placeholder="/products?page=1"
                        value={link}
                        oninput={(e) => updateLinkAt(i, e.currentTarget.value)}
                    />

                    <Button
                        size="icon"
                        variant="destructive"
                        onclick={() => removeLink(i)}
                        aria-label="Remove link"
                    >
                        <Trash2 />
                    </Button>
                </div>
            {/each}
        </div>

        <Separator />

        <Button class="mt-4 w-full" onclick={addLink}>
            <Plus />
            Add link
        </Button>
    </Tabs.Content>
    <Tabs.Content value="template">
        <!-- TEMPLATE -->
        <Field.Set>
            <Field.Group>
                <Field.Field>
                    <Field.Label>URL Template</Field.Label>
                    <Input
                        placeholder="/products?page={'{{'}page{'}}'}"
                        bind:value={paginationState.template.urlTemplate}
                    />
                    <Field.Description>
                        Use <code>&lbrace;&lbrace;page&rbrace;&rbrace;</code> as the page placeholder.
                    </Field.Description>
                </Field.Field>

                <div class="grid grid-cols-3 gap-4">
                    <Field.Field>
                        <Field.Label>Start page</Field.Label>
                        <Input
                            type="number"
                            min="0"
                            bind:value={paginationState.template.startPage}
                        />
                    </Field.Field>

                    <Field.Field>
                        <Field.Label>Increment</Field.Label>
                        <Input
                            type="number"
                            min="1"
                            bind:value={paginationState.template.increment}
                        />
                    </Field.Field>

                    <Field.Field>
                        <Field.Label>Max pages</Field.Label>
                        <Input
                            type="number"
                            min="1"
                            placeholder="Optional"
                            bind:value={paginationState.template.maxPages}
                        />
                    </Field.Field>
                </div>
            </Field.Group>
        </Field.Set>

        <!-- Preview -->
        {#if paginationState.template.urlTemplate.includes('{{page}}')}
            <div class="rounded-md border bg-muted p-3 text-sm">
                <p class="font-medium mb-1">Preview</p>
                <code class="block">
                    {paginationState.template.urlTemplate.replace(
                        '{{page}}',
                        String(paginationState.template.startPage),
                    )}
                </code>
                <code class="block">
                    {paginationState.template.urlTemplate.replace(
                        '{{page}}',
                        String(
                            paginationState.template.startPage +
                                (paginationState.template.increment || 1),
                        ),
                    )}
                </code>
            </div>
        {:else}
            <p class="text-sm text-destructive">
                Template must include <code>&lbrace;&lbrace;page&rbrace;&rbrace;</code>
            </p>
        {/if}
    </Tabs.Content>
</Tabs.Root>

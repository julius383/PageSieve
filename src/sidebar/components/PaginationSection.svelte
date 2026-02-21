<script lang="ts">
    import { untrack } from 'svelte';

    import * as Tabs from '$lib/components/ui/tabs/index.js';
    import * as Field from '$lib/components/ui/field/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import { Textarea } from '$lib/components/ui/textarea/index.js';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';

    import ElementPicker from './ElementPicker.svelte';
    import { scrapeConfig } from '../stores/scrapeConfig.svelte';
    import { paginationState, commitPaginationToScrapeConfig } from '../stores/pagination.svelte';
    import { Navigation } from '@lucide/svelte';
    import { navigateTo } from '../actions';

    function updateLinks(event: Event) {
        let text = (event?.currentTarget as HTMLTextAreaElement)?.value;
        paginationState.links.pageLinks = text.split('\n');
    }

    function goToNextPage() {
        if (commitPaginationToScrapeConfig()) {
            navigateTo($state.snapshot(scrapeConfig), true);
        }
    }

    /**
     * Effect to synchronize the local paginationState with the global scrapeConfig.pagination.
     * This is crucial for when a new configuration is loaded, ensuring the UI reflects
     * the new pagination settings.
     */
    $effect(() => {
        const snapshot = $state.snapshot(scrapeConfig.pagination);
        untrack(() => {
            // Update the specific mode's data
            paginationState[snapshot.mode] = snapshot;
            // Switch the active mode
            paginationState.mode = snapshot.mode;
        });
    });
</script>

<div>
    <Tabs.Root
        bind:value={paginationState.mode}
        class="flex-1 min-h-0 flex flex-col border p-2.5 rounded-md"
    >
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
            <div class="grid w-full gap-1.5">
                <Label for="message-2">Links to Other Pages</Label>
                <Textarea
                    placeholder="Add links here. One per line"
                    id="message-2"
                    class="h-50"
                    oninput={updateLinks}
                    value={paginationState.links.pageLinks.join('\n')}
                />
            </div>
        </Tabs.Content>
        <Tabs.Content value="template">
            <!-- TEMPLATE -->
            <Field.Set>
                <Field.Group>
                    <Field.Field>
                        <Field.Label>URL Template</Field.Label>
                        <!-- eslint-disable-next-line svelte/no-useless-mustaches -->
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

    <div class="flex items-center justify-center">
        <!-- TODO: improve design  -->
        <Button
            disabled={paginationState.mode === 'none'}
            onclick={goToNextPage}
            class="mt-4 w-10/12 bg-sky-600 text-2xl mb-6 text-white"
        >
            <Navigation size={32} /> Test Navigation
        </Button>
    </div>
</div>

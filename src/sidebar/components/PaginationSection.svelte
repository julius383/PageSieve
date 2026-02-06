<script lang="ts">
    import * as Tabs from '$lib/components/ui/tabs/index.js';
    import * as Field from '$lib/components/ui/field/index.js';
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as z from 'zod';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { onMount, onDestroy } from 'svelte';

    import ElementPicker from './ElementPicker.svelte';
    import { scrapeConfig } from '../stores/scrapeConfig.svelte';
    import { PaginationConfig } from '../../types';

    import { Navigation } from '@lucide/svelte';
    import { setStatus } from '../stores/ui.svelte';
    import { navigateTo } from '../actions';

    // Define a helper function to transform scrapeConfig.pagination into the structure needed for paginationState
    function mapScrapeConfigToPaginationState(config: PaginationConfig) {
        const newState = {
            mode: config.mode,
            none: { mode: 'none' },
            next: {
                mode: 'next',
                nextSelector: '',
                maxPages: 0,
            },
            links: {
                mode: 'links',
                pageLinks: [''],
            },
            template: {
                mode: 'template',
                urlTemplate: '',
                startPage: 1,
                increment: 1,
                maxPages: 0,
            },
        };

        if (config.mode === 'next') {
            newState.next.nextSelector = config.nextSelector;
            if (config.maxPages) { newState.next.maxPages = config.maxPages; }
        } else if (config.mode === 'links') {
            newState.links.pageLinks = config.pageLinks;
        } else if (config.mode === 'template') {
            newState.template.urlTemplate = config.urlTemplate;
            newState.template.startPage = config.startPage;
            newState.template.increment = config.increment;
            if (config.maxPages) { newState.template.maxPages = config.maxPages; }
        }
        return newState;
    }

    $effect(() => {
        const snapshot = $state.snapshot(scrapeConfig.pagination);
        paginationState[snapshot.mode] = snapshot
        paginationState.mode = snapshot.mode;
    });

    let paginationState = $state(mapScrapeConfigToPaginationState(scrapeConfig.pagination));

    /**
     * Validates the current `paginationState` and, if successful,
     * updates `scrapeConfig.pagination` with the validated data.
     * Sets UI status based on validation result.
     * @returns {boolean} True if the commit was successful, false otherwise.
     */
    function commitPaginationToScrapeConfig(): boolean {
        const snapshot = $state.snapshot(paginationState);
        const result = PaginationConfig.safeParse(snapshot[snapshot.mode]);

        if (!result.success) {
            setStatus('errored', z.prettifyError(result.error));
            return false;
        } else {
            // Only update scrapeConfig.pagination if the data is actually different
            if (JSON.stringify(scrapeConfig.pagination) !== JSON.stringify(result.data)) {
                Object.assign(scrapeConfig.pagination, result.data);
            }
            setStatus('idle', 'Ready'); // Clear any previous error upon successful validation
            return true;
        }
    }

    function updateLinks(event: Event) {
        let text = event?.currentTarget?.value;
        paginationState.links.pageLinks = text.split("\n");
    }

    function goToNextPage() {
        if (commitPaginationToScrapeConfig()) {
            navigateTo($state.snapshot(scrapeConfig.pagination));
        }
    }

    const messageHandler = (message: any) => {
        if (message.action === 'triggerCommitPagination') {
            commitPaginationToScrapeConfig();
        }
    };
    onMount(() => {
        browser.runtime.onMessage.addListener(messageHandler);

    });
    onDestroy(() => {
        browser.runtime.onMessage.removeListener(messageHandler);
    });

    // let currentTab = $state($state.snapshot(scrapeConfig.pagination).mode);
</script>

<div>

    <Tabs.Root bind:value={paginationState.mode} class="flex-1 min-h-0 flex flex-col border p-2.5 rounded-md">
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
                    value={paginationState.links.pageLinks.join("\n")}
                />
            </div>

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


    <div class="flex items-center justify-center">
        <!-- TODO: improve design  -->
        <Button disabled={paginationState.mode === 'none'} onclick={goToNextPage} class="mt-4 w-10/12 bg-sky-600 text-2xl mb-6 text-white">
            <Navigation size={32} /> Test Navigation
        </Button>
    </div>
</div>
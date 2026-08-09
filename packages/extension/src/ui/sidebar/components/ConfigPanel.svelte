<script lang="ts">
    import * as Accordion from '$lib/components/ui/accordion/index.js';
    import * as Item from '$lib/components/ui/item/index.js';
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Separator } from '$lib/components/ui/separator';
    import { Button } from '$lib/components/ui/button';
    import { Copy, ExternalLink, Check } from '@lucide/svelte';
    import { debounce } from 'es-toolkit/function';
    import { scrapeConfig, setScrapeConfigValue } from '@/ui/sidebar/stores/scrapeConfig.svelte';
    import type { ScrapeConfig as ScrapeConfigT } from '@pagesieve/core';

    import MetadataSection from '@/ui/sidebar/components/MetadataSection.svelte';
    import OptionsSection from '@/ui/sidebar/components/OptionsSection.svelte';
    import PaginationSection from '@/ui/sidebar/components/PaginationSection.svelte';

    let copied = $state(false);
    let copyTarget = $state('');
    let timeoutId: ReturnType<typeof setTimeout>;
    function copyToClipboard(text: string, target: string) {
        navigator.clipboard.writeText(text);

        copied = true;
        copyTarget = target;
        clearTimeout(timeoutId); // avoid overlapping timers if clicked again quickly
        timeoutId = setTimeout(() => {
            copied = false;
            copyTarget = '';
        }, 1500);
    }
    type ConfigKey = keyof ScrapeConfigT;
    type ConfigValue = (typeof scrapeConfig)[ConfigKey];
    const updateKey = debounce((key: ConfigKey, value: ConfigValue) => {
        setScrapeConfigValue(key, value);
    }, 1000);
</script>

<div class="space-y-4 text-white">
    <Field.Field id="main-url" class="gap-3">
        <Field.Label for="url">URL</Field.Label>
        <div class="flex items-center justify-between gap-2">
            <Input
                placeholder="e.g en.wikipedia.org/*"
                value={scrapeConfig.url}
                id="url"
                class="text-sm text-indigo-300"
                oninput={(e) => updateKey('url', e.currentTarget.value)}
            />
            <Button
                size="icon"
                variant="ghost"
                onclick={() => window.open(scrapeConfig.url, '_blank')}
            >
                <ExternalLink class="h-4 w-4" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                onclick={() => copyToClipboard(scrapeConfig.url, 'url')}
            >
                {#if copied && copyTarget == 'url'}
                    <Check color="#2cc55d" class="h-4 w-4" />
                {:else}
                    <Copy class="h-4 w-4" />
                {/if}
            </Button>
        </div>
        <Field.Description>Starting URL for ScrapeConfig.</Field.Description>
    </Field.Field>

    <Item.Root variant="outline">
        <Item.Content>
            <Item.Title>ID</Item.Title>
            <Item.Description>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-mono break-all">{scrapeConfig.id}</span>
                    <Button
                        size="icon"
                        variant="ghost"
                        onclick={() => copyToClipboard(scrapeConfig.id, 'id')}
                    >
                        {#if copied && copyTarget == 'id'}
                            <Check color="#2cc55d" class="h-4 w-4" />
                        {:else}
                            <Copy class="h-4 w-4" />
                        {/if}
                    </Button>
                </div>
            </Item.Description>
        </Item.Content>
    </Item.Root>
</div>

<Separator class="my-4" />

<Accordion.Root type="multiple">
    <Accordion.Item value="item-1">
        <Accordion.Trigger class="text-white font-bold text-xl">Metadata</Accordion.Trigger>
        <Accordion.Content>
            <MetadataSection />
        </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="item-3">
        <Accordion.Trigger class="text-white font-bold text-xl">Pagination</Accordion.Trigger>
        <Accordion.Content>
            <PaginationSection />
        </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="item-2">
        <Accordion.Trigger class="text-white font-bold text-xl"
            >Extraction Options</Accordion.Trigger
        >
        <Accordion.Content>
            <OptionsSection />
        </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="item-4">
        <Accordion.Trigger class="text-white font-bold text-xl">Variables</Accordion.Trigger>
        <Accordion.Content>Some Variables</Accordion.Content>
    </Accordion.Item>
</Accordion.Root>

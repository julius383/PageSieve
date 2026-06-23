<script lang="ts">
    import { Badge } from "$lib/components/ui/badge/index.js";
    import * as Field from "$lib/components/ui/field/index.js";
    import * as Item from '$lib/components/ui/item/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Textarea } from '$lib/components/ui/textarea/index.js';
    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';
    import { Copy, ExternalLink, Check, X } from '@lucide/svelte';
    import { debounce } from 'es-toolkit/function';

    import { default as dayjs } from 'dayjs';
    import advancedFormat from 'dayjs/plugin/advancedFormat.js';
    dayjs.extend(advancedFormat);

    import { scrapeConfig, setScrapeConfigValue } from '@/ui/sidebar/stores/scrapeConfig.svelte';
    import type { ScrapeConfig as ScrapeConfigT } from "@pagesieve/core";


    let copied = $state(false);
    let copyTarget = $state('')
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
    type ConfigValue = typeof scrapeConfig[ConfigKey];
    const updateKey = debounce((key: ConfigKey, value: ConfigValue) => {
        setScrapeConfigValue(key, value);
        ;
    }, 1000)

    let inputValue = $state("");
    function addTag(e: KeyboardEvent) {
        if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
            e.preventDefault();
            const tag = inputValue.trim().replace(/,$/, "");
            if (tag) {
                if (scrapeConfig.tags === undefined) {
                    scrapeConfig.tags = [tag];
                } else if (!scrapeConfig.tags.includes(tag)) {

                    scrapeConfig.tags = [...scrapeConfig.tags ?? [], tag];
                }

            }
            inputValue = "";
        } else if (e.key === "Backspace" && !inputValue) {
            if (scrapeConfig.tags !== undefined) {
                scrapeConfig.tags = scrapeConfig.tags.slice(0, -1);
            }
        }
    }

    function removeTag(tag: string) {
        if (scrapeConfig.tags !== undefined) {
            scrapeConfig.tags = scrapeConfig.tags.filter((t) => t !== tag);
            if (scrapeConfig.tags.length == 0) {
                delete scrapeConfig.tags;
            }
        }
    }
</script>

<div class="space-y-4 text-white">

    <Field.Set>
        <Field.Group>
            <Field.Field>
                <Field.Label for="cname">Name</Field.Label>
                <Input
                    id="cname"
                    placeholder="Extractor for Some Data"
                    value={scrapeConfig.name}
                    oninput={(e) => updateKey('name', e.currentTarget.value)}
                />
                <Field.Description
                >Choose a unique username for your account.</Field.Description
                >
            </Field.Field>
        </Field.Group>
    </Field.Set>

    <Separator class="my-2" />

    <Item.Root>
        <Item.Content>
            <Item.Title>ID</Item.Title>
            <Item.Description>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-mono break-all">{scrapeConfig.id}</span>
                    <Button size="icon" variant="ghost" onclick={() => copyToClipboard(scrapeConfig.id, 'id')}>
                        {#if copied && copyTarget == 'id'}
                            <Check color="green" class="h-4 w-4" />
                        {:else}
                            <Copy class="h-4 w-4" />
                        {/if}
                    </Button>
                </div>
            </Item.Description>
        </Item.Content>
    </Item.Root>


    <Field.Set>
        <Field.Group>
            <Field.Field>
                <Field.Label for="url">URL</Field.Label>
                <div class="flex items-center justify-between gap-2" >
                    <!-- <span class="text-sm text-blue-500"> {scrapeConfig.url} </span> -->
                    <Input
                        placeholder="e.g en.wikipedia.org/*"
                        value={scrapeConfig.url}
                        id="url"
                        class="text-sm text-blue-500"
                        oninput={(e) => updateKey('url', e.currentTarget.value)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onclick={() => window.open(scrapeConfig.url, '_blank')}
                    >
                        <ExternalLink class="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onclick={() => copyToClipboard(scrapeConfig.url, 'url')}>
                        {#if copied && copyTarget == 'url'}
                            <Check color="green" class="h-4 w-4" />
                        {:else}
                            <Copy class="h-4 w-4" />
                        {/if}
                    </Button>
                </div>
                <Field.Description> Starting URL for ScrapeConfig. </Field.Description>
            </Field.Field>
            <Field.Field>
                <Field.Label for="password">URL Pattern</Field.Label>
                <Input 
                    placeholder="e.g en.wikipedia.org/*"
                    value={scrapeConfig.urlPattern}
                    id="urlpattern"
                    oninput={(e) => updateKey('urlPattern', e.currentTarget.value)}
                />
                <Field.Description>Pages this config apply to (glob). </Field.Description>
            </Field.Field>
        </Field.Group>
    </Field.Set>


    <Separator class="my-1" />


    <Field.Set>
        <Field.Group>
            <Field.Field>
                <Field.Label for="tags">Tags</Field.Label>
                <div class="flex flex-wrap mb-2">
                    {#each scrapeConfig.tags as tag (tag)}
                        <Badge class="h-8 text-lg font-bold text-white bg-[#383838] rounded-sm flex items-center justify-between">
                            <span>{tag}</span>
                            <Button
                                size="icon"
                                onclick={() => removeTag(tag)}
                                aria-label={`Remove ${tag}`}
                                class="bg-transparent rounded hover:stroke-red-400 hover:bg-white/10"
                            >
                                <X class='size-4' color="white" onclick={() => removeTag(tag)}/>
                            </Button>
                        </Badge>
                    {/each}
                </div>
                <Input
                    bind:value={inputValue}
                    onkeydown={addTag}
                    placeholder="Type tag name and press enter or comma (,)"
                />
                <Field.Description>Content tags for categorizing config.</Field.Description>
            </Field.Field>
        </Field.Group>
    </Field.Set>

    <Field.Set>
        <Field.Group>
            <Field.Field>
                <Field.Label for="author">Author</Field.Label>
                <Input
                    placeholder="Optional"
                    id="author"
                    value={scrapeConfig.author ?? ''}
                    oninput={(e) => updateKey('author', e.currentTarget.value)}
                />
                <Field.Description>Who created this config.</Field.Description>
            </Field.Field>
        </Field.Group>
    </Field.Set>

    <Field.Set>
        <Field.Group>
            <Field.Field>
                <Field.Label for="description">Description</Field.Label>
                <Textarea
                    placeholder="What does this scrape collect?..."
                    id="description"
                    rows={2}
                    value={scrapeConfig.description ?? ''}
                    oninput={(e) => updateKey('description', e.currentTarget.value)}
                />
                <Field.Description>Detailed summary of the purpose of this config.</Field.Description>
            </Field.Field>
        </Field.Group>
    </Field.Set>

    <Field.Set>
        <Field.Group>
            <Field.Field>
                <Field.Label for="revision">Revision</Field.Label>
                <Input
                    type="number"
                    min="1"
                    step="1"
                    value={scrapeConfig.revision}
                    oninput={(e) => updateKey('revision', e.currentTarget.value)}
                />
                <Field.Description>Increment this when to indicate configuration changed.</Field.Description>
            </Field.Field>
        </Field.Group>
    </Field.Set>
</div>

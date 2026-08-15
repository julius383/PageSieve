<script lang="ts">
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Textarea } from '$lib/components/ui/textarea/index.js';
    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';
    import { X } from '@lucide/svelte';
    import { debounce } from 'es-toolkit/function';

    import { scrapeConfig, setScrapeConfigValue } from '@/ui/sidebar/stores/scrapeConfig.svelte';
    import type { ScrapeConfig as ScrapeConfigT } from '@pagesieve/core';

    type ConfigKey = keyof ScrapeConfigT;
    type ConfigValue = (typeof scrapeConfig)[ConfigKey];
    const updateKey = debounce((key: ConfigKey, value: ConfigValue) => {
        setScrapeConfigValue(key, value);
    }, 1000);

    let inputValue = $state('');
    function addTag(e: KeyboardEvent) {
        if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
            e.preventDefault();
            const tag = inputValue.trim().replace(/,$/, '');
            if (tag) {
                if (scrapeConfig.tags === undefined) {
                    scrapeConfig.tags = [tag];
                } else if (!scrapeConfig.tags.includes(tag)) {
                    scrapeConfig.tags = [...(scrapeConfig.tags ?? []), tag];
                }
            }
            inputValue = '';
        } else if (e.key === 'Backspace' && !inputValue) {
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
                <Field.Label for="password">URL Pattern</Field.Label>
                <Input
                    placeholder="e.g https://en.wikipedia.org/"
                    value={scrapeConfig.urlPattern}
                    id="urlpattern"
                    oninput={(e) => updateKey('urlPattern', e.currentTarget.value)}
                />
                <Field.Description>Pages this config applies to simple url or regex.</Field.Description>
            </Field.Field>
        </Field.Group>
    </Field.Set>

    <Separator class="my-2" />

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
                <Field.Description>Name for this config.</Field.Description>
            </Field.Field>
        </Field.Group>
    </Field.Set>

    <Field.Set>
        <Field.Group>
            <Field.Field>
                <Field.Label for="tags">Tags</Field.Label>
                <div class="flex flex-wrap mb-2">
                    {#each scrapeConfig.tags as tag (tag)}
                        <Badge
                            class="h-8 text-lg font-bold text-white bg-[#383838] rounded-sm flex items-center justify-between"
                        >
                            <span>{tag}</span>
                            <Button
                                size="icon"
                                onclick={() => removeTag(tag)}
                                aria-label={`Remove ${tag}`}
                                class="bg-transparent rounded hover:stroke-red-400 hover:bg-white/10"
                            >
                                <X class="size-4" color="white" onclick={() => removeTag(tag)} />
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
                    placeholder="You"
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
                <Field.Description
                    >Detailed summary of the purpose of this config.</Field.Description
                >
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
                <Field.Description
                    >Increment this when to indicate configuration changed.</Field.Description
                >
            </Field.Field>
        </Field.Group>
    </Field.Set>
</div>

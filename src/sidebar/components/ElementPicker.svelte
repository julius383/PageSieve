<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Pipette, Check, X } from '@lucide/svelte';

    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    import { setStatus } from '../stores/ui.svelte';

    let {
        label = 'Selector',
        header_style = 'font-medium text-sm leading-none',
        cssSelector = $bindable(),
        pickingElement = $bindable(false),
    } = $props();

    let pickerId: string;
    let foundElements: number = $state(0);
    let previousSelector: string = '';

    // This function will handle incoming messages from the content script.
    function messageListener(message) {
        if (message.action === 'selector-elementSelected' && message.pickerId === pickerId) {
            // Update your store with the new selector.
            cssSelector = message.selector;
            foundElements = message.foundElements;
        }
    }

    onMount(() => {
        pickerId = crypto.randomUUID();
        browser.runtime.onMessage.addListener(messageListener);
    });

    onDestroy(() => {
        browser.runtime.onMessage.removeListener(messageListener);
    });

    async function handleInspect() {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            const response = await browser.tabs.sendMessage(tab.id, {
                action: 'inspector-toggle',
                pickerId: pickerId,
            });
            if (response.isActive) {
                pickingElement = true;
                previousSelector = cssSelector;
                setStatus('inspecting', 'click html element to get CSS selector');
            }
        }
    }

    async function acceptSelection() {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            const response = await browser.tabs.sendMessage(tab.id, {
                action: 'inspector-accept',
            });

            if (response.computedSelector) {
                cssSelector = response.computedSelector;
                pickingElement = false;
                foundElements = 0;
                setStatus('idle', 'Ready');
            }
        }
        return;
    }

    async function cancelSelection() {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            const response = await browser.tabs.sendMessage(tab.id, {
                action: 'inspector-toggle',
            });

            if (!response.isActive) {
                pickingElement = false;
                foundElements = 0;
                cssSelector = previousSelector;
                setStatus('idle', 'Ready');
            }
        }
        return;
    }
</script>

<div class="grid w-full items-center gap-1.5">
    <label for="css-selector" class={header_style}>{label}</label>
    <div class="flex items-end gap-x-1 flex-start">
        <Input id="css-selector" bind:value={cssSelector} placeholder="e.g. h1.title, //h2" />
        {#if pickingElement}
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button onclick={acceptSelection} variant="outline" size="icon">
                            <Check />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Accept selection</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button onclick={cancelSelection} variant="destructive" size="icon">
                            <X />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Accept selection</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {:else}
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button onclick={handleInspect} variant="outline" size="icon">
                            <Pipette color="#fff" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>Start Element Picker</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {/if}
    </div>
    {#if foundElements > 0 && pickingElement}
        <span class="text-xs text-[##d3d3d3] italic">Matches <span class="font-bold">{foundElements}</span> elements</span>
    {/if}
</div>
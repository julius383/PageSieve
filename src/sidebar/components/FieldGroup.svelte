<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Trash2, Pipette, Check, X } from '@lucide/svelte';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    let { id, deleteHandler, fieldName = $bindable(), cssSelector = $bindable() } = $props();

    let pickingElement = $state(false);

    // This function will handle incoming messages from the content script.
    function messageListener(message, sender, sendResponse) {
        if (message.action === 'selector-elementSelected') {
            // Update your store with the new selector.
            cssSelector = message.selector;
        }
    }

    onMount(() => {
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
            });
            if (response.isActive) {
                pickingElement = true;
                browser.runtime.sendMessage({
                    action: 'set-status',
                    data: { level: 'inspecting', message: `inspecting for selector` },
                });
            }
        }
    }

    async function acceptSelection() {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            const response = await browser.tabs.sendMessage(tab.id, {
                action: 'inspector-toggle',
            });

            if (!response.isActive) {
                pickingElement = false;
                browser.runtime.sendMessage({
                    action: 'set-status',
                    data: { level: 'idle', message: `Ready` },
                });
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
                browser.runtime.sendMessage({
                    action: 'set-status',
                    data: { level: 'idle', message: `Ready` },
                });
            }
        }
        return;
    }
</script>

<div class="border p-4 rounded-md mb-4">
    <div class="flex items-end gap-2 mb-2">
        <div class="grid w-full items-center gap-1.5">
            <label for="field-name-{id}" class="text-sm font-medium leading-none">Field Name</label>
            <Input id="field-name-{id}" bind:value={fieldName} placeholder="e.g. productName" />
        </div>
        {#if pickingElement}
            <div class="flex items-end gap-x-1 flex-start">
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
            </div>
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
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button onclick={deleteHandler} variant="destructive" size="icon">
                            <Trash2 />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>Delete Field</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {/if}
    </div>
    <div class="grid w-full items-center gap-1.5">
        <label for="css-selector" class="text-sm font-medium leading-none">CSS Selector</label>
        <Input id="css-selector" bind:value={cssSelector} placeholder="e.g. h1.title" />
    </div>
</div>

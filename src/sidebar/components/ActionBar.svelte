<script lang="ts">
    import { scrapeConfig, resetDefinitions, addGroup } from '../stores/scrapeConfig.svelte';
    import { runConfig, importConfig, exportConfig, saveConfig } from '../actions';
    import { refreshConfigs, extensionStatus, setStatus } from '../stores/ui.svelte';

    import { Button } from '$lib/components/ui/button';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import * as ButtonGroup from "$lib/components/ui/button-group/index.js";

    import {
        Upload,
        Download,
        Play,
        Square,
        Save,
        SquarePlus,
        EllipsisVertical,
    } from '@lucide/svelte';

    function triggerLoad() {
        let fileinput = document.getElementById('import-config');
        fileinput?.click();
    }

    function interruptExecution() {
        setStatus('idle', 'Execution interrupted by user.');
    }

    async function handleSave() {
        await saveConfig(scrapeConfig);
        await refreshConfigs();
    }
</script>

<div class="flex items-center gap-2">

        <ButtonGroup.Root>
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        {#if ['running', 'extracting', 'navigating'].includes(extensionStatus.status)}
                            <Button
                                size="icon"
                                onclick={interruptExecution}
                                class="bg-red-500 text-white font-bold hover:bg-red-600"
                            >
                                <Square class="size-4 mr-1" strokeWidth={4} fill="white" />
                            </Button>
                        {:else}
                            <Button
                                size="icon"
                                onclick={() => runConfig($state.snapshot(scrapeConfig))}
                                class="bg-green-500 text-white font-bold hover:bg-green-600"
                            >
                                <Play class="size-4 mr-1" strokeWidth={4} />
                            </Button>
                        {/if}
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        {#if ['running', 'extracting', 'navigating'].includes(extensionStatus.status)}
                            Interrupt execution
                        {:else}
                            Scrape page
                        {/if}
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </ButtonGroup.Root>

        <ButtonGroup.Root>
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button size="icon" variant="ghost" onclick={handleSave} class="hover:text-gray-400 hover:bg-white/10">
                            <Save class="size-4" strokeWidth={2.5} />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Save config in browser</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <div class="cursor-pointer">
                            <input
                                id="import-config"
                                type="file"
                                accept=".json"
                                hidden
                                onchange={importConfig}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onclick={triggerLoad}
                                class="hover:text-gray-400 hover:bg-white/10"
                            >
                                <Upload class="size-4" strokeWidth={2.5} />
                            </Button>
                        </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Load config from file</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button
                            size="icon"
                            variant="ghost"
                            onclick={() => exportConfig(scrapeConfig)}
                            class="hover:text-gray-400 hover:bg-white/10"
                        >
                            <Download class="size-4" strokeWidth={2.5}  />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Save config to file</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </ButtonGroup.Root>

        <ButtonGroup.Root>
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button size="icon" variant="ghost" onclick={addGroup} class="hover:text-gray-400 hover:bg-white/10">
                            <SquarePlus class="size-4" strokeWidth={2.5}  />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>Add Selector Group</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </ButtonGroup.Root>

        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button
                                size="icon"
                                variant="ghost"
                                onclick={() => true}
                                class="hover:text-gray-400 hover:bg-white/10"
                            >
                                <EllipsisVertical class="size-4" strokeWidth={2.5}  />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>More actions</Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-56" align="start">
                <div class="bg-background">
                    <DropdownMenu.Item onclick={resetDefinitions}>Reset selectors</DropdownMenu.Item>
                </div>
            </DropdownMenu.Content>
        </DropdownMenu.Root>

</div>

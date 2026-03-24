<script lang="ts">
    import { scrapeConfig, resetDefinitions } from '../stores/scrapeConfig.svelte';
    import { runConfig, importConfig, exportConfig, saveConfig } from '../actions';
    import { refreshConfigs, extensionStatus, setStatus } from '../stores/ui.svelte';

    import { Button } from '$lib/components/ui/button';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    import { Upload, Download, Play, Square, Save, ListRestart } from '@lucide/svelte';

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

    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button size="icon" variant="ghost" onclick={handleSave}>
                    <Save class="size-4" strokeWidth={2.5} color="#fff" />
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
                    <Button size="icon" variant="ghost" onclick={triggerLoad}>
                        <Upload class="size-4" strokeWidth={2.5} color="#fff" />
                    </Button>
                </div>
            </Tooltip.Trigger>
            <Tooltip.Content>Load config from file</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button size="icon" variant="ghost" onclick={() => exportConfig(scrapeConfig)}>
                    <Download class="size-4" strokeWidth={2.5} color="#fff" />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Save config to file</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button size="icon" variant="destructive" onclick={resetDefinitions}>
                    <ListRestart class="size-4" strokeWidth={2.5} color="#fff" />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Reset selectors</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>
</div>

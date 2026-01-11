<script lang="ts">
    import { handleSaveConfig } from '../state.svelte';

    import { scrapeConfig, resetDefinitions } from '../stores/scrapeConfig.svelte';
    import { handleExtract, handleImportConfig, handleExportConfig } from '../actions';

    import { Button } from '$lib/components/ui/button';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';

    import { Upload, Download, Play, Save, ListRestart } from '@lucide/svelte';

    function triggerLoad() {
        let fileinput = document.getElementById('import-config');
        fileinput?.click();
    }
</script>

<div class="flex items-center gap-2">
    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button
                    size="icon"
                    onclick={() => handleExtract(scrapeConfig.selectors)}
                    class="bg-green-500 text-white font-bold hover:bg-green-600"
                >
                    <Play class="size-4 mr-1" strokeWidth={2.5} />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Scrape page</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button size="icon" variant="ghost" onclick={handleSaveConfig}>
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
                        onchange={handleImportConfig}
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
                <Button
                    size="icon"
                    variant="ghost"
                    onclick={() => handleExportConfig(scrapeConfig)}
                >
                    <Download class="size-4" strokeWidth={2.5} color="#fff" />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Save config to file</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>

    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button size="icon" variant="ghost" onclick={resetDefinitions}>
                    <ListRestart class="size-4" strokeWidth={2.5} color="#fff" />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Reset selectors</Tooltip.Content>
        </Tooltip.Root>
    </Tooltip.Provider>
</div>

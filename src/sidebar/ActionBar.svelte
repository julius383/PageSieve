<script lang="ts">
    import {
        resetFields,
        handleImportConfig,
        handleExportConfig,
        handleSaveConfig,
        handleExtract,
    } from './state.svelte';

    import StatusIndicator from './StatusIndicator.svelte';

    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';
    import { Upload, Download, Play, Save, ListRestart } from '@lucide/svelte';

    let status = $state<'idle' | 'extracting' | 'error' | 'importing' | 'exporting' | 'saving'>(
        'idle',
    );

    async function extract() {
        status = 'extracting';
        status = await handleExtract();
        console.log(`Set status to ${$state.snapshot(status)}`);
    }

    function import_(event: Event) {
        status = 'importing';
        handleImportConfig(event);
        status = 'idle';
    }

    function save(event: Event) {
        status = 'saving';
        handleSaveConfig();
        status = 'idle';
    }

    function export_() {
        status = 'exporting';
        handleExportConfig();
        status = 'idle';
    }
    function triggerLoad() {
        let fileinput = document.getElementById('import-config');
        fileinput?.click();
    }
</script>

<div class="flex items-center justify-between border-b bg-background px-2 py-1.5">
    <!-- Right side: Config actions -->
    <div class="flex items-center gap-2">
        <Button
            size="icon"
            onclick={extract}
            class="bg-green-500 text-white font-bold hover:bg-green-600"
        >
            <Play class="size-4 mr-1" strokeWidth={2.5} />
        </Button>

        <Button size="icon" variant="ghost" onclick={save}>
            <Save class="size-4" strokeWidth={2.5} />
        </Button>

        <div class="cursor-pointer">
            <input id="import-config" type="file" accept=".json" hidden onchange={import_} />
            <Button size="icon" variant="ghost" onclick={triggerLoad}>
                <Upload class="size-4" strokeWidth={2.5} />
            </Button>
        </div>

        <Button size="icon" variant="ghost" onclick={export_}>
            <Download class="size-4" strokeWidth={2.5} />
        </Button>

        <Button size="icon" variant="ghost" onclick={resetFields}>
            <ListRestart class="size-4" strokeWidth={2.5} />
        </Button>
    </div>

    <Separator orientation="vertical" class="mx-2 h-4" />

    <StatusIndicator {status} />
</div>

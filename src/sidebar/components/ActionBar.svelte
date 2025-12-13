<script lang="ts">
    import {
        resetFields,
        handleImportConfig,
        handleExportConfig,
        handleSaveConfig,
        handleExtract,
    } from '../state.svelte';

    import { Button } from '$lib/components/ui/button';

    import { Upload, Download, Play, Save, ListRestart } from '@lucide/svelte';

    let status = $state<'idle' | 'extracting' | 'error' | 'importing' | 'exporting' | 'saving'>(
        'idle',
    );

    async function extract() {
        await handleExtract();
    }

    function import_(event: Event) {
        handleImportConfig(event);
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

<div class="flex items-center gap-2">
    <Button
        size="icon"
        onclick={extract}
        class="bg-green-500 text-white font-bold hover:bg-green-600"
    >
        <Play class="size-4 mr-1" strokeWidth={2.5} />
    </Button>

    <Button size="icon" variant="ghost" onclick={save}>
        <Save class="size-4" strokeWidth={2.5} color="#fff" />
    </Button>

    <div class="cursor-pointer">
        <input id="import-config" type="file" accept=".json" hidden onchange={import_} />
        <Button size="icon" variant="ghost" onclick={triggerLoad}>
            <Upload class="size-4" strokeWidth={2.5} color="#fff" />
        </Button>
    </div>

    <Button size="icon" variant="ghost" onclick={export_}>
        <Download class="size-4" strokeWidth={2.5} color="#fff" />
    </Button>

    <Button size="icon" variant="ghost" onclick={resetFields}>
        <ListRestart class="size-4" strokeWidth={2.5} color="#fff" />
    </Button>
</div>

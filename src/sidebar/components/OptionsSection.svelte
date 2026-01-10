<script lang="ts">
    import { Checkbox } from '$lib/components/ui/checkbox/index.js';

    import { Input } from '$lib/components/ui/input';
    import { Separator } from '$lib/components/ui/separator';
    import * as Field from '$lib/components/ui/field/index.js';

    import type { ExtractionOptions } from '../../types.ts';

    import { scrapeConfig } from "../stores/scrapeConfig.svelte";

    function update<K extends keyof ExtractionOptions>(key: K, value: ExtractionOptions[K]) {
      scrapeConfig.options[key] = value;
    }
</script>

<!-- Load / Page Behavior -->

<Field.Set>
    <Field.Group>
        <Field.Field orientation="horizontal">
            <Checkbox
                checked={scrapeConfig.options.waitforNetworkIdle ?? false}
                onCheckedChange={(v) => update('waitforNetworkIdle', v)}
            />
            <Field.Content>
                <Field.Label>Wait for network idle</Field.Label>
                <Field.Description>Wait until no network requests are active</Field.Description>
            </Field.Content>
        </Field.Field>
        <Field.Field orientation="horizontal">
            <Checkbox
                checked={scrapeConfig.options.scrollToBottom ?? false}
                onCheckedChange={(v) => update('scrollToBottom', v)}
            />
            <Field.Content>
                <Field.Label>Scroll to Bottom</Field.Label>
                <Field.Description>Automatically scroll to load lazy content</Field.Description>
            </Field.Content>
        </Field.Field>
        <Field.Field orientation="horizontal">
            <Checkbox
                checked={scrapeConfig.options.runJavaScript ?? false}
                onCheckedChange={(v) => update('runJavaScript', v)}
            />
            <Field.Content>
                <Field.Label>Run JavaScript</Field.Label>
                <Field.Description>Allow page JavaScript execution</Field.Description>
            </Field.Content>
        </Field.Field>
    </Field.Group>
</Field.Set>

<Separator class="my-4" />

<Field.Set>
    <Field.Group>
        <Field.Field>
            <Field.Label>Delay (ms)</Field.Label>
            <Input
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 1000"
                bind:value={scrapeConfig.options.delayMs}
            />
            <Field.Description>Wait this many milliseconds before extraction.</Field.Description>
        </Field.Field>
        <Field.Field>
            <Field.Label>Timeout (ms)</Field.Label>
            <Input
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 30000"
                bind:value={scrapeConfig.options.timeoutMs}
            />
            <Field.Description>Abort extraction if the amount is exceeded</Field.Description>
        </Field.Field>
    </Field.Group>
</Field.Set>

<Separator class="my-4" />

<Field.Set>
    <Field.Group>
        <Field.Field orientation="horizontal">
            <Checkbox
                checked={scrapeConfig.options.appendData ?? false}
                onCheckedChange={(v) => update('appendData', v)}
            />
            <Field.Content>
                <Field.Label>Append to existing data</Field.Label>
                <Field.Description>
                    Add newly extracted data to the existing set instead of replacing it
                </Field.Description>
            </Field.Content>
        </Field.Field>
    </Field.Group>
</Field.Set>
<script lang="ts">
    import { Checkbox } from '$lib/components/ui/checkbox/index.js';

    import { Input } from '$lib/components/ui/input';
    import { Separator } from '$lib/components/ui/separator';
    import * as Field from '$lib/components/ui/field/index.js';

    import type { ExtractionOptions } from '../../types.ts';

    import { extractOptions } from '../state.svelte';

    function update<K extends keyof ExtractionOptions>(key: K, value: ExtractionOptions[K]) {
        extractOptions.update((current) => {
            return { ...current, [key]: value };
        });
    }
</script>

<!-- Load / Page Behavior -->

<Field.Set>
    <Field.Group>
        <Field.Field orientation="horizontal">
            <Checkbox
                checked={$extractOptions.waitForNetworkIdle ?? false}
                onCheckedChange={(v) => update('waitForNetworkIdle', v)}
            />
            <Field.Content>
                <Field.Label>Wait for network idle</Field.Label>
                <Field.Description>Wait until no network requests are active</Field.Description>
            </Field.Content>
        </Field.Field>
        <Field.Field orientation="horizontal">
            <Checkbox
                checked={$extractOptions.scrollToBottom ?? false}
                onCheckedChange={(v) => update('scrollToBottom', v)}
            />
            <Field.Content>
                <Field.Label>Scroll to Bottom</Field.Label>
                <Field.Description>Automatically scroll to load lazy content</Field.Description>
            </Field.Content>
        </Field.Field>
        <Field.Field orientation="horizontal">
            <Checkbox
                checked={$extractOptions.runJavaScript ?? false}
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
                value={$extractOptions.delayMs ?? ''}
                onInput={(e) =>
                    update('delayMs', Number((e.target as HTMLInputElement).value) || 0)}
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
                value={$extractOptions.timeoutMs ?? ''}
                onInput={(e) =>
                    update('timeoutMs', Number((e.target as HTMLInputElement).value) || 0)}
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
                checked={$extractOptions.appendData ?? false}
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

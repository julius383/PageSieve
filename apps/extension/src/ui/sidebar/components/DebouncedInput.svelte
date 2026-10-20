<script lang="ts">
    import { Input } from '$lib/components/ui/input/index.js';
    let {
        value,
        onchange,
        debounce = 500,
        ...rest
    }: {
        value: string | number;
        onchange: (value: string | number) => void;
        debounce?: number;
        [key: string]: unknown;
    } = $props();

    let internalValue: string | number = $derived(value);

    $effect(() => {
        const v = internalValue;
        const timeout = setTimeout(() => {
            onchange(v);
        }, debounce);
        return () => clearTimeout(timeout);
    });
</script>

<Input {...rest} bind:value={internalValue} />

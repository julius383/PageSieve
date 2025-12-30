<script lang="ts">
    import * as Accordion from '$lib/components/ui/accordion/index.js';

    import MetadataSection from './MetadataSection.svelte';
    import OptionsSection from './OptionsSection.svelte';
</script>

<Accordion.Root value={['item-1']} type="multiple">
    <Accordion.Item value="item-1">
        <Accordion.Trigger class="text-white font-bold text-xl">Metadata</Accordion.Trigger>
        <Accordion.Content>
            <MetadataSection />
        </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="item-2">
        <Accordion.Trigger class="text-white font-bold text-xl"
            >Extraction Options</Accordion.Trigger
        >
        <Accordion.Content>
            <OptionsSection />
        </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="item-3">
        <Accordion.Trigger class="text-white font-bold text-xl">Pagination</Accordion.Trigger>
        <Accordion.Content>Some pagination options</Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="item-4">
        <Accordion.Trigger class="text-white font-bold text-xl">Variables</Accordion.Trigger>
        <Accordion.Content>Some Variables</Accordion.Content>
    </Accordion.Item>
</Accordion.Root>

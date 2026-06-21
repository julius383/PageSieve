<script lang="ts">
    import * as Accordion from '$lib/components/ui/accordion/index.js';

    import MetadataSection from '@/ui/sidebar/components/MetadataSection.svelte';
    import OptionsSection from '@/ui/sidebar/components/OptionsSection.svelte';
    import PaginationSection from '@/ui/sidebar/components/PaginationSection.svelte';
</script>

<Accordion.Root type="multiple">
    <Accordion.Item value="item-1">
        <Accordion.Trigger class="text-white font-bold text-xl">Metadata</Accordion.Trigger>
        <Accordion.Content>
            <MetadataSection />
        </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="item-3">
        <Accordion.Trigger class="text-white font-bold text-xl">Pagination</Accordion.Trigger>
        <Accordion.Content>
            <PaginationSection />
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

    <Accordion.Item value="item-4">
        <Accordion.Trigger class="text-white font-bold text-xl">Variables</Accordion.Trigger>
        <Accordion.Content>Some Variables</Accordion.Content>
    </Accordion.Item>
</Accordion.Root>

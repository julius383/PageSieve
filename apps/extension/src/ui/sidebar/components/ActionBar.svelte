<script lang="ts">
    import { resetConfig, resetSelectors } from '@/ui/sidebar/stores/scrapeConfig.svelte';
    import { confirm } from '@/ui/sidebar/services/confirm.svelte';
    import {
        runConfig,
        importConfig,
        exportConfig,
        saveConfig,
        stopRun,
    } from '@/ui/sidebar/actions';
    import { refreshConfigs, extensionStatus } from '@/ui/sidebar/stores/ui.svelte';

    import { Button } from '$lib/components/ui/button';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import * as ButtonGroup from '$lib/components/ui/button-group/index.js';

    import {
        Upload,
        Download,
        Play,
        Square,
        Save,
        CircleQuestionMark,
        EllipsisVertical,
        BookOpen,
        Bug,
        Mail,
        GraduationCap,
        PackagePlus,
        GitGraph,
        Toolbox,
    } from '@lucide/svelte';

    function triggerLoad() {
        let fileinput = document.getElementById('import-config');
        fileinput?.click();
    }

    async function handleSave() {
        await saveConfig();
        await refreshConfigs();
    }

    async function handleResetConfig() {
        if (
            await confirm({
                title: 'Clear configuration?',
                description:
                    'Are you sure you want to clear the entire scrape configuration? This action cannot be undone.',
                confirmLabel: 'Clear',
                variant: 'destructive',
            })
        ) {
            resetConfig();
        }
    }

    async function handleResetSelectors() {
        if (
            await confirm({
                title: 'Clear selectors?',
                description:
                    'Are you sure you want to clear all selector groups? This action cannot be undone.',
                confirmLabel: 'Clear',
                variant: 'destructive',
            })
        ) {
            resetSelectors();
        }
    }

    const extensionVersion = browser.runtime.getManifest().version;

    const runningStates = ['running', 'extracting', 'navigating', 'waiting', 'waitingFor'];
</script>

<div class="flex items-center gap-1.5">
    <ButtonGroup.Root>
        <Tooltip.Root>
            <Tooltip.Trigger>
                {#if runningStates.includes(extensionStatus.status)}
                    <Button
                        size="icon"
                        onclick={stopRun}
                        class="bg-red-500 text-white font-bold hover:bg-red-600"
                    >
                        <Square class="mr-1" strokeWidth={4} fill="white" />
                    </Button>
                {:else}
                    <Button
                        size="icon"
                        onclick={() => runConfig()}
                        class="bg-green-500 text-white font-bold hover:bg-green-600"
                    >
                        <Play class="mr-1" strokeWidth={4} />
                    </Button>
                {/if}
            </Tooltip.Trigger>
            <Tooltip.Content>
                {#if runningStates.includes(extensionStatus.status)}
                    Interrupt execution
                {:else}
                    Scrape page
                {/if}
            </Tooltip.Content>
        </Tooltip.Root>
    </ButtonGroup.Root>

    <ButtonGroup.Root>
        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button
                    size="icon"
                    variant="ghost"
                    onclick={handleSave}
                    class="hover:text-gray-400 hover:bg-white/10"
                >
                    <Save strokeWidth={2.5} />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Save config in browser</Tooltip.Content>
        </Tooltip.Root>

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
                        <Upload strokeWidth={2.5} />
                    </Button>
                </div>
            </Tooltip.Trigger>
            <Tooltip.Content>Load config from file</Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
            <Tooltip.Trigger>
                <Button
                    size="icon"
                    variant="ghost"
                    onclick={() => exportConfig()}
                    class="hover:text-gray-400 hover:bg-white/10"
                >
                    <Download strokeWidth={2.5} />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Save config to file</Tooltip.Content>
        </Tooltip.Root>
    </ButtonGroup.Root>

    <DropdownMenu.Root>
        <DropdownMenu.Trigger>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button
                        size="icon"
                        variant="ghost"
                        onclick={() => true}
                        class="hover:text-gray-400 hover:bg-white/10"
                    >
                        <CircleQuestionMark strokeWidth={2.5} />
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Get Help</Tooltip.Content>
            </Tooltip.Root>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-56">
            <div class="bg-background">
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <BookOpen />
                        <a href="https://julius383.github.io/PageSieve/" target="_blank"
                            >Documentation</a
                        >
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <GraduationCap />
                        <a href="https://julius383.github.io/PageSieve/examples/" target="_blank"
                            >Tutorials</a
                        >
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <Toolbox />
                        <a
                            href="https://julius383.github.io/PageSieve/reference/selectors.html"
                            target="_blank">Troubleshooting</a
                        >
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <Bug />
                        <a href="https://github.com/julius383/PageSieve/issues" target="_blank"
                            >Report a Bug</a
                        >
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <Mail />
                        <a href="mailto:kibunjiajulius@gmail.com" target="_blank"
                            >Contact Developer</a
                        >
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <GitGraph />
                        <a href="https://github.com/julius383/PageSieve">Git Repository</a>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <PackagePlus />
                        <a href="https://julius383.github.io/PageSieve/CHANGELOG.html"
                            >What's New (v{extensionVersion})</a
                        >
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
            </div>
        </DropdownMenu.Content>
    </DropdownMenu.Root>

    <DropdownMenu.Root>
        <DropdownMenu.Trigger>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <Button
                        size="icon"
                        variant="ghost"
                        onclick={() => true}
                        class="hover:text-gray-400 hover:bg-white/10"
                    >
                        <EllipsisVertical strokeWidth={2.5} />
                    </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>More actions</Tooltip.Content>
            </Tooltip.Root>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-56" align="start">
            <div class="bg-background">
                <DropdownMenu.Item onclick={handleResetConfig}>Clear config</DropdownMenu.Item>
                <DropdownMenu.Item onclick={handleResetSelectors}>Clear selectors</DropdownMenu.Item
                >
            </div>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
</div>

import { createActor, type SnapshotFrom, toPromise } from 'xstate';
import { omit } from 'es-toolkit';
import { ScrapeContext, createScrapeMachine } from '@pagesieve/core/scrapeMachine';
import { createPlaywrightDriver } from './playwrightDriver';
import { chromium, type Browser } from 'playwright';
import type { RunOptions } from './commands';
import { saveOutput } from './util';

// FIXME: adapt for console environment
// FIXME: configure logtape logger
function actorSubscriber(snapshot: SnapshotFrom<any>) {
    const context: ScrapeContext = snapshot.context;
    const currentState =
        snapshot.value instanceof Object ? Object.keys(snapshot.value)[0] : snapshot.value;
    const logger = console;
    // logger.debug('Scrape context is {context}', { context: omit(context, ['config']) });
    logger.debug('Current state is {status} with context {context}', {
        status: currentState,
        context: omit(context, ['config', 'results']),
    });
    if (currentState === 'errored') {
        logger.error('An error occurred: {error}', {
            status: currentState,
            error: context.error || 'Unknown error',
        });
    } else if (currentState === 'extracting') {
        // TODO: add intermediate result checkpoints
        logger.info('Extracting data from {currentURL}', {
            status: currentState,
            currentURL: context.currentURL,
        });
    } else if (currentState === 'navigating') {
        logger.info('Navigating from {currentURL} using {pagination}', {
            status: currentState,
            currentURL: context.currentURL,
            pagination: context.config.pagination.mode,
        });
    } else if (currentState === 'waiting') {
        logger.info('Waiting for {delay} milliseconds', {
            status: currentState,
            delay: context.config.options.pageDelayMs,
        });
    }
}

// TODO: compile running information into stats file?
export async function run(options: RunOptions) {
    console.log('Running plawright started');
    const scrapeConfig = options.config;

    if (options.proxy !== undefined) {
        console.log(`using proxy ${options.proxy}`);
    }
    const spki = process.env.PAGESIEVE_PROXY_SPKI;
    const certArgs: string[] = [];
    if (spki && spki.length === 45) {
        certArgs.push(`--ignore-certificate-errors-spki-list=${spki}`);
    }

    const browser: Browser = await chromium.launch({
        proxy: options.proxy !== undefined ? { server: options.proxy } : undefined,
        // TODO: make this configurable
        // headless: false,
        args: ['--disable-gpu', ...certArgs],
    });

    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
    });

    const logger = console;
    const page = await context.newPage();

    await page.goto(scrapeConfig.url);
    const currentURL = page.url();

    const playwrightDriver = createPlaywrightDriver(page);
    const scrapeMachine = createScrapeMachine(playwrightDriver);

    const scrapeActor = createActor(scrapeMachine, {
        input: {
            config: scrapeConfig,
            startURL: currentURL,
        },
    });

    logger.debug('Created actor with {config}', { config: scrapeConfig });
    scrapeActor.subscribe(actorSubscriber);
    scrapeActor.start();
    scrapeActor.send({ type: 'START' });

    const extractionResults: ExtractedGroup[] | undefined = (await toPromise(scrapeActor))?.results;
    if (extractionResults !== undefined) {
        console.dir(extractionResults);
        console.info('Scrape completed with {count} results from {url}', {
            count: extractionResults.reduce((acc, g) => acc + g.results.length, 0),
        });
        const groupedResults: Record<string, any[]> = {};
        extractionResults.map((elem) => {
            groupedResults[elem.id] = [
                ...((groupedResults[elem.id] as object[]) ?? []),
                ...elem.results,
            ];
        });
        // await saveOutput(groupedResults, options.outputFormat, options.outputFile)
        await saveOutput(groupedResults, {
            format: options.outputFormat,
            mode: {
                kind: options.outputMode,
                filename: options.outputFile,
                dir: options.outputFile,
            },
        });
    }

    // TODO: handle user interrupting execution

    await context.close();
    await browser.close();
}

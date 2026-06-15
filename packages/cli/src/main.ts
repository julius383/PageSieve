import * as z from 'zod';
import { match } from 'ts-pattern';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { CheerioCrawler, EnqueueLinksOptions, log, LogLevel } from 'crawlee';
import { StoredConfig } from '@pagesieve/core/schema';
import { extractWithCheerio } from './cheerioDriver';

log.setLevel(LogLevel.INFO);

const { values } = parseArgs({
    options: {
        config: {
            type: 'string',
        },
        engine: {
            type: 'string',
        },
    },
    strict: true,
    allowPositionals: true,
});

if (!values.config) {
    console.error('Error: --config <path> is required');
    process.exit(1);
}

const fileContent = await readFile(values.config, 'utf8');
const stored = JSON.parse(fileContent);

const result = StoredConfig.safeParse(stored);
if (!result.success) {
    console.error('Configuration validation failed:');
    console.error(z.prettifyError(result.error));
    process.exit(1);
} else {
    console.log('Configuration validated successfully');
}
const scrapeConfig = result.data.config;


const crawler = new CheerioCrawler({
    minConcurrency: 3,
    maxConcurrency: 10,
    maxRequestRetries: scrapeConfig.options.maxRetries,
    requestHandlerTimeoutSecs: 30,
    maxRequestsPerCrawl:
        'maxPages' in scrapeConfig.pagination ? scrapeConfig.pagination.maxPages : 20,

    async requestHandler({ pushData, request, $, enqueueLinks }) {
        log.info(`Processing ${request.url}...`);

        const extractionResults = await extractWithCheerio($, scrapeConfig.selectors);

        log.info('Scrape completed with {count} results from {url}', {
            count: extractionResults.reduce((acc, g) => acc + g.results.length, 0),
            url: request.url,
        });

        await pushData(extractionResults);

        // Handle Pagination
        const pagination = scrapeConfig.pagination;
        const newLinks = match(pagination)
            .returnType<EnqueueLinksOptions | null>()
            .with({ mode: 'next' }, ({ nextSelector }) => {
                return {
                    selector: nextSelector,
                    label: 'NEXT',
                };
            })
            .with({ mode: 'links' }, ({ pageLinks }) => {
                return {
                    urls: pageLinks,
                    label: 'LIST',
                };
            })
            .with(
                {
                    mode: 'template',
                },
                ({ urlTemplate, startPage, increment, maxPages }) => {
                    const escapedTemplate = urlTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pageRegex = new RegExp(
                        escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'),
                    );

                    let currentPageNum = startPage;
                    const match = (request.url || '').match(pageRegex);
                    if (match && match[1]) currentPageNum = parseInt(match[1], 10);
                    const allURLs = Array.from({ length: maxPages ?? 100 }, (_, i) => {
                        return urlTemplate.replace(
                            '{{page}}',
                            (currentPageNum + i + increment).toString(),
                        );
                    });
                    console.log(`found ${allURLs}`);
                    return {
                        urls: allURLs,
                        limit: 100,
                        label: 'TEMPLATE',
                    };
                },
            )
            .with({ mode: 'none' }, () => null)
            .exhaustive();
        if (newLinks !== null) {
            await enqueueLinks(newLinks as EnqueueLinksOptions);
        }
    },

    failedRequestHandler({ request }) {
        log.error(`Request ${request.url} failed after multiple retries.`);
    },
});

await crawler.run([stored.config.metadata.url]);
log.debug('Crawler finished.');

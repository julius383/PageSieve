import { extractWithCheerio } from './cheerioEngine';
import { match } from 'ts-pattern';
import { delay } from 'es-toolkit';
import * as cheerio from 'cheerio';
import { createFetch, type FetchOptions } from "ofetch";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { PaginationStateStatus } from '@pagesieve/core/types';
import type { RunOptions } from './commands';
import { saveOutput } from './util';

const ofetch = createFetch({
  fetch: undiciFetch as unknown as typeof globalThis.fetch,
});

type PaginationResult = { status: PaginationStateStatus; msg: string };

export async function run(options: RunOptions) {
    const scrapeConfig = options.config;

    console.log(
        `using proxy ${options.proxy}`,
    );

    let cfetch = async (url: string, args: FetchOptions = {}) => {
        return await ofetch(url, args);
    };

    if (options.proxy !== undefined) {
        const proxyAgent = new ProxyAgent({
            uri: options.proxy,
            requestTls: { rejectUnauthorized: false }, // TLS to the target site
            proxyTls: { rejectUnauthorized: false },   // TLS to the proxy (if it's https)
        });
        cfetch = async (url: string, args: FetchOptions = {}) => {
            return await ofetch(url, { dispatcher: proxyAgent, ...args });
        };
    }

    let nextUrl = scrapeConfig.url;
    let processedPages = 0;
    const results: Record<string, any[]> = {};
    try {
        while (true) {
            // Handle Pagination
            const html = await cfetch(nextUrl, {
                // headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PageSieve/1.0)' },
                retry: scrapeConfig.options.maxRetries,
                retryDelay: scrapeConfig.options.pageDelayMs,
                timeout: scrapeConfig.options.timeoutMs,
            });
            const $ = cheerio.load(html);
            const extractionResults = await extractWithCheerio($, scrapeConfig.selectors);
            processedPages += 1;

            console.info('Scrape completed with {count} results from {url}', {
                count: extractionResults.reduce((acc, g) => acc + g.results.length, 0),
                url: nextUrl,
            });
            extractionResults.map((elem) => {
                results[elem.id] = [...(results[elem.id] as object[] ?? []), ...elem.results];
            });
            // results.push(...extractionResults);
            const pagination = scrapeConfig.pagination;
            const paginationStatus = match(pagination)
                .returnType<PaginationResult | null>()
                .with({ mode: 'next' }, ({ nextSelector, maxPages }) => {
                    if (processedPages + 1 > maxPages) {
                        return {
                            status: PaginationStateStatus.Failed,
                            msg: `Reached max pages limit ${maxPages}`,
                        };
                    }
                    const el = $(nextSelector);
                    if (el.prop('tagName') === 'A') {
                        const url = el.attr('href');
                        if (url === undefined) {
                            return {
                                status: PaginationStateStatus.Failed,
                                msg: `Unable to find href for selector ${nextSelector}`,
                            } as PaginationResult;
                        }
                        return { status: PaginationStateStatus.InProgress, msg: url };
                    } else {
                        return {
                            status: PaginationStateStatus.Failed,
                            msg: 'This engine does not support non link next pagination. Use playwright engine',
                        };
                    }
                })
                .with({ mode: 'links' }, ({ pageLinks }) => {
                    const idx = pageLinks.findIndex((url: string) => url === nextUrl);
                    if (idx + 1 >= pageLinks.length) {
                        return { status: PaginationStateStatus.Complete, msg: nextUrl };
                    }
                    const newURL = pageLinks[idx + 1];
                    return { status: PaginationStateStatus.InProgress, msg: newURL };
                })
                .with({ mode: 'template' }, ({ urlTemplate, startPage, increment, maxPages }) => {
                    if (processedPages + 1 > maxPages) {
                        return {
                            status: PaginationStateStatus.Failed,
                            msg: `Reached max pages limit ${maxPages}`,
                        };
                    }
                    const escapedTemplate = urlTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pageRegex = new RegExp(
                        escapedTemplate.replace('\\{\\{page\\}\\}', '(\\d+)'),
                    );

                    let currentPageNum = startPage;
                    const match = (nextUrl || '').match(pageRegex);
                    if (match && match[1]) currentPageNum = parseInt(match[1], 10);

                    const newURL = urlTemplate.replace(
                        '{{page}}',
                        (currentPageNum + increment).toString(),
                    );
                    return { status: PaginationStateStatus.InProgress, msg: newURL };
                })
                .with({ mode: 'none' }, () => null)
                .exhaustive();
            if (paginationStatus?.status == PaginationStateStatus.InProgress) {
                nextUrl = paginationStatus.msg;
                await delay(scrapeConfig.options.pageDelayMs + Math.random() * 500);
                continue;
            } else if (paginationStatus?.status == PaginationStateStatus.Complete) {
                console.log(paginationStatus.msg);
                break;
            } else {
                console.error(paginationStatus?.msg);
                process.exitCode = 1;
                break;
            }
        }
        // await saveOutput(results, options.outputFormat, options.outputFile)
        await saveOutput(results, {
            format: options.outputFormat,
            mode: { kind: options.outputMode, filename: options.outputFile, dir: options.outputFile },
        });
    } catch (error) {
        console.error(error);
    }
}

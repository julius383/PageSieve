import { ScrapeConfig } from '@pagesieve/core/schema';
import { omit } from 'es-toolkit';
import { match } from 'ts-pattern';
import * as z from 'zod';
import { constants, accessSync, readFileSync } from 'node:fs';
import { Command, InvalidArgumentError } from 'commander';
import { run as runPlaywright } from './playwright';
import { run as runCheerio } from './cheerio';
import { type SupportedExportDataTypes } from '@pagesieve/core/types';

const program = new Command();

export const SupportedExportDataTypesSchema = z.enum([
    'json',
    'ndjson',
    'csv',
    'html',
    'markdown',
    'yaml',
]) satisfies z.ZodType<SupportedExportDataTypes>;

const indentString = (str: string, count: number, indent = ' ') =>
    str.replace(/^/gm, indent.repeat(count));

type ParseResult<T> = { type: 'ok'; data: T } | { type: 'error'; msg: string };

function parseOptions<T>(schema: z.ZodType<T>, obj: unknown): ParseResult<T> {
    const result = schema.safeParse(obj);
    const command = schema.meta()?.title;

    if (command === undefined) {
        throw new Error('parseOptions: schema is missing a `.meta({ title })`');
    }

    if (!result.success) {
        const showConfigLink = result.error.issues[0].path[0] === 'config';
        const pretty = z.prettifyError(result.error);
        let errorString = `Invalid option for ${command}:\n\n`;
        errorString += indentString(pretty, 2);
        if (showConfigLink) {
            errorString += `\nSee full config documentation at: https://julius383.github.io/PageSieve/reference/configuration.html`;
        }
        return { type: 'error', msg: errorString };
    }
    return { type: 'ok', data: result.data };
}

const VerifySchema = z
    .object({
        config: ScrapeConfig,
    })
    .meta({ title: 'verify', description: 'Check if ScrapeConfig is valid and print any errors' });

const MigrateSchema = z
    .object({
        config: ScrapeConfig.meta({ description: 'Scrape recipe' }),
        version: z.enum(['latest']).default('latest'), // TODO: extend when schema version updates
    })
    .meta({ title: 'migrate' });

const RunSchema = z
    .object({
        config: ScrapeConfig.meta({ description: 'Scrape recipe' }),
        engine: z
            .enum(['cheerio', 'playwright'])
            .default('cheerio')
            .meta({ description: 'Which engine to use' }),
        outputFile: z
            .string()
            .default('output')
            .meta({ description: 'File or folder to save to without extension' }),
        outputFormat: SupportedExportDataTypesSchema.default('json').meta({
            description: 'Which format to output for each result',
        }),
        outputMode: z.enum(['single', 'zip', 'directory']).default('single').meta({
            description: 'How to save files. Important when extracting different kinds of data',
        }),
        proxy: z.url().optional().meta({ description: 'Proxy URL to route requests through' }),
        dryRun: z.boolean().default(false).meta({ description: 'Test mode' }),
        maxRequests: z.coerce
            .number()
            .min(0)
            .default(500)
            .meta({ description: 'Maximum total number of requests' }),
    })
    .meta({ title: 'run', description: 'Extract using ScrapeConfig and save results' });

export type RunOptions = z.infer<typeof RunSchema>;

const ServerSchema = z
    .object({
        proxy: z.url().optional().meta({ description: 'Proxy URL to route requests through' }),
        port: z.coerce
            .number()
            .min(1)
            .max(65535)
            .default(4444)
            .meta({ description: 'PORT to start server' }),
    })
    .meta({ title: 'server' });

function checkFile(config: string): unknown {
    try {
        accessSync(config, constants.R_OK);
    } catch {
        throw new InvalidArgumentError(`config ${config} does not exist`);
    }

    try {
        const raw = readFileSync(config, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        throw new InvalidArgumentError(`Failed to parse ${config}: ${err}`);
    }
}

program.name('pagesieve').description('PageSieve scraping toolkit');


// TODO: add interactive mode
program
    .command('run')
    .description(RunSchema.description!)
    .option('-c, --config <config-file>', RunSchema.shape.config.description!, checkFile)
    .option(
        '-o, --output-file [output]',
        RunSchema.shape.outputFile.description!,
        RunSchema.shape.outputFile.parse(undefined),
    )
    .option(
        '-f, --output-format [format]',
        RunSchema.shape.outputFormat.description!,
        RunSchema.shape.outputFormat.parse(undefined),
    )
    .option(
        '-m, --output-mode [mode]',
        RunSchema.shape.outputMode.description!,
        RunSchema.shape.outputMode.parse(undefined),
    )
    .option(
        '-e, --engine [engine]',
        RunSchema.shape.engine.description!,
        RunSchema.shape.engine.parse(undefined),
    )
    .option(
        '-r, --max-requests [number]',
        RunSchema.shape.maxRequests.description!,
        RunSchema.shape.maxRequests.parse(undefined).toString(),
    )
    .option('-x, --proxy <proxy>', 'URL for proxy to use')
    .option(
        '--dry-run',
        RunSchema.shape.dryRun.description!,
        RunSchema.shape.dryRun.parse(undefined),
    )
    .action(async (opts) => {
        const options = parseOptions(RunSchema, opts);
        console.dir(omit(opts, ['config']));

        if (options.type === 'error') {
            console.error(options.msg);
            process.exitCode = 1;
            return;
        }

        const data = options.data;
        console.log(data.config.id);
        match(data)
            .with({ engine: 'cheerio' }, async (options) => {
                console.log('Starting cheerio extraction');
                await runCheerio(options);
            })
            .with({ engine: 'playwright' }, async (options) => {
                console.log('Starting playwright extraction');
                await runPlaywright(options);
            })
            .exhaustive();
    });

program
    .command('verify')
    .description(VerifySchema.description!)
    .option('-c, --config <config-file>', VerifySchema.shape.config.description!, checkFile)
    .action((opts) => {
        const options = parseOptions(VerifySchema, opts);

        if (options.type === 'error') {
            console.error(options.msg);
            process.exitCode = 1;
            return;
        }
        console.log(`Config is correct. (${options.data.config.schemaVersion})`);
    });

program
    .command('migrate')
    .description('Migrate between ScrapeConfig versions')
    .option('-c, --config <config-file>', 'config to check', checkFile)
    .option(
        '--version <version>',
        'version to migrate to',
        MigrateSchema.shape.version.parse(undefined),
    )
    .action((opts) => {
        const options = parseOptions(MigrateSchema, opts);
        if (options.type === 'error') {
            console.error(options.msg);
            process.exitCode = 1;
            return;
        }
        const data = options.data;
        const currentVersion = ScrapeConfig.shape.schemaVersion.parse(undefined);
        const configVersion = data.config.schemaVersion;
        if (configVersion === currentVersion) {
            console.log('Config up to date.');
        } else {
            console.log(`Migrating from ${configVersion} -> ${currentVersion}`);
        }
    });

program
    .command('serve')
    .description('Start PageSieve Run service')
    .option(
        '-p, --port <port>',
        'port number to start service',
        ServerSchema.shape.port.parse(undefined).toString(),
    )
    .option('-x, --proxy <proxy>', 'URL for proxy to use')
    .action((opts) => {
        const options = parseOptions(ServerSchema, opts);

        if (options.type === 'error') {
            console.error(options.msg);
            process.exitCode = 1;
            return;
        }
        const data = options.data;
        console.log(`Starting server on ${data.port} - ${data.proxy}`);
    });

export function dumpHelp() {
    const helper = program.createHelp();

    const commands = helper.visibleCommands(program);
    commands.forEach(cmd => {
        console.log(`Command: ${cmd.name()}`);
        console.log(`   ${helper.subcommandTerm(cmd)} ${helper.subcommandDescription(cmd)}`);

        console.log('Options:');
        const options = helper.visibleOptions(cmd);
        options.forEach(option => {
            console.log(`  ${helper.optionTerm(option)} ${helper.optionDescription(option)}`);
        });
        console.log();

        // arguments
    });
}

// dumpHelp();
await program.parseAsync();

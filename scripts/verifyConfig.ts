#!/usr/bin/env bun
import { parseArgs } from 'util';
import { ScrapeConfig } from '../packages/core/src/schema';
import * as z from 'zod';

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        file: {
            type: 'string',
        },
    },
    strict: true,
    allowPositionals: true,
});

const file = Bun.file(values.file);
const json = await file.json();

const result = ScrapeConfig.safeParse(json);
if (!result.success) {
    console.log(z.prettifyError(result.error));
    console.dir(json);
} else {
    console.log('No Errors');
}

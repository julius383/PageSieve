#!/usr/bin/env bun
import { parseArgs } from 'util';
import { StoredConfig } from './types';
import * as z from 'zod';

const { values, positionals } = parseArgs({
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

const result = StoredConfig.safeParse(json);
if (!result.success) {
    console.log(z.prettifyError(result.error));
    console.dir(json);
} else {
    console.log('No Errors');
}

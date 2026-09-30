import { convertTo } from '@pagesieve/core/converters';
import { type SupportedExportDataTypes } from '@pagesieve/core/types';
import { sanitizeSegment } from '@pagesieve/core/util';
import { zipSync, strToU8 } from 'fflate';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type OutputMode =
    | { kind: 'single' } // one file, all data merged
    | { kind: 'zip'; filename: string } // one zip with per-key files
    | { kind: 'directory'; dir: string }; // individual files in a directory

type SaveOptions = {
    format: SupportedExportDataTypes;
    mode: OutputMode;
};

function writeSingle(data: object[], format: SupportedExportDataTypes, filename: string) {
    const converted = convertTo(data, format);
    const outputFile = `${sanitizeSegment(filename)}.${format}`;
    writeFileSync(outputFile, converted, 'utf-8');
    console.log(`Results written to ${outputFile}`);
}

function writeZip(
    data: Record<string, object[]>,
    format: SupportedExportDataTypes,
    filename: string,
) {
    const filesToZip: Record<string, Uint8Array> = {};
    for (const [key, value] of Object.entries(data)) {
        const outputFile = `${sanitizeSegment(key)}.${format}`;
        filesToZip[outputFile] = strToU8(convertTo(value, format));
    }
    const zipOutputFile = `${filename}.zip`;
    writeFileSync(zipOutputFile, zipSync(filesToZip));
    console.log(`Results written to ${zipOutputFile}`);
}

function writeDirectory(
    data: Record<string, object[]>,
    format: SupportedExportDataTypes,
    dir: string,
) {
    mkdirSync(dir, { recursive: true });
    for (const [key, value] of Object.entries(data)) {
        const outputFile = join(dir, `${sanitizeSegment(key)}.${format}`);
        writeFileSync(outputFile, convertTo(value, format), 'utf-8');
    }
    console.log(`Results written to ${dir}/`);
}

export async function saveOutput(data: Record<string, object[]>, { format, mode }: SaveOptions) {
    switch (mode.kind) {
        case 'single':
            writeSingle(Object.values(data).flat(), format, 'output');
            break;
        case 'zip':
            writeZip(data, format, mode.filename);
            break;
        case 'directory':
            writeDirectory(data, format, mode.dir);
            break;
    }
}

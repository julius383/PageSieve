import { convertTo } from '@pagesieve/core/converters';
import {
    type SupportedExportDataTypes,
    isSupportedExportType,
    isNestableType,
} from '@pagesieve/core/types';
import { sanitizeSegment } from '@pagesieve/core/util';
import { zipSync, strToU8 } from 'fflate';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type OutputMode =
    | { kind: 'single'; filename: string } // one file, all data merged
    | { kind: 'zip'; filename: string } // one zip with per-key files
    | { kind: 'directory'; dir: string }; // individual files in a directory

type SaveOptions = {
    format: SupportedExportDataTypes;
    mode: OutputMode;
};

/**
 * Writes results to a singular file when possible i.e when output format supports nesting
 * otherwise writes multiple files using the output name as prefix for result file
 */
function writeSingle(
    data: Record<string, object[]>,
    format: SupportedExportDataTypes,
    filename: string,
): string[] {
    const parts = filename.split('.');
    let oformat = format;
    let ofile = filename;
    // filename passed with extension e.g output.json
    if (parts.length > 1) {
        const extension = parts[parts.length - 1].toLowerCase();
        if (isSupportedExportType(extension)) {
            oformat = extension;
            ofile = parts.slice(0, -1).join('.');
        }
    }
    // multiple groups in result
    if (Object.keys(data).length == 1) {
        console.log('Found only one group in results');
        const converted = convertTo(Object.values(data).flat(), oformat);
        const outputFile = `${sanitizeSegment(ofile)}.${oformat}`;
        writeFileSync(outputFile, converted, 'utf-8');
        return [outputFile];
    } else {
        if (isNestableType(oformat)) {
            const converted = convertTo(data, oformat);
            const outputFile = `${sanitizeSegment(ofile)}.${oformat}`;
            writeFileSync(outputFile, converted, 'utf-8');
            return [outputFile];
        } else {
            const files = [];
            for (const [key, value] of Object.entries(data)) {
                const outputFile = `${sanitizeSegment(ofile)}-${sanitizeSegment(key)}.${oformat}`;
                const converted = convertTo(value, oformat);
                writeFileSync(outputFile, converted, 'utf-8');
                files.push(outputFile);
            }
            return files;
        }
    }
}

function writeZip(
    data: Record<string, object[]>,
    format: SupportedExportDataTypes,
    filename: string,
): string[] {
    const filesToZip: Record<string, Uint8Array> = {};
    for (const [key, value] of Object.entries(data)) {
        const outputFile = `${sanitizeSegment(key)}.${format}`;
        filesToZip[outputFile] = strToU8(convertTo(value, format));
    }
    const zipOutputFile = `${filename}.zip`;
    writeFileSync(zipOutputFile, zipSync(filesToZip));
    return [zipOutputFile];
}

function writeDirectory(
    data: Record<string, object[]>,
    format: SupportedExportDataTypes,
    dir: string,
): string[] {
    const files = [];
    mkdirSync(dir, { recursive: true });
    for (const [key, value] of Object.entries(data)) {
        const outputFile = join(dir, `${sanitizeSegment(key)}.${format}`);
        writeFileSync(outputFile, convertTo(value, format), 'utf-8');
        files.push(outputFile);
    }
    return files;
}

export async function saveOutput(data: Record<string, object[]>, { format, mode }: SaveOptions) {
    let files = [];
    switch (mode.kind) {
        case 'single':
            files = writeSingle(data, format, mode.filename);
            break;
        case 'zip':
            files = writeZip(data, format, mode.filename);
            break;
        case 'directory':
            files = writeDirectory(data, format, mode.dir);
            break;
    }
    for (let file of files) {
        console.log(`Results written to ${file}`);
    }
}

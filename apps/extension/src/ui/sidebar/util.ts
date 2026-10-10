import { match } from 'ts-pattern';
import { downloadZip } from 'client-zip';
import type { ExtractedGroup, SupportedExportDataTypes } from '@pagesieve/core/types';
import type { StatusLevel } from '@/types';
import { sanitizeSegment } from '@pagesieve/core/util';
import { convertTo, getMimeType } from '@pagesieve/core/converters';

export function formatColumnName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function downloadBundle(
    data: ExtractedGroup[],
    format: SupportedExportDataTypes = 'csv',
    filename: string = 'data.zip',
) {
    try {
        const files = data.map((group) => {
            const convertedData = convertTo(group.results, format);
            const fname = sanitizeSegment(`group_${group.id}`);
            return { name: `${fname}.${format}`, lastModified: new Date(), input: convertedData };
        });

        const zipBlob = await downloadZip(files).blob();
        const url = URL.createObjectURL(zipBlob);

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', url);
        downloadAnchorNode.setAttribute('download', filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
    }
}

export async function clipboardCopy(data: object[], format: SupportedExportDataTypes = 'json') {
    let res: string = '';
    if ('id' in data[0] && 'results' in data[0]) {
        // passed full results object, combine them together with 2 newlines
        res = '';
        data.forEach((elem) => {
            res += convertTo((elem as ExtractedGroup).results, format);
            res += format == 'yaml' ? '---\n' : '\n\n';
        });
    } else {
        res = convertTo(data, format);
    }
    await navigator.clipboard.writeText(res);
}

export async function downloadFormat(data: object[], format: SupportedExportDataTypes = 'json') {
    try {
        const converted = convertTo(data, format);
        const blob = new Blob([converted], { type: `${getMimeType(format)};charset=utf-8;` });
        const url = URL.createObjectURL(blob);

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', url);
        downloadAnchorNode.setAttribute('download', `data.${format}`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
    }
}

export function getIndicatorColor(status: StatusLevel): { label: string; style: string } {
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const label = capitalize(status);
    /* prettier-ignore-start */
    return match(status)
        .returnType<{ label: string; style: string }>()
        .with('idle', () => ({ label, style: '#CBD5E1' }))
        .with('running', () => ({ label, style: '#00bbf9' }))
        .with('extracting', () => ({ label, style: '#00bbf9' }))
        .with('navigating', () => ({ label, style: '#00bbf9' }))
        .with('inspecting', () => ({ label, style: '#9b5de5' }))
        .with('waiting', 'waitingFor', () => ({ label, style: '#f9c74f' }))
        .with('saving', 'loading', 'importing', 'exporting', () => ({ label, style: '#f77f00' }))
        .with('errored', 'retrying', () => ({ label, style: '#F87171' }))
        .with('completed', () => ({ label, style: '#228b22' }))
        .exhaustive();
    /* prettier-ignore-end */
}

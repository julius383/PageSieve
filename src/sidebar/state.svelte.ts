import { Parser } from '@json2csv/plainjs';
import { writable, derived, get } from "svelte/store";

import { default as dayjs } from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';

dayjs.extend(advancedFormat);

export const fields = writable([{ id: 1, name: '', selector: '' }])
let nextId = 2;


export function addField() {
  fields.update(currentFields => [
    ...currentFields,
    { id: nextId++, name: '', selector: '' }
  ]);
}

export function deleteField(id: number) {
  fields.update(currentFields =>
    currentFields.filter(item => item.id !== id)
  );
}

export function resetFields() {
  nextId = 1;
  fields.set([{ id: nextId++, name: '', selector: '' }]);
}


let currentURL = $state('');
let currentTitle = $state('');

browser.runtime.sendMessage({ action: 'getTabUrl' }).then((response) => {
  currentURL = response.url;
  currentTitle = response.title;
  console.log(`Current URL is ${response.url}`);
});

export const properties = writable([{ id: 1, key: 'URL', value: '' }]);
let nextPropId = 2;


export function addProperty() {
  properties.update(currentFields => [
    ...currentFields,
    { id: nextPropId++, key: '', value: '' }
  ]);
}

export function deleteProperty(id: number) {
  properties.update(currentFields =>
    currentFields.filter(item => item.id !== id)
  );
}

export function resetProperties() {
  nextPropId = 1;
  properties.set([{ id: nextPropId++, key: '', value: '' }]);
}


export const extractedData = writable([]);
export const extractedJSON = derived(
  extractedData,
  $extractedData => JSON.stringify($extractedData, null, 2)
);

// Derived store for columns
export const columns = derived(
  extractedData,
  $extractedData =>
    $extractedData.length > 0
      ? Object.keys($extractedData[0]).filter(key => key !== 'id')
      : []
);


export function downloadJSON() {
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(get(extractedJSON));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'data.json');
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function downloadCSV() {
  try {
    const parser = new Parser();
    const csv = parser.parse(get(extractedData));

    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'data.csv');
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    console.log(csv);
  } catch (err) {
    console.error(err);
  }
}

export async function handleExtract() {
  const selectors = get(fields).filter((f) => f.name && f.selector);

  if (selectors.length === 0) {
    console.warn('No selectors to extract');
    console.dir(get(fields));
    return 'Error';
  }

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const response = await browser.tabs.sendMessage(tabs[0].id, {
        action: 'extractData',
        selectors: JSON.parse(JSON.stringify(selectors)),
      });

      if (response && response.result) {
        // Object.assign(extractedData, response.result);
        extractedData.set(response.result);
        console.dir(get(extractedData));
        return 'Idle';
      } else {
        console.log('Error, failed to extract selectors');
        return 'Error';
      }
    } else {
      console.log('Error: No active tab found.');
      return 'Error';
    }
  } catch (error) {
    console.error('Error during extraction:', error);
    return 'Error';
  }
}


export function handleImportConfig(event: Event) {
  const fileInput = event.target as HTMLInputElement;
  const file = fileInput.files?.[0];
  if (!file) return;
  let configData;
  const reader = new FileReader();
  reader.onload = () => {
    if (reader.result) {
      configData = JSON.parse(reader.result as string);

      console.dir(configData);
      if (configData != undefined) {
        fields.set([]);
        for (const item of configData['fieldConf']) {
            fields.update(currentFields => [
                ...currentFields,
                item
            ]);
          // fields.push(item);
        }
        properties.set([])
        for (const item of configData['propsConf']) {
            properties.update(current => [
                ...current,
                item
            ]);
        }
        nextId = get(fields).length;
        nextPropId = get(properties).length;
      }
    }
  };
  reader.readAsText(file);
  console.log('Loaded config file:', file.name);
  fileInput.value = ''; // Reset for next use
}

export function handleExportConfig() {
  console.log('Downloading config...');
  const config = {
    fieldConf: get(fields),
    propsConf: get(properties),
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'config.json');
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export async function handleSaveConfig() {
  const tabInfo = await browser.runtime.sendMessage({ action: 'getTabUrl' });

  const config = {
    fieldConf: get(fields),
    propsConf: get(properties),
    createdAt: parseInt(dayjs().format('x')),
    updatedAt: parseInt(dayjs().format('x')),
    name: tabInfo.title,
  };
  console.log('Saving the following config');
  console.dir(config);
}


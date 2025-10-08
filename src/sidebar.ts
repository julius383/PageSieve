import { DOMInspector } from "./dominspector.mjs";


const domInspector = new DOMInspector();

document.addEventListener('DOMContentLoaded', () => {
  const fieldsContainer = document.getElementById('fieldsContainer');
  const addFieldButton = document.getElementById('addFieldButton');
  const extractButton = document.getElementById('extractButton');
  const outputJson = document.getElementById('outputJson') as HTMLTextAreaElement | null;

  // Function to add a new field group
  function addFieldGroup() {
    const newGroup = document.createElement('div');
    newGroup.className = 'field-group';
    newGroup.innerHTML = `
      <input type="text" class="fieldName" placeholder="Field Name">
      <input type="text" class="cssSelector" placeholder="CSS Selector">
    `;
    if (fieldsContainer != null) {
      fieldsContainer.appendChild(newGroup);
    }
  }

  // Event listener for adding new fields
  addFieldButton?.addEventListener('click', addFieldGroup);

  // Event listener for the extraction process
  extractButton?.addEventListener('click', () => {
    const selectors: { [key: string]: string } = {};
    const fieldGroups = document.querySelectorAll<HTMLElement>('.field-group');

    // Iterate through each field group and build the selectors object
    fieldGroups.forEach((group: HTMLElement) => {
      const fieldName = group?.querySelector<HTMLInputElement>('.fieldName')?.value.trim();
      const cssSelector = group?.querySelector<HTMLInputElement>('.cssSelector')?.value.trim();
      if (fieldName && cssSelector) {
        selectors[fieldName] = cssSelector;
      }
    });

    // Check if there are any selectors to process
    if (Object.keys(selectors).length === 0) {
      alert("Please enter at least one field name and CSS selector.");
      return;
    }

    // Pass the assembled selectors object to the content script
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs: browser.tabs.Tab[]) => {
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(
          tabs[0].id, {
          action: "extractData",
          selectors: selectors
        }).then(
          (response) => {
            if (response && response.data) {
                if (outputJson) {
                  outputJson.value = JSON.stringify(response.data, null, 2);
                }
            } else {
                if (outputJson) {
                  outputJson.value = "No data extracted. Check your selectors.";

                }
            }
          }
        );
      }
    })

  });
});

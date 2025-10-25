export class DOMInspector {
    isActive: boolean;
    currentHighlighted: HTMLElement | null;
    originalOutline: string | null;
    originalCursor: string | null;

    constructor() {
        this.isActive = false;
        this.currentHighlighted = null;
        this.originalOutline = null;
        this.originalCursor = null;

        // Bind methods to preserve 'this' context
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Listen for messages from popup
        browser.runtime.onMessage.addListener((request, _, sendResponse) => {
            if (request.action === 'toggle') {
                this.toggle();
                sendResponse({ isActive: this.isActive });
            } else if (request.action === 'getState') {
                sendResponse({ isActive: this.isActive });
            }
        });
    }

    toggle() {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    activate() {
        if (this.isActive) return;

        this.isActive = true;

        this.originalCursor = document.body.style.cursor;
        // Change cursor to indicate inspection mode
        document.body.style.cursor = 'crosshair';

        // Add event listeners
        document.addEventListener('mouseover', this.handleMouseOver, true);
        document.addEventListener('mouseout', this.handleMouseOut, true);
        document.addEventListener('click', this.handleClick, true);
        document.addEventListener('keydown', this.handleKeyDown, true);

        console.log(
            'DOM Inspector activated. Hover over elements to highlight, click to inspect. Press ESC to exit.',
        );
    }

    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;

        // Restore original cursor
        document.body.style.cursor = '';

        // Remove highlight from current element
        this.removeHighlight();

        // Remove event listeners
        document.removeEventListener('mouseover', this.handleMouseOver, true);
        document.removeEventListener('mouseout', this.handleMouseOut, true);
        document.removeEventListener('click', this.handleClick, true);
        document.removeEventListener('keydown', this.handleKeyDown, true);

        console.log('DOM Inspector deactivated.');
    }

    handleMouseOver(event: Event) {
        if (!this.isActive) return;

        event.stopPropagation();
        if (event.target != null) {
            this.highlightElement(event.target as HTMLElement);
        }
    }

    handleMouseOut(event: MouseEvent) {
        if (!this.isActive) return;

        event.stopPropagation();
        this.removeHighlight();
    }

    handleClick(event: Event) {
        if (!this.isActive) return;

        event.preventDefault();
        event.stopPropagation();

        this.inspectElement(event.target as HTMLElement);
    }

    handleKeyDown(event: KeyboardEvent) {
        if (!this.isActive) return;

        // ESC key to exit inspection mode
        if (event.key === 'Escape') {
            event.preventDefault();
            this.deactivate();
        }
    }

    highlightElement(element: HTMLElement) {
        // Remove previous highlight
        this.removeHighlight();

        // Store current element and its original outline
        this.currentHighlighted = element;
        this.originalOutline = element.style.outline;

        // Apply yellow border highlight
        element.style.outline = '8px solid #FFD700';
        element.style.outlineOffset = '1px';
    }

    removeHighlight() {
        if (this.currentHighlighted) {
            // Restore original outline
            this.currentHighlighted.style.outline = this.originalOutline || '';
            this.currentHighlighted.style.outlineOffset = '';
            this.currentHighlighted = null;
            this.originalOutline = null;
        }
    }

    inspectElement(element: HTMLElement) {
        console.log('=== DOM Element Inspection ===');
        console.log('Element:', element);
        console.log('Tag Name:', element.tagName);
        console.log('ID:', element.id || 'None');
        console.log('Classes:', element.className || 'None');
        console.log('Text Content:', element.textContent.trim().substring(0, 100) || 'None');
        console.log('Attributes:', this.getAttributes(element));
        console.log('Computed Style:', window.getComputedStyle(element));
        console.log('Parent Element:', element.parentElement);
        console.log('Children:', element.children);
        console.log('================================');

        // Also create a more detailed object for programmatic access
        const elementData = {
            element: element,
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent.trim(),
            attributes: this.getAttributes(element),
            computedStyle: window.getComputedStyle(element),
            parentElement: element.parentElement,
            children: Array.from(element.children),
            boundingRect: element.getBoundingClientRect(),
        };

        // Log the complete data object
        console.log('Complete Element Data:', elementData);

        // Make it available globally for further inspection
        // window.lastInspectedElement = elementData;
        console.log('Element data saved to window.lastInspectedElement');
    }

    getAttributes(element: HTMLElement) {
        const attrs = new Map<string, string>();
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            attrs.set(attr.name, attr.value);
            // attrs[attr.name] = attr.value;
        }
        return attrs;
    }
}

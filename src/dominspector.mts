export class DOMInspector {
    isActive: boolean;
    currentHighlighted: HTMLElement | null;
    originalCursor: string | null;
    highlightOverlay: HTMLDivElement | null;

    constructor() {
        this.isActive = false;
        this.currentHighlighted = null;
        this.originalCursor = null;
        this.highlightOverlay = null;

        // Bind methods to preserve 'this' context
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Listen for messages from popup
        browser.runtime.onMessage.addListener((request, _, sendResponse) => {
            if (request.action === 'inspector-toggle') {
                this.toggle();
                sendResponse({ isActive: this.isActive });
            } else if (request.action === 'inspector-getState') {
                sendResponse({ isActive: this.isActive });
            }
        });

        if (typeof document !== 'undefined') {
            this.highlightOverlay = document.createElement('div');
            this.highlightOverlay.style.position = 'absolute';
            this.highlightOverlay.style.zIndex = '9999999';
            this.highlightOverlay.style.border = '2px solid #FFD700';
            this.highlightOverlay.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            this.highlightOverlay.style.boxSizing = 'border-box';
            this.highlightOverlay.style.pointerEvents = 'none';
            this.highlightOverlay.style.display = 'none';
            document.body.appendChild(this.highlightOverlay);
        }

        console.log('Inspector instance created');
    }

    toggle() {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    activate() {
        console.log('Activating DOM inspector');
        if (this.isActive) return;

        this.isActive = true;

        this.originalCursor = document.body.style.cursor;
        // Change cursor to indicate inspection mode
        document.body.style.cursor = 'crosshair';

        // Add event listeners
        window.addEventListener('mouseover', this.handleMouseOver, true);
        window.addEventListener('mouseout', this.handleMouseOut, true);
        window.addEventListener('keydown', this.handleKeyDown, true);
        window.addEventListener('click', this.handleClick, true);

        console.log(
            'DOM Inspector activated. Hover over elements to highlight, click to inspect. Press ESC to exit.',
        );
    }

    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;

        // Restore original cursor
        document.body.style.cursor = this.originalCursor == null ? 'pointer' : this.originalCursor;

        // Remove highlight from current element
        this.removeHighlight();

        // Remove event listeners
        window.removeEventListener('mouseover', this.handleMouseOver, true);
        window.removeEventListener('mouseout', this.handleMouseOut, true);
        window.removeEventListener('keydown', this.handleKeyDown, true);
        window.removeEventListener('click', this.handleClick, true);

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

        // if (event.target === this.highlightOverlay) {
        //     return;
        // }

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
        if (element === this.highlightOverlay || element === document.body) {
            if (this.highlightOverlay) {
                this.highlightOverlay.style.display = 'none';
            }
            this.currentHighlighted = null;
            return;
        }

        this.currentHighlighted = element;

        if (this.highlightOverlay) {
            const rect = element.getBoundingClientRect();
            this.highlightOverlay.style.display = 'block';
            this.highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
            this.highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
            this.highlightOverlay.style.width = `${rect.width}px`;
            this.highlightOverlay.style.height = `${rect.height}px`;
        }
    }

    removeHighlight() {
        if (this.highlightOverlay) {
            this.highlightOverlay.style.display = 'none';
        }
        this.currentHighlighted = null;
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

        browser.runtime.sendMessage({
            action: 'selector-elementSelected',
            selector: element.className,
        });
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

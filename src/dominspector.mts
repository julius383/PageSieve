import { DomPredictionHelper } from './selectorgadget';

export class DOMInspector {
    isActive: boolean;

    whitelistedElements: Set<HTMLElement>;
    blacklistedElements: Set<HTMLElement>;
    currentHighlighted: HTMLElement | null;
    highlightOverlay: HTMLElement | null;
    originalCursor: string | null;
    helper: DomPredictionHelper;
    predictedSelector: string | null;
    activePickerId: string | null;

    // To manage highlight overlays for selected elements
    highlightOverlays: Map<HTMLElement, HTMLDivElement>;
    selectorOverlays: Map<HTMLElement, HTMLDivElement>;

    constructor() {
        this.isActive = false;
        this.originalCursor = null;
        this.activePickerId = null;

        this.currentHighlighted = null;
        this.predictedSelector = null;

        this.whitelistedElements = new Set();
        this.blacklistedElements = new Set();
        this.highlightOverlays = new Map();
        this.selectorOverlays = new Map();
        this.highlightOverlay = null;
        // TODO: investigate using alternative pathOf2 function when selector detection fails
        this.helper = new DomPredictionHelper();

        // Bind methods to preserve 'this' context
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

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

    toggle(pickerId?: string) {
        if (this.isActive) {
            this.deactivate();
        } else if (pickerId) {
            this.activate(pickerId);
        }
    }

    activate(pickerId: string) {
        console.log(`Activating DOM inspector for ${pickerId}`);
        if (this.isActive) return;

        this.activePickerId = pickerId;
        this.isActive = true;

        this.originalCursor = document.body.style.cursor;
        // Change cursor to indicate inspection mode
        document.body.style.cursor = 'crosshair';

        // Add event listeners
        window.addEventListener('mouseover', this.handleMouseOver, true);
        window.addEventListener('mouseout', this.handleMouseOut, true);
        window.addEventListener('keydown', this.handleKeyDown, true);
        window.addEventListener('click', this.handleClick, true);
        window.addEventListener('scroll', this.updateAllHighlights.bind(this), true);

        console.log(
            'DOM Inspector activated. Hover over elements to highlight, click to inspect. Press ESC to exit.',
        );
    }

    deactivate() {
        if (!this.isActive) return;

        console.log(`Deactivating DOM inspector for ${this.activePickerId}`);
        this.isActive = false;
        this.activePickerId = null;

        // Restore original cursor
        document.body.style.cursor = this.originalCursor == null ? 'pointer' : this.originalCursor;

        // Remove highlight from current element
        this.removeHighlight();

        // Remove all persistent highlights from whitelisted and blacklisted elements
        this.whitelistedElements.forEach((el) => this.removePersistentHighlight(el));
        this.blacklistedElements.forEach((el) => this.removePersistentHighlight(el));
        this.removeSelectorHighlight();

        // Clear the sets
        this.whitelistedElements.clear();
        this.blacklistedElements.clear();

        // Remove event listeners
        window.removeEventListener('mouseover', this.handleMouseOver, true);
        window.removeEventListener('mouseout', this.handleMouseOut, true);
        window.removeEventListener('keydown', this.handleKeyDown, true);
        window.removeEventListener('click', this.handleClick, true);
        window.removeEventListener('scroll', this.updateAllHighlights.bind(this), true);

        console.log('DOM Inspector deactivated.');
    }

    guessSelector() {
        const connectedWhitelisted = Array.from(this.whitelistedElements).filter(
            (el) => el && el.isConnected,
        );

        const connectedBlacklisted = Array.from(this.blacklistedElements).filter(
            (el) => el && el.isConnected,
        );

        const guess = this.helper.predictCss(connectedWhitelisted, connectedBlacklisted);
        if (guess) {
            return guess
        } else {
            return this.helper.predictCss(connectedWhitelisted, connectedBlacklisted, true);
        }
    }

    showSelectorHighlight(selector: string) {
        // FIXME: add max item count to avoid freezing browser
        this.selectorOverlays.forEach((overlay) => overlay.remove());
        this.selectorOverlays.clear();
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
            let overlay = this.selectorOverlays.get(element as HTMLElement);
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.style.position = 'absolute';
                overlay.style.zIndex = '999998'; // Just below hover highlight
                overlay.style.boxSizing = 'border-box';
                overlay.style.pointerEvents = 'none';
                document.body.appendChild(overlay);
                this.selectorOverlays.set(element as HTMLElement, overlay);
            }

            this.updateOverlayPosition(element as HTMLElement, overlay);

            overlay.style.border = '2px solid #ffd700'; // Yellow
            overlay.style.backgroundColor = 'rgb(255, 215, 0, 0.2)';
        });
        return elements.length;
    }
    removeSelectorHighlight() {
        this.selectorOverlays.forEach((overlay) => {
            overlay.remove();
        });
        this.selectorOverlays.clear();
    }

    updatePersistentHighlight(element: HTMLElement, type: 'whitelisted' | 'blacklisted') {
        let overlay = this.highlightOverlays.get(element);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.zIndex = '999998'; // Just below hover highlight
            overlay.style.boxSizing = 'border-box';
            overlay.style.pointerEvents = 'none';
            document.body.appendChild(overlay);
            this.highlightOverlays.set(element, overlay);
        }

        this.updateOverlayPosition(element, overlay);

        if (type === 'whitelisted') {
            overlay.style.border = '2px solid #22C55E'; // Green
            overlay.style.backgroundColor = 'rgba(34, 197, 94, 0.4)';
        } else {
            // blacklisted
            overlay.style.border = '2px solid #EF4444'; // Red
            overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.4)';
        }
    }

    /**
     * Removes a persistent highlight overlay from an element.
     */
    removePersistentHighlight(element: HTMLElement) {
        const overlay = this.highlightOverlays.get(element);
        if (overlay) {
            overlay.remove();
            this.highlightOverlays.delete(element);
        }
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

        const target = event.target as Node;
        // If the click target isn't an element (e.g., it's a text node), use its parent.
        const clickedElement = (
            target.nodeType === Node.ELEMENT_NODE ? target : target.parentNode
        ) as HTMLElement;

        if (!clickedElement) {
            return;
        }

        if (this.blacklistedElements.has(clickedElement)) {
            // Cycle: Blacklisted -> Unselected
            this.blacklistedElements.delete(clickedElement);
            this.removePersistentHighlight(clickedElement);
        } else if (
            this.whitelistedElements.has(clickedElement) ||
            this.selectorOverlays.has(clickedElement)
        ) {
            // Cycle: Whitelisted -> Blacklisted
            this.whitelistedElements.delete(clickedElement);
            this.blacklistedElements.add(clickedElement);
            this.updatePersistentHighlight(clickedElement, 'blacklisted');
        } else {
            // Cycle: Unselected -> Whitelisted
            this.whitelistedElements.add(clickedElement);
            this.updatePersistentHighlight(clickedElement, 'whitelisted');
        }
        this.inspectElement(clickedElement);
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

        const selector = this.guessSelector();
        let foundElements = 0;
        if (selector) {
            this.predictedSelector = selector;
            foundElements = this.showSelectorHighlight(selector);
        }
        browser.runtime.sendMessage({
            action: 'selector-elementSelected',
            selector: selector,
            foundElements,
            pickerId: this.activePickerId,
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

    updateAllHighlights() {
        this.updateHighlights(this.selectorOverlays);
        this.updateHighlights(this.highlightOverlays);
    }

    updateHighlights(overlays: Map<HTMLElement, HTMLDivElement>) {
        for (const [element, overlay] of overlays.entries()) {
            this.updateOverlayPosition(element, overlay);
        }
    }

    updateOverlayPosition(element: HTMLElement, overlay: HTMLDivElement) {
        if (!element.isConnected) {
            overlay.remove();
            this.selectorOverlays.delete(element);
            this.highlightOverlays.delete(element);
            return;
        }
        const rect = element.getBoundingClientRect();
        overlay.style.top = `${rect.top + window.scrollY}px`;
        overlay.style.left = `${rect.left + window.scrollX}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
    }
}

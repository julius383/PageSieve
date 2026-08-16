import { DomPredictionHelper } from '@/selectorgadget';
import { browserEngine } from './browserEngine';
import { isXPath } from '@pagesieve/core/extractor';

export class DOMInspector {
    /*^
     * Activation status of inspector
     */
    public isActive: boolean;
    isSelecting: boolean;

    whitelistedElements: Set<HTMLElement>;
    blacklistedElements: Set<HTMLElement>;

    currentHighlighted: HTMLElement | null;
    highlightOverlay: HTMLElement | null;

    originalCursor: string | null;

    /**
     * Interface to selector guessing algorithm
     */
    helper: DomPredictionHelper;

    /**
     * CSS Selector predicted by algorithm
     */
    predictedSelector: string | null;

    /**
     * ID used to communicate back to UI through browser message
     */
    activePickerId: string | null;

    /**
     * Container selector used to narrow context of selected elements
     */
    containerScope: string | undefined;

    // To manage highlight overlays for selected and highlighted elements
    highlightOverlays: Map<HTMLElement, HTMLDivElement>;
    selectorOverlays: Map<HTMLElement, HTMLDivElement>;

    // intersection observer for more efficient highlighting
    observer: IntersectionObserver | null;
    private observedMatchElements: Set<HTMLElement> = new Set();

    private handleScroll: () => void;

    constructor() {
        this.isActive = false;
        this.isSelecting = true;
        this.originalCursor = null;
        this.activePickerId = null;
        this.containerScope = undefined;

        this.currentHighlighted = null;
        this.predictedSelector = null;

        this.whitelistedElements = new Set();
        this.blacklistedElements = new Set();

        this.highlightOverlays = new Map();
        this.selectorOverlays = new Map();
        this.highlightOverlay = null;

        this.helper = new DomPredictionHelper();

        // Bind methods to preserve 'this' context
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleIntersection = this.handleIntersection.bind(this);
        this.handleScroll = this.updateAllHighlights.bind(this);

        this.observer = null;

        if (typeof document !== 'undefined') {
            this.setupOverlay();
            this.setupObserver();
        }
    }

    private setupOverlay() {
        if (this.highlightOverlay === null) {
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
    }

    private setupObserver() {
        if (this.observer === null) {
            this.observer = new IntersectionObserver(this.handleIntersection, {
                root: null,
                rootMargin: '0px',
                threshold: 0,
            });
        }
    }

    activate(pickerId: string, container?: string, selecting: boolean = true) {
        // console.log(`Activating DOM inspector for ${pickerId}`);
        if (this.isActive || !pickerId) return;

        this.containerScope = container;
        this.activePickerId = pickerId;
        this.isActive = true;
        this.isSelecting = selecting;

        
        this.setupObserver();
        window.addEventListener('scroll', this.handleScroll, true);

        if (this.isSelecting) {
            this.setupOverlay();
            this.originalCursor = document.body.style.cursor;
            document.body.style.cursor = 'crosshair';

            window.addEventListener('mouseover', this.handleMouseOver, true);
            window.addEventListener('mouseout', this.handleMouseOut, true);
            window.addEventListener('keydown', this.handleKeyDown, true);
            window.addEventListener('click', this.handleClick, true);
        }
    }

    deactivate() {
        if (!this.isActive) return;

        console.log(`Deactivating DOM inspector for ${this.activePickerId}`);
        this.isActive = false;
        this.activePickerId = null;

        window.removeEventListener('scroll', this.handleScroll, true);

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.isSelecting) {
            document.body.style.cursor = this.originalCursor == null ? 'pointer' : this.originalCursor;

            this.removeHighlight();

            this.whitelistedElements.forEach((el) => this.removePersistentHighlight(el));
            this.blacklistedElements.forEach((el) => this.removePersistentHighlight(el));

            this.whitelistedElements.clear();
            this.blacklistedElements.clear();

            window.removeEventListener('mouseover', this.handleMouseOver, true);
            window.removeEventListener('mouseout', this.handleMouseOut, true);
            window.removeEventListener('keydown', this.handleKeyDown, true);
            window.removeEventListener('click', this.handleClick, true);

        }
        this.removeSelectorHighlight();
        if (this.highlightOverlay) {
            this.highlightOverlay.remove();
            this.highlightOverlay = null;
        }
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
            return guess;
        } else {
            return this.helper.predictCss(connectedWhitelisted, connectedBlacklisted, true);
        }
    }

    handleIntersection(entries: IntersectionObserverEntry[]) {
        for (const entry of entries) {
            const el = entry.target as HTMLElement;
            if (entry.isIntersecting) {
                this.renderSelectorOverlay(el);
            } else {
                this.clearSelectorOverlay(el);
            }
        }
    }
    private renderSelectorOverlay(element: HTMLElement) {
        if (this.whitelistedElements.has(element)) {
            this.paintOverlay(element, this.highlightOverlays, '#22C55E', 'rgba(34, 197, 94, 0.4)');
        } else if (this.blacklistedElements.has(element)) {
            this.paintOverlay(element, this.highlightOverlays, '#EF4444', 'rgba(239, 68, 68, 0.4)');
        } else {
            this.paintOverlay(element, this.selectorOverlays, '#ffd700', 'rgba(255, 223, 51, 0.2)');
        }
    }

    private paintOverlay(
        element: HTMLElement,
        map: Map<HTMLElement, HTMLDivElement>,
        border: string,
        background: string,
    ) {
        let overlay = map.get(element);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.zIndex = '999998';
            overlay.style.boxSizing = 'border-box';
            overlay.style.pointerEvents = 'none';
            document.body.appendChild(overlay);
            map.set(element, overlay);
        }
        this.updateOverlayPosition(element, overlay);
        overlay.style.border = `2px solid ${border}`;
        overlay.style.backgroundColor = background;
    }

    private clearSelectorOverlay(element: HTMLElement) {
        const hOverlay = this.highlightOverlays.get(element);
        if (hOverlay) {
            hOverlay.remove();
            this.highlightOverlays.delete(element);
        }
        const sOverlay = this.selectorOverlays.get(element);
        if (sOverlay) {
            sOverlay.remove();
            this.selectorOverlays.delete(element);
        }
    }

    showSelectorHighlight(selector: string) {
        this.selectorOverlays.forEach((overlay) => overlay.remove());
        this.selectorOverlays.clear();

        this.observedMatchElements.forEach((el) => {
            if (!this.whitelistedElements.has(el) && !this.blacklistedElements.has(el)) {
                this.observer?.unobserve(el);
            }
        });
        this.observedMatchElements.clear();

        let elements = browserEngine.querySelectorAll(document.body, selector);

        // narrow highlighted elements by container if possible
        const scope = this.containerScope;
        if (scope !== undefined && scope !== '' && !isXPath(scope)) {
            // closest only supports CSS selectors
            elements = elements.filter((elem) => elem.closest(scope) !== null);
        }
        elements.forEach((element) => {
            const el = element as HTMLElement;
            this.observedMatchElements.add(el);
            this.observer?.observe(el);
        });
        return elements.length;
    }

    removeSelectorHighlight() {
        this.selectorOverlays.forEach((overlay) => overlay.remove());
        this.selectorOverlays.clear();
        this.observedMatchElements.forEach((el) => {
            if (!this.whitelistedElements.has(el) && !this.blacklistedElements.has(el)) {
                this.observer?.unobserve(el);
            }
        });
        this.observedMatchElements.clear();
    }

    updatePersistentHighlight(element: HTMLElement) {
        this.renderSelectorOverlay(element);
        this.observer?.observe(element);
    }

    removePersistentHighlight(element: HTMLElement) {
        this.clearSelectorOverlay(element);
        if (!this.observedMatchElements.has(element)) {
            this.observer?.unobserve(element);
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
            this.updatePersistentHighlight(clickedElement);
        } else {
            // Cycle: Unselected -> Whitelisted
            this.whitelistedElements.add(clickedElement);
            this.updatePersistentHighlight(clickedElement);
        }
        // this.inspectElement(clickedElement);
        this.inspectElement();
    }

    handleKeyDown(event: KeyboardEvent) {
        if (!this.isActive) return;

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

    // inspectElement(_element: HTMLElement) {
    inspectElement() {
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

    updateAllHighlights() {
        [this.selectorOverlays, this.highlightOverlays].forEach((overlays) => {
            for (const [element, overlay] of overlays.entries()) {
                this.updateOverlayPosition(element, overlay);
            }
        });
    }

    private updateOverlayPosition(element: HTMLElement, overlay: HTMLDivElement) {
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

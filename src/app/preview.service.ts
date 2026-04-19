import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import morphdom from 'morphdom';
import DOMPurify from 'dompurify';
import { MarkedPipe } from './marked.pipe';

@Injectable({
    providedIn: 'root'
})
export class PreviewService implements OnDestroy {
    private readonly sanitizer = inject(DomSanitizer);

    private worker?: Worker;
    private lastMessageId = 0;

    /** Lazily-loaded mermaid instance (loaded only when diagrams are encountered). */
    private mermaidInstance?: typeof import('mermaid').default;
    private isDark = false;

    public readonly previewHtml = signal<SafeHtml>('');

    constructor() {
        this.initWorker();
    }

    private initWorker(): void {
        if (typeof Worker === 'undefined') {
            console.warn('Web Workers are not supported in this environment.');
            return;
        }

        this.worker = new Worker(new URL('./markdown.worker', import.meta.url));

        this.worker.onmessage = ({ data }) => {
            const parsed = this.parseWorkerMessage(data);
            if (!parsed) return;

            const { html, id, error } = parsed;

            if (error) {
                console.error('PreviewService: Worker reported error:', error);
            }

            if (id === this.lastMessageId) {
                this.applyUpdate(html);
            }
        };

        this.worker.onerror = (err) => {
            if (err.message?.includes('has no grammar')) {
                err.preventDefault();
                return;
            }
            console.error('PreviewService: Worker error:', err.message);
        };
    }

    private parseWorkerMessage(data: unknown): { html: string; id: number; error?: string } | null {
        let parsed = data;
        if (typeof data === 'string') {
            try {
                parsed = JSON.parse(data);
            } catch {
                return null;
            }
        }

        if (!parsed || typeof parsed !== 'object') {
            console.warn('PreviewService: Invalid worker data:', parsed);
            return null;
        }

        return parsed as { html: string; id: number; error?: string };
    }

    public render(content: string): void {
        if (this.worker) {
            this.lastMessageId++;
            this.worker.postMessage(JSON.stringify({ content, id: this.lastMessageId }));
        } else {
            const markedPipe = new MarkedPipe(this.sanitizer);
            markedPipe.transform(content).then(html => {
                this.previewHtml.set(html);
            });
        }
    }

    private previewContainer?: HTMLElement;

    public setContainer(container: HTMLElement): void {
        this.previewContainer = container;
    }

    private applyUpdate(html: string): void {
        const cleanHtml = DOMPurify.sanitize(html);
        const container = this.previewContainer;

        if (container) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = cleanHtml;

            morphdom(container, wrapper, {
                childrenOnly: true,
                onBeforeElUpdated: (fromEl, toEl) => {
                    // Preserve already-rendered mermaid blocks when the source hasn't changed.
                    // After mermaid renders, the div's innerHTML is an SVG but we store the
                    // original source in data-mermaid-source so we can compare on re-renders.
                    if (
                        fromEl.classList.contains('mermaid-source') &&
                        (fromEl as HTMLElement).dataset['mermaidSource'] !== undefined &&
                        (fromEl as HTMLElement).dataset['mermaidSource'] === toEl.textContent?.trim()
                    ) {
                        return false;
                    }
                    if (fromEl.isEqualNode(toEl)) return false;
                    return true;
                }
            });

            // Render any mermaid blocks that haven't been processed yet (fire-and-forget).
            this.renderMermaidBlocks(container);
        } else {
            this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(cleanHtml));
        }
    }

    // ─── Mermaid ───────────────────────────────────────────────────────────────

    private async getMermaid(): Promise<typeof import('mermaid').default> {
        if (!this.mermaidInstance) {
            const mod = await import('mermaid');
            this.mermaidInstance = mod.default;
            this.mermaidInstance.initialize({
                startOnLoad: false,
                theme: this.isDark ? 'dark' : 'default',
            });
        }
        return this.mermaidInstance;
    }

    private async renderMermaidBlocks(container: HTMLElement): Promise<void> {
        const blocks = Array.from(
            container.querySelectorAll<HTMLElement>('.mermaid-source:not([data-mermaid-source])')
        );
        if (blocks.length === 0) return;

        const mermaid = await this.getMermaid();

        for (const block of blocks) {
            const source = block.textContent?.trim() ?? '';
            try {
                await mermaid.run({ nodes: [block], suppressErrors: true });
                // Store the original source so we can skip re-rendering when unchanged.
                block.dataset['mermaidSource'] = source;
            } catch (err) {
                console.warn('Mermaid rendering error:', err);
                block.textContent = `⚠ Could not render diagram`;
            }
        }
    }

    /**
     * Updates the mermaid theme and re-renders any existing diagrams in the preview.
     * Called by AppComponent when the user toggles light/dark mode.
     */
    public async updateMermaidTheme(isDark: boolean): Promise<void> {
        this.isDark = isDark;
        if (!this.mermaidInstance || !this.previewContainer) return;

        this.mermaidInstance.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
        });

        // Reset rendered state so all blocks get re-rendered with the new theme.
        const rendered = Array.from(
            this.previewContainer.querySelectorAll<HTMLElement>('.mermaid-source[data-mermaid-source]')
        );
        for (const block of rendered) {
            const source = block.dataset['mermaidSource']!;
            block.textContent = source;
            delete block.dataset['mermaidSource'];
        }

        await this.renderMermaidBlocks(this.previewContainer);
    }

    public ngOnDestroy(): void {
        this.worker?.terminate();
    }
}

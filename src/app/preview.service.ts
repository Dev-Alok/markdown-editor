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
                    if (fromEl.isEqualNode(toEl)) return false;
                    return true;
                }
            });
        } else {
            this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(cleanHtml));
        }
    }

    public ngOnDestroy(): void {
        this.worker?.terminate();
    }
}

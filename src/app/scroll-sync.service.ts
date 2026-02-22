import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ScrollSyncService {
    private isScrolling = false;

    public syncFromEditor(editorScrollDOM: HTMLElement, previewElement: HTMLElement): void {
        if (this.isScrolling) return;

        const editorRange = editorScrollDOM.scrollHeight - editorScrollDOM.clientHeight;
        if (editorRange <= 0) return;

        this.isScrolling = true;
        const scrollPercentage = editorScrollDOM.scrollTop / editorRange;
        const previewRange = previewElement.scrollHeight - previewElement.clientHeight;

        previewElement.scrollTop = scrollPercentage * previewRange;
        requestAnimationFrame(() => this.isScrolling = false);
    }

    public syncFromPreview(previewElement: HTMLElement, editorScrollDOM: HTMLElement): void {
        if (this.isScrolling) return;

        const previewRange = previewElement.scrollHeight - previewElement.clientHeight;
        if (previewRange <= 0) return;

        this.isScrolling = true;
        const scrollPercentage = previewElement.scrollTop / previewRange;
        const editorRange = editorScrollDOM.scrollHeight - editorScrollDOM.clientHeight;

        editorScrollDOM.scrollTop = scrollPercentage * editorRange;
        requestAnimationFrame(() => this.isScrolling = false);
    }
}

import { Injectable } from '@angular/core';

import { EditorState, EditorSelection, SelectionRange, Compartment } from '@codemirror/state';
import {
    EditorView, keymap, drawSelection, highlightActiveLine, dropCursor,
    rectangularSelection, lineNumbers, highlightSpecialChars
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

export type FormatType =
    | 'bold' | 'italic' | 'strikethrough' | 'code' | 'code-block'
    | 'h1' | 'h2' | 'h3' | 'quote' | 'ul' | 'ol' | 'hr'
    | 'link' | 'image' | 'table';

export interface EditorCallbacks {
    onContentChange: (content: string) => void;
    onScroll: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class EditorService {
    private editorView?: EditorView;
    private readonly themeCompartment = new Compartment();

    public get scrollDOM(): HTMLElement | undefined {
        return this.editorView?.scrollDOM;
    }

    public init(container: HTMLElement, content: string, isDark: boolean, callbacks: EditorCallbacks): void {
        const startState = EditorState.create({
            doc: content,
            extensions: [
                lineNumbers(),
                highlightSpecialChars(),
                history(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                rectangularSelection(),
                highlightActiveLine(),
                keymap.of([
                    ...defaultKeymap,
                    ...historyKeymap,
                ]),
                markdown({ codeLanguages: languages }),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                this.themeCompartment.of(isDark ? oneDark : []),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        callbacks.onContentChange(update.state.doc.toString());
                    }
                    if (update.transactions.some(tr => tr.scrollIntoView)) {
                        callbacks.onScroll();
                    }
                }),
                EditorView.domEventHandlers({
                    scroll: () => callbacks.onScroll()
                }),
                EditorView.theme({
                    "&": { height: "100%" },
                    ".cm-scroller": { overflow: "auto" }
                })
            ]
        });

        this.editorView = new EditorView({
            state: startState,
            parent: container
        });
    }

    public updateContent(content: string): void {
        if (this.editorView && content !== this.editorView.state.doc.toString()) {
            this.editorView.dispatch({
                changes: { from: 0, to: this.editorView.state.doc.length, insert: content }
            });
        }
    }

    public updateTheme(isDark: boolean): void {
        if (this.editorView) {
            this.editorView.dispatch({
                effects: this.themeCompartment.reconfigure(isDark ? oneDark : [])
            });
        }
    }

    public destroy(): void {
        this.editorView?.destroy();
        this.editorView = undefined;
    }

    // ─── Formatting ────────────────────────────────────────────────────────────

    public applyFormat(type: FormatType): void {
        if (!this.editorView) return;
        const view = this.editorView;
        view.focus();
        const sel = view.state.selection.main;

        switch (type) {
            case 'bold':          this.wrapInline(view, sel, '**', '**'); break;
            case 'italic':        this.wrapInline(view, sel, '_', '_'); break;
            case 'strikethrough': this.wrapInline(view, sel, '~~', '~~'); break;
            case 'code':          this.wrapInline(view, sel, '`', '`'); break;
            case 'code-block':    this.insertCodeBlock(view, sel); break;
            case 'h1':            this.toggleLinePrefix(view, sel, '# '); break;
            case 'h2':            this.toggleLinePrefix(view, sel, '## '); break;
            case 'h3':            this.toggleLinePrefix(view, sel, '### '); break;
            case 'quote':         this.toggleLinePrefix(view, sel, '> '); break;
            case 'ul':            this.toggleLinePrefix(view, sel, '- '); break;
            case 'ol':            this.toggleLinePrefix(view, sel, '1. '); break;
            case 'hr':            this.insertHr(view, sel); break;
            case 'link':          this.insertLink(view, sel); break;
            case 'image':         this.insertImage(view, sel); break;
            case 'table':         this.insertTable(view, sel); break;
        }
    }

    /** Wraps the selection (or inserts delimiters with cursor placed between them). */
    private wrapInline(view: EditorView, sel: SelectionRange, before: string, after: string): void {
        const doc = view.state.doc;
        if (sel.empty) {
            view.dispatch({
                changes: { from: sel.from, to: sel.to, insert: `${before}${after}` },
                selection: EditorSelection.cursor(sel.from + before.length),
            });
        } else {
            const text = doc.sliceString(sel.from, sel.to);
            view.dispatch({
                changes: { from: sel.from, to: sel.to, insert: `${before}${text}${after}` },
                selection: EditorSelection.range(sel.from + before.length, sel.from + before.length + text.length),
            });
        }
    }

    /**
     * Adds or removes a line-level prefix on every selected line.
     * Toggles: if all selected lines already start with the prefix it removes it,
     * otherwise it adds it (stripping any conflicting heading/list prefix first).
     */
    private toggleLinePrefix(view: EditorView, sel: SelectionRange, prefix: string): void {
        const doc = view.state.doc;
        const fromLine = doc.lineAt(sel.from);
        const toLine = doc.lineAt(sel.to === sel.from ? sel.from : Math.max(sel.from, sel.to - 1));

        const lines = [];
        for (let n = fromLine.number; n <= toLine.number; n++) {
            lines.push(doc.line(n));
        }

        const allHavePrefix = lines.every(l => l.text.startsWith(prefix));

        const changes = lines.map(line => {
            if (allHavePrefix) {
                return { from: line.from, to: line.from + prefix.length, insert: '' };
            }
            // Remove any conflicting block prefix before adding the new one
            const existing = line.text.match(/^(#{1,6} |> |- |\d+\. )/);
            const removeLen = existing ? existing[0].length : 0;
            return { from: line.from, to: line.from + removeLen, insert: prefix };
        });

        view.dispatch({ changes });
    }

    private insertCodeBlock(view: EditorView, sel: SelectionRange): void {
        const doc = view.state.doc;
        if (sel.empty) {
            const insert = '```\n\n```';
            view.dispatch({
                changes: { from: sel.from, to: sel.to, insert },
                selection: EditorSelection.cursor(sel.from + 4),
            });
        } else {
            const text = doc.sliceString(sel.from, sel.to);
            const insert = `\`\`\`\n${text}\n\`\`\``;
            view.dispatch({
                changes: { from: sel.from, to: sel.to, insert },
                selection: EditorSelection.range(sel.from + 4, sel.from + 4 + text.length),
            });
        }
    }

    private insertHr(view: EditorView, sel: SelectionRange): void {
        const doc = view.state.doc;
        const line = doc.lineAt(sel.from);
        const prefix = line.text.trim().length > 0 ? '\n' : '';
        const insert = `${prefix}---\n`;
        view.dispatch({
            changes: { from: line.to, to: line.to, insert },
            selection: EditorSelection.cursor(line.to + insert.length),
        });
    }

    private insertLink(view: EditorView, sel: SelectionRange): void {
        const doc = view.state.doc;
        const linkText = sel.empty ? 'link text' : doc.sliceString(sel.from, sel.to);
        const insert = `[${linkText}](url)`;
        const urlStart = sel.from + 1 + linkText.length + 2;
        view.dispatch({
            changes: { from: sel.from, to: sel.to, insert },
            selection: EditorSelection.range(urlStart, urlStart + 3),
        });
    }

    private insertImage(view: EditorView, sel: SelectionRange): void {
        const doc = view.state.doc;
        const altText = sel.empty ? 'alt text' : doc.sliceString(sel.from, sel.to);
        const insert = `![${altText}](url)`;
        const urlStart = sel.from + 2 + altText.length + 2;
        view.dispatch({
            changes: { from: sel.from, to: sel.to, insert },
            selection: EditorSelection.range(urlStart, urlStart + 3),
        });
    }

    private insertTable(view: EditorView, sel: SelectionRange): void {
        const table = `| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n`;
        view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: table },
            selection: EditorSelection.cursor(sel.from + table.length),
        });
    }
}

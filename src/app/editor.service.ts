import { Injectable } from '@angular/core';

import { EditorState } from '@codemirror/state';
import {
    EditorView, keymap, drawSelection, highlightActiveLine, dropCursor,
    rectangularSelection, lineNumbers, highlightSpecialChars
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { Compartment } from '@codemirror/state';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

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
}

import { Component, viewChild, signal, ElementRef, inject, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from './theme.service';
import { FileService } from './file.service';
import { MarkedPipe } from './marked.pipe';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, MarkedPipe, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'Markdown Editor';

  private themeService = inject(ThemeService);
  fileService = inject(FileService);

  isDarkMode = signal(this.themeService.isDarkMode());
  isEditingFileName = signal(false);
  expandedView = signal<'editor' | 'preview' | null>(null);

  fileNameInput = viewChild<ElementRef<HTMLInputElement>>('fileNameInput');
  editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');

  private editorView?: EditorView;
  private themeCompartment = new Compartment();

  constructor() {
    effect(() => {
      const content = this.fileService.content;
      if (this.editorView && content !== this.editorView.state.doc.toString()) {
        this.editorView.dispatch({
          changes: { from: 0, to: this.editorView.state.doc.length, insert: content }
        });
      }
    });

    effect(() => {
      const isDark = this.isDarkMode();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: this.themeCompartment.reconfigure(isDark ? oneDark : [])
        });
      }
    });
  }

  ngAfterViewInit() {
    const container = this.editorContainer()?.nativeElement;
    if (!container) return;

    const startState = EditorState.create({
      doc: this.fileService.content,
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
        this.themeCompartment.of(this.isDarkMode() ? oneDark : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.fileService.content = update.state.doc.toString();
          }
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

  ngOnDestroy() {
    this.editorView?.destroy();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.isDarkMode.set(this.themeService.isDarkMode());
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileService.loadFile(file);
    }
  }

  handlePaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text/plain');
    if (text) {
      this.fileService.loadText(text);
    }
  }

  downloadMarkdown() {
    this.fileService.downloadMarkdown();
  }

  downloadPDF() {
    this.fileService.downloadPDF();
  }

  startEditingFileName() {
    this.isEditingFileName.set(true);
    setTimeout(() => {
      const el = this.fileNameInput()?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  saveFileName(event: Event) {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (newName) {
      const name = newName.endsWith('.md') ? newName : newName + '.md';
      this.fileService.setFileName(name);
    }
    this.isEditingFileName.set(false);
  }

  cancelEditingFileName() {
    this.isEditingFileName.set(false);
  }

  toggleExpand(view: 'editor' | 'preview') {
    if (this.expandedView() === view) {
      this.expandedView.set(null);
    } else {
      this.expandedView.set(view);
    }
  }
}
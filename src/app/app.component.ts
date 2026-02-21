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

import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, MarkedPipe, CommonModule, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  protected title = 'Markdown Editor';

  private readonly themeService = inject(ThemeService);
  protected readonly fileService = inject(FileService);

  protected isDarkMode = signal(this.themeService.isDarkMode());
  protected isEditingFileName = signal(false);
  protected expandedView = signal<'editor' | 'preview' | null>(null);

  // Dialog state
  protected dialogVisible = signal(false);
  protected dialogTitle = signal('');
  protected dialogMessage = signal('');
  protected dialogType = signal<'info' | 'warning' | 'danger'>('info');
  protected dialogConfirmText = signal('Confirm');
  private dialogOnConfirm: () => void = () => { };

  protected fileNameInput = viewChild<ElementRef<HTMLInputElement>>('fileNameInput');
  protected editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');

  private editorView?: EditorView;
  private readonly themeCompartment = new Compartment();

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

  public ngAfterViewInit(): void {
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

  public ngOnDestroy(): void {
    this.editorView?.destroy();
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
    this.isDarkMode.set(this.themeService.isDarkMode());
  }

  protected handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileService.loadFile(file);
    }
  }

  public handlePaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text/plain');
    if (text) {
      this.fileService.loadText(text);
    }
  }

  protected downloadMarkdown(): void {
    this.fileService.downloadMarkdown();
  }

  protected downloadPDF(): void {
    this.fileService.downloadPDF();
  }

  protected startEditingFileName(): void {
    this.isEditingFileName.set(true);
    setTimeout(() => {
      const el = this.fileNameInput()?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  protected saveFileName(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    if (newName) {
      const name = newName.endsWith('.md') ? newName : newName + '.md';
      this.fileService.setFileName(name);
    }
    this.isEditingFileName.set(false);
  }

  protected cancelEditingFileName(): void {
    this.isEditingFileName.set(false);
  }

  protected toggleExpand(view: 'editor' | 'preview'): void {
    if (this.expandedView() === view) {
      this.expandedView.set(null);
    } else {
      this.expandedView.set(view);
    }
  }

  protected clearEditor(): void {
    this.openDialog({
      title: 'Clear Editor',
      message: 'Are you sure you want to clear the editor? This will erase your unsaved work.',
      type: 'danger',
      confirmText: 'Clear Everything',
      onConfirm: () => {
        this.fileService.clearStorage();
      }
    });
  }

  private openDialog(options: {
    title: string,
    message: string,
    type?: 'info' | 'warning' | 'danger',
    confirmText?: string,
    onConfirm: () => void
  }): void {
    this.dialogTitle.set(options.title);
    this.dialogMessage.set(options.message);
    this.dialogType.set(options.type || 'info');
    this.dialogConfirmText.set(options.confirmText || 'Confirm');
    this.dialogOnConfirm = options.onConfirm;
    this.dialogVisible.set(true);
  }

  protected handleDialogConfirm(): void {
    this.dialogOnConfirm();
    this.dialogVisible.set(false);
  }

  protected handleDialogCancel(): void {
    this.dialogVisible.set(false);
  }
}
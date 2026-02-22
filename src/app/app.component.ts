import { Component, viewChild, signal, ElementRef, inject, AfterViewInit, OnDestroy, effect, DestroyRef, afterNextRender } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ThemeService } from './theme.service';
import { FileService } from './file.service';
import { DialogService } from './dialog.service';
import { PreviewService } from './preview.service';
import { EditorService } from './editor.service';
import { ScrollSyncService } from './scroll-sync.service';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  protected title = 'Markdown Editor';

  private readonly themeService = inject(ThemeService);
  protected readonly fileService = inject(FileService);
  protected readonly dialogService = inject(DialogService);
  private readonly previewService = inject(PreviewService);
  private readonly editorService = inject(EditorService);
  private readonly scrollSyncService = inject(ScrollSyncService);
  private readonly destroyRef = inject(DestroyRef);

  protected isDarkMode = signal(this.themeService.isDarkMode());
  protected isEditingFileName = signal(false);
  protected expandedView = signal<'editor' | 'preview' | null>(null);

  protected fileNameInput = viewChild<ElementRef<HTMLInputElement>>('fileNameInput');
  protected editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');
  protected previewContainer = viewChild<ElementRef<HTMLDivElement>>('previewContainer');

  constructor() {
    effect(() => {
      const content = this.fileService.content();
      this.editorService.updateContent(content);
    });

    effect(() => {
      const isDark = this.isDarkMode();
      this.editorService.updateTheme(isDark);
    });

    toObservable(this.fileService.content)
      .pipe(
        debounceTime(16),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(content => {
        this.previewService.render(content);
      });
  }

  public ngAfterViewInit(): void {
    const container = this.editorContainer()?.nativeElement;
    if (!container) return;

    const previewEl = this.previewContainer()?.nativeElement;
    if (previewEl) {
      this.previewService.setContainer(previewEl);
    }

    this.editorService.init(container, this.fileService.content(), this.isDarkMode(), {
      onContentChange: (content) => this.fileService.content.set(content),
      onScroll: () => this.syncScrollFromEditor()
    });
  }

  private syncScrollFromEditor(): void {
    if (this.expandedView() === 'editor') return;

    const editorScrollDOM = this.editorService.scrollDOM;
    const previewEl = this.previewContainer()?.nativeElement;

    if (editorScrollDOM && previewEl) {
      this.scrollSyncService.syncFromEditor(editorScrollDOM, previewEl);
    }
  }

  protected syncScrollFromPreview(event: Event): void {
    if (this.expandedView() === 'preview') return;

    const previewEl = event.target as HTMLElement;
    const editorScrollDOM = this.editorService.scrollDOM;

    if (previewEl && editorScrollDOM) {
      this.scrollSyncService.syncFromPreview(previewEl, editorScrollDOM);
    }
  }

  public ngOnDestroy(): void {
    this.editorService.destroy();
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
    this.isDarkMode.set(this.themeService.isDarkMode());
  }

  protected handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileService.loadFile(input.files[0]);
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
    afterNextRender(() => {
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
      this.fileService.fileName.set(name);
    }
    this.isEditingFileName.set(false);
  }

  protected cancelEditingFileName(): void {
    this.isEditingFileName.set(false);
  }

  protected toggleExpand(view: 'editor' | 'preview'): void {
    this.expandedView.set(this.expandedView() === view ? null : view);
  }

  protected clearEditor(): void {
    this.dialogService.open({
      title: 'Clear Editor',
      message: 'Are you sure you want to clear the editor? This will erase your unsaved work.',
      type: 'danger',
      confirmText: 'Clear Everything',
      onConfirm: () => this.fileService.clearStorage()
    });
  }
}
import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly STORAGE_KEY_CONTENT = 'md-editor-content';
  private readonly STORAGE_KEY_FILENAME = 'md-editor-filename';
  private readonly destroyRef = inject(DestroyRef);

  public readonly fileName = signal(localStorage.getItem(this.STORAGE_KEY_FILENAME) || 'untitled.md');
  public readonly content = signal(localStorage.getItem(this.STORAGE_KEY_CONTENT) || '');

  constructor() {
    toObservable(this.content)
      .pipe(
        debounceTime(500),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(content => {
        localStorage.setItem(this.STORAGE_KEY_CONTENT, content);
      });

    toObservable(this.fileName)
      .pipe(
        debounceTime(500),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(name => {
        localStorage.setItem(this.STORAGE_KEY_FILENAME, name);
      });
  }

  public clearStorage(): void {
    this.content.set('');
    this.fileName.set('untitled.md');
    localStorage.removeItem(this.STORAGE_KEY_CONTENT);
    localStorage.removeItem(this.STORAGE_KEY_FILENAME);
  }

  public loadFile(file: File): void {
    if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        this.content.set(text);
        this.fileName.set(file.name);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid markdown file (.md)');
    }
  }

  public loadText(text: string): void {
    this.content.set(text);
    this.fileName.set('pasted-content.md');
  }

  public downloadMarkdown(): void {
    const blob = new Blob([this.content()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public downloadPDF(): void {
    window.print();
  }
}
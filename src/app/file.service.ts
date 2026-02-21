import { Injectable, signal, effect } from '@angular/core';
import { marked } from 'marked';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly STORAGE_KEY_CONTENT = 'md-editor-content';
  private readonly STORAGE_KEY_FILENAME = 'md-editor-filename';

  private _fileName = signal(localStorage.getItem(this.STORAGE_KEY_FILENAME) || 'untitled.md');
  private _content = signal(localStorage.getItem(this.STORAGE_KEY_CONTENT) || '');

  constructor() {
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY_CONTENT, this._content());
    });

    effect(() => {
      localStorage.setItem(this.STORAGE_KEY_FILENAME, this._fileName());
    });
  }

  public get content(): string {
    return this._content();
  }

  public set content(value: string) {
    this._content.set(value);
  }

  public getFileName(): string {
    return this._fileName();
  }

  public setFileName(fileName: string): void {
    this._fileName.set(fileName);
  }

  public clearStorage(): void {
    this._content.set('');
    this._fileName.set('untitled.md');
    localStorage.removeItem(this.STORAGE_KEY_CONTENT);
    localStorage.removeItem(this.STORAGE_KEY_FILENAME);
  }

  public loadFile(file: File): void {
    if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        this.content = text;
        this.setFileName(file.name);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid markdown file (.md)');
    }
  }

  public loadText(text: string): void {
    this.content = text;
    this.setFileName('pasted-content.md');
  }

  public downloadMarkdown(): void {
    const blob = new Blob([this.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.getFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public downloadPDF(): void {
    window.print();
  }
}
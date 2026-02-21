import { Injectable, signal } from '@angular/core';
import { marked } from 'marked';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  fileName = 'untitled.md';
  private _content = signal('');

  get content(): string {
    return this._content();
  }

  set content(value: string) {
    this._content.set(value);
  }

  getFileName(): string {
    return this.fileName;
  }

  setFileName(fileName: string) {
    this.fileName = fileName;
  }

  loadFile(file: File) {
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

  loadText(text: string) {
    this.content = text;
    this.setFileName('pasted-content.md');
  }

  downloadMarkdown() {
    const blob = new Blob([this.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadPDF() {
    window.print();
  }
}
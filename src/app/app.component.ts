import { Component, viewChild, signal, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from './theme.service';
import { FileService } from './file.service';
import { MarkedPipe } from './marked.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, MarkedPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Markdown Editor';

  private themeService = inject(ThemeService);
  fileService = inject(FileService);

  isDarkMode = signal(this.themeService.isDarkMode());
  isEditingFileName = signal(false);
  expandedView = signal<'editor' | 'preview' | null>(null);

  fileNameInput = viewChild<ElementRef<HTMLInputElement>>('fileNameInput');

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
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import * as Prism from 'prismjs';

import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';

@Pipe({
  name: 'marked',
  standalone: true
})
export class MarkedPipe implements PipeTransform {
  private markedInstance: Marked;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.markedInstance = new Marked(
      markedHighlight({
        highlight(code, lang) {
          try {
            const language = (lang && Prism.languages[lang]) ? lang : null;
            if (language) {
              return Prism.highlight(code, Prism.languages[language], language);
            }
            return code;
          } catch {
            return code;
          }
        }
      })
    );
  }

  async transform(value: string): Promise<SafeHtml> {
    if (!value) return '';
    const rawHtml = await this.markedInstance.parse(value);
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return this.sanitizer.bypassSecurityTrustHtml(cleanHtml);
  }
}

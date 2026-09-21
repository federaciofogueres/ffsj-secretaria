import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

// 0.30.0#ESMERALDA: convierte Markdown a HTML. No marca el resultado como
// "seguro" (SafeHtml) a proposito: el HTML devuelto se enlaza siempre via
// [innerHTML] con un string plano, para que el sanitizador HTML de Angular
// siga aplicandose automaticamente antes de insertarlo en el DOM.
@Pipe({ name: 'markdown', standalone: true, pure: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const text = String(value || '').trim();
    if (!text) return '';
    return marked.parse(text, { async: false }) as string;
  }
}

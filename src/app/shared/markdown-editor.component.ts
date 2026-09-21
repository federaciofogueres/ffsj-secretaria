import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MarkdownPipe } from './markdown.pipe';

type MarkdownEditorMode = 'editar' | 'vista-previa';

// 0.30.0#ESMERALDA: editor Markdown grande y reutilizable (ControlValueAccessor,
// funciona con formControlName igual que un input nativo). No existia ningun
// editor Markdown en el proyecto, de ahi que se cree este en lugar de asumir
// que hay uno que reutilizar.
@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MarkdownEditorComponent), multi: true }],
  template: `
    <div class="markdown-editor">
      <div class="markdown-editor-head">
        <label class="form-label mb-1" *ngIf="label">{{ label }}</label>
        <div class="markdown-editor-tabs" role="tablist">
          <button type="button" class="markdown-editor-tab" [class.active]="mode === 'editar'" (click)="setMode('editar')">Editar</button>
          <button type="button" class="markdown-editor-tab" [class.active]="mode === 'vista-previa'" (click)="setMode('vista-previa')">Vista previa</button>
        </div>
      </div>
      <textarea
        *ngIf="mode === 'editar'"
        class="form-control markdown-editor-textarea"
        [attr.rows]="rows"
        [placeholder]="placeholder"
        [value]="value"
        [disabled]="disabled"
        (input)="onInput($any($event.target).value)"
        (blur)="onTouched()"
      ></textarea>
      <div *ngIf="mode === 'vista-previa'" class="markdown-editor-preview">
        <div *ngIf="value; else sinContenido" class="markdown-body" [innerHTML]="value | markdown"></div>
        <ng-template #sinContenido><p class="text-muted mb-0">Sin contenido para previsualizar.</p></ng-template>
      </div>
      <p class="markdown-editor-hint text-muted small mb-0 mt-1">
        Admite Markdown: **negrita**, _cursiva_, listas, enlaces y títulos con #.
      </p>
    </div>
  `,
  styles: [`
    .markdown-editor-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; }
    .markdown-editor-tabs { display: flex; gap: .25rem; }
    .markdown-editor-tab { border: 1px solid #d0d5dd; background: #fff; border-radius: 8px; padding: .2rem .65rem; font-size: .82rem; color: #475467; cursor: pointer; }
    .markdown-editor-tab.active { background: #eef2ff; border-color: #6366f1; color: #3730a3; font-weight: 600; }
    .markdown-editor-textarea { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .88rem; }
    .markdown-editor-preview { border: 1px solid #e4e7ec; border-radius: 8px; padding: .75rem 1rem; min-height: 3rem; background: #fafafa; }
  `]
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() rows = 10;

  value = '';
  mode: MarkdownEditorMode = 'editar';
  disabled = false;

  private onChangeFn: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  setMode(mode: MarkdownEditorMode): void {
    this.mode = mode;
  }

  onInput(value: string): void {
    this.value = value;
    this.onChangeFn(value);
  }
}

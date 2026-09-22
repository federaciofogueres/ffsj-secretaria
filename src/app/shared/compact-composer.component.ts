import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-compact-composer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="compact-composer" [class.is-disabled]="disabled || loading">
      <button
        type="button"
        class="cc-attach"
        [attr.aria-label]="attachAriaLabel"
        [title]="attachAriaLabel"
        [disabled]="disabled || loading"
        (click)="fileInput.click()"
      >
        <i class="bi bi-paperclip" aria-hidden="true"></i>
      </button>

      <textarea
        #textarea
        class="cc-textarea"
        rows="1"
        [value]="value"
        [placeholder]="placeholder"
        [disabled]="disabled || loading"
        [attr.aria-label]="placeholder"
        (input)="onInput($event)"
      ></textarea>

      <button
        type="button"
        class="cc-send"
        [attr.aria-label]="sendAriaLabel"
        [title]="sendAriaLabel"
        [disabled]="sendDisabled"
        (click)="onSend()"
      >
        <span *ngIf="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <i *ngIf="!loading" class="bi bi-send" aria-hidden="true"></i>
      </button>

      <input
        #fileInput
        type="file"
        multiple
        class="visually-hidden"
        [attr.accept]="accept || null"
        [disabled]="disabled || loading"
        (change)="onFilesSelected($event)"
      />
    </div>

    <p class="cc-error alert alert-danger py-1 px-2 small mb-1" role="alert" *ngIf="error">{{ error }}</p>

    <div class="cc-footer">
      <ul class="cc-chips" aria-label="Archivos adjuntos seleccionados" *ngIf="files.length; else sinAdjuntos">
        <li class="cc-chip" *ngFor="let file of files; let index = index">
          <i class="bi bi-paperclip" aria-hidden="true"></i>
          <span class="cc-chip-name">{{ file.name }}</span>
          <button
            type="button"
            class="cc-chip-remove"
            [attr.aria-label]="'Quitar ' + file.name"
            [disabled]="disabled || loading"
            (click)="removeFile(index)"
          >
            <i class="bi bi-x" aria-hidden="true"></i>
          </button>
        </li>
      </ul>
      <ng-template #sinAdjuntos><span class="cc-empty-files text-muted small">Sin archivos adjuntos.</span></ng-template>
      <span class="cc-hint text-muted small">{{ hint || defaultHint }}</span>
    </div>
  `,
  styles: [`
    .compact-composer { display: flex; align-items: flex-end; gap: .5rem; border: 1px solid var(--ffsj-line); border-radius: 999px; padding: .35rem .5rem; background: #fff; }
    .compact-composer:focus-within { border-color: var(--ffsj-red); box-shadow: 0 0 0 3px var(--ffsj-soft-red); }
    .compact-composer.is-disabled { background: #f8f9fb; }
    .cc-attach, .cc-send { flex: 0 0 auto; width: 36px; height: 36px; border-radius: 50%; border: 0; display: inline-flex; align-items: center; justify-content: center; }
    .cc-attach { background: #eef0f4; color: var(--ffsj-muted); }
    .cc-attach:hover:not(:disabled), .cc-attach:focus-visible { background: var(--ffsj-line); outline: 2px solid var(--ffsj-red); outline-offset: 1px; }
    .cc-send { background: var(--ffsj-red); color: #fff; }
    .cc-send:hover:not(:disabled), .cc-send:focus-visible { background: var(--ffsj-red-dark); outline: 2px solid var(--ffsj-red-dark); outline-offset: 1px; }
    .cc-send:disabled, .cc-attach:disabled { opacity: .5; cursor: not-allowed; }
    .cc-textarea { flex: 1 1 auto; resize: none; border: 0; outline: 0; background: transparent; min-height: 24px; max-height: 160px; overflow-y: auto; padding: .5rem .25rem; line-height: 1.35; font: inherit; }
    .cc-textarea:disabled { background: transparent; }
    .cc-footer { display: flex; justify-content: space-between; align-items: flex-start; gap: .5rem; flex-wrap: wrap; margin-top: .4rem; }
    .cc-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem; }
    .cc-chip { display: inline-flex; align-items: center; gap: .35rem; border: 1px solid var(--ffsj-line); border-radius: 999px; padding: .2rem .5rem; font-size: .8rem; background: #f8f9fb; max-width: 240px; }
    .cc-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cc-chip-remove { border: 0; background: transparent; color: var(--ffsj-muted); display: inline-flex; padding: 0; line-height: 0; }
    .cc-chip-remove:hover:not(:disabled), .cc-chip-remove:focus-visible { color: var(--ffsj-red); outline: 2px solid var(--ffsj-red); outline-offset: 2px; border-radius: 50%; }
    .cc-empty-files { flex: 1 1 auto; }
    .cc-hint { white-space: nowrap; }
    @media (max-width: 480px) {
      .compact-composer { border-radius: 18px; }
      .cc-hint { white-space: normal; }
    }
  `]
})
export class CompactComposerComponent implements OnChanges {
  @Input() value = '';
  @Input() placeholder = 'Escribe un mensaje...';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() files: File[] = [];
  @Input() maxFiles = 10;
  @Input() maxBytes = 10 * 1024 * 1024;
  @Input() accept = '';
  @Input() attachAriaLabel = 'Adjuntar archivo';
  @Input() sendAriaLabel = 'Enviar';
  @Input() hint = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() filesChange = new EventEmitter<File[]>();
  @Output() send = new EventEmitter<void>();

  @ViewChild('textarea') private readonly textareaRef?: ElementRef<HTMLTextAreaElement>;

  error = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      queueMicrotask(() => this.resize());
    }
  }

  get sendDisabled(): boolean {
    return this.disabled || this.loading || !this.value.trim();
  }

  get defaultHint(): string {
    return `Máx. ${this.maxFiles} archivos (${Math.round(this.maxBytes / 1024 / 1024)} MB c/u).`;
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(value);
    this.resize();
  }

  onSend(): void {
    if (this.sendDisabled) return;
    this.send.emit();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    input.value = '';
    if (!selected.length) return;
    const invalid = selected.find(file => file.size > this.maxBytes || !this.isAccepted(file));
    const merged = this.unique([...this.files, ...selected]);
    this.error = invalid
      ? `${invalid.name} no cumple los formatos o límites permitidos.`
      : merged.length > this.maxFiles
        ? `Puedes adjuntar un máximo de ${this.maxFiles} archivos.`
        : '';
    if (!this.error) this.filesChange.emit(merged);
  }

  removeFile(index: number): void {
    this.error = '';
    this.filesChange.emit(this.files.filter((_, current) => current !== index));
  }

  private resize(): void {
    const element = this.textareaRef?.nativeElement;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }

  private isAccepted(file: File): boolean {
    if (!this.accept) return true;
    const allowed = this.accept.split(',').map(value => value.trim().toLowerCase());
    return allowed.some(value => value.startsWith('.') ? file.name.toLowerCase().endsWith(value) : file.type === value);
  }

  private unique(files: File[]): File[] {
    const seen = new Set<string>();
    return files.filter(file => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

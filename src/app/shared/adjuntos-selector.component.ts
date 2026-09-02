import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-adjuntos-selector', standalone: true, imports: [CommonModule],
  template: `<label class="adjuntos-label">{{ label }}<input class="form-control" type="file" multiple [disabled]="disabled" (change)="select($event)" /></label><p class="text-muted small mb-2">Máximo 10 MB por archivo.</p><div class="alert alert-danger py-2 small" *ngIf="error">{{ error }}</div><ul class="adjuntos-list" *ngIf="files.length"><li *ngFor="let file of files; let index = index"><span>{{ file.name }} <small>({{ size(file.size) }})</small></span><button type="button" class="adjuntos-remove" [disabled]="disabled" (click)="remove(index)"><i class="bi bi-x-lg" aria-hidden="true"></i> Quitar</button></li></ul>`,
  styles: [`.adjuntos-label{display:grid;gap:.35rem;font-weight:700}.adjuntos-list{list-style:none;margin:0;padding:0;display:grid;gap:.35rem}.adjuntos-list li{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.45rem .65rem;border:1px solid var(--ffsj-line);border-radius:8px}.adjuntos-list small{color:var(--ffsj-muted)}.adjuntos-remove{border:1px solid #e8a5ad;border-radius:6px;background:#fff;color:var(--ffsj-red);font-size:.8rem;font-weight:750;padding:.25rem .5rem}.adjuntos-remove:hover:not(:disabled),.adjuntos-remove:focus-visible{background:var(--ffsj-soft-red);outline:2px solid var(--ffsj-red);outline-offset:2px}.adjuntos-remove:disabled{opacity:.55;cursor:not-allowed}`]
})
export class AdjuntosSelectorComponent {
  @Input() label = 'Adjuntos'; @Input() disabled = false; @Input() files: File[] = [];
  @Output() filesChange = new EventEmitter<File[]>(); error = '';
  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    const invalid = selected.find(file => file.size > 10 * 1024 * 1024);
    this.error = invalid ? `${invalid.name} supera el límite de 10 MB.` : '';
    if (!invalid) this.filesChange.emit(this.unique([...this.files, ...selected]));
    input.value = '';
  }
  remove(index: number): void { this.filesChange.emit(this.files.filter((_, current) => current !== index)); }
  size(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
  private unique(files: File[]): File[] { const seen = new Set<string>(); return files.filter(file => { const key = `${file.name}:${file.size}:${file.lastModified}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
}

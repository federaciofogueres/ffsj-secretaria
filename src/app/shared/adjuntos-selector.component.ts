import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-adjuntos-selector', standalone: true, imports: [CommonModule],
  template: `<div class="adjuntos-selector"><label class="adjuntos-label">{{ label }}<input class="form-control" type="file" multiple [attr.accept]="accept" [disabled]="disabled" (change)="select($event)" /></label><p class="text-muted small mb-2">{{ helpText }}</p><div class="alert alert-danger py-2 small" role="alert" *ngIf="error">{{ error }}</div><p class="adjuntos-empty text-muted small mb-0" *ngIf="!files.length">No has seleccionado archivos.</p><ul class="adjuntos-list" aria-label="Archivos seleccionados" *ngIf="files.length"><li *ngFor="let file of files; let index = index"><span>{{ file.name }} <small>({{ size(file.size) }})</small></span><button type="button" class="adjuntos-remove" [disabled]="disabled" (click)="remove(index)"><i class="bi bi-x-lg" aria-hidden="true"></i> Quitar</button></li></ul></div>`,
  styles: [`.adjuntos-selector{display:grid;gap:.5rem}.adjuntos-label{display:grid;gap:.35rem;font-weight:700}.adjuntos-list{list-style:none;margin:0;padding:0;display:grid;gap:.35rem}.adjuntos-list li{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.45rem .65rem;border:1px solid var(--ffsj-line);border-radius:8px}.adjuntos-list small{color:var(--ffsj-muted)}.adjuntos-remove{border:1px solid #e8a5ad;border-radius:6px;background:#fff;color:var(--ffsj-red);font-size:.8rem;font-weight:750;padding:.25rem .5rem}.adjuntos-remove:hover:not(:disabled),.adjuntos-remove:focus-visible{background:var(--ffsj-soft-red);outline:2px solid var(--ffsj-red);outline-offset:2px}.adjuntos-remove:disabled{opacity:.55;cursor:not-allowed}`]
})
export class AdjuntosSelectorComponent {
  @Input() label = 'Adjuntos'; @Input() disabled = false; @Input() files: File[] = [];
  @Input() maxFiles = 10; @Input() maxBytes = 10 * 1024 * 1024; @Input() accept = '';
  @Output() filesChange = new EventEmitter<File[]>(); error = '';
  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    const invalid = selected.find(file => file.size > this.maxBytes || !this.isAccepted(file));
    const unique = this.unique([...this.files, ...selected]);
    this.error = invalid ? `${invalid.name} no cumple los formatos o límites permitidos.` : unique.length > this.maxFiles ? `Puedes adjuntar un máximo de ${this.maxFiles} archivos.` : '';
    if (!this.error) this.filesChange.emit(unique);
    input.value = '';
  }
  remove(index: number): void { this.filesChange.emit(this.files.filter((_, current) => current !== index)); }
  size(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
  get helpText(): string { return `Máximo ${this.maxFiles} archivo(s), ${Math.round(this.maxBytes / 1024 / 1024)} MB por archivo.${this.accept ? ' Formatos admitidos: ' + this.accept.replaceAll('.', '').toUpperCase().replaceAll(',', ', ') + '.' : ''}`; }
  private isAccepted(file: File): boolean { if (!this.accept) return true; const allowed = this.accept.split(',').map(value => value.trim().toLowerCase()); return allowed.some(value => value.startsWith('.') ? file.name.toLowerCase().endsWith(value) : file.type === value); }
  private unique(files: File[]): File[] { const seen = new Set<string>(); return files.filter(file => { const key = `${file.name}:${file.size}:${file.lastModified}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
}

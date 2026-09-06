import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from './translate.pipe';

@Component({ selector: 'app-attachment-picker', standalone: true, imports: [CommonModule, TranslatePipe], template: `<label class="ux-btn ux-btn-secondary ux-btn-sm mb-0 attachment-picker" [class.disabled]="disabled" [attr.for]="inputId"><i class="bi bi-paperclip me-1"></i>{{ label || ('attachments.select' | t) }}</label><input class="visually-hidden" [id]="inputId" type="file" [accept]="accept" [multiple]="multiple" [disabled]="disabled" (change)="onChange($event)" />` })
export class AttachmentPickerComponent {
  @Input() inputId = 'attachment-picker'; @Input() label = ''; @Input() accept = ''; @Input() multiple = false; @Input() disabled = false;
  @Output() filesSelected = new EventEmitter<File[]>();
  onChange(event: Event): void { this.filesSelected.emit(Array.from((event.target as HTMLInputElement).files || [])); }
}

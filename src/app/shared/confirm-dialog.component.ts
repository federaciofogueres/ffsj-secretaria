import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from './translate.pipe';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="confirm-backdrop" (click)="cancel.emit()"></div>
    <section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" (click)="$event.stopPropagation()">
      <h2 id="confirm-dialog-title">{{ title }}</h2>
      <p id="confirm-dialog-message">{{ message }}</p>
      <div class="confirm-reason" *ngIf="showReasonField">
        <label for="confirm-dialog-reason">{{ reasonLabel }}</label>
        <textarea
          id="confirm-dialog-reason"
          class="form-control"
          rows="3"
          [maxlength]="reasonMaxLength"
          [attr.placeholder]="reasonPlaceholder"
          [(ngModel)]="reason"
        ></textarea>
        <span class="confirm-reason-count">{{ reason.length }}/{{ reasonMaxLength }}</span>
      </div>
      <div class="confirm-actions">
        <button class="ux-btn ux-btn-secondary" type="button" (click)="cancel.emit()">{{ 'common.cancel' | t }}</button>
        <button class="ux-btn ux-btn-danger" type="button" (click)="onConfirm()">{{ confirmLabel }}</button>
      </div>
    </section>
  `,
  styles: [`
    .confirm-backdrop { position: fixed; inset: 0; z-index: 1050; background: rgba(24, 33, 47, .48); }
    .confirm-dialog { position: fixed; z-index: 1051; inset: 50% auto auto 50%; width: min(440px, calc(100vw - 2rem)); transform: translate(-50%, -50%); background: #fff; border-radius: 16px; padding: 1.5rem; box-shadow: 0 20px 55px rgba(16, 24, 40, .25); }
    .confirm-dialog h2 { margin: 0 0 .75rem; font-size: 1.2rem; color: #18212f; }
    .confirm-dialog p { margin: 0; color: #475467; }
    .confirm-reason { display: grid; gap: .35rem; margin-top: 1.1rem; }
    .confirm-reason label { font-weight: 700; font-size: .9rem; color: #18212f; }
    .confirm-reason-count { justify-self: end; font-size: .78rem; color: #98a2b3; }
    .confirm-actions { display: flex; justify-content: flex-end; gap: .75rem; flex-wrap: wrap; margin-top: 1.5rem; }
  `]
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmar acción';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmar';
  @Input() showReasonField = false;
  @Input() reasonLabel = 'Motivo (opcional)';
  @Input() reasonPlaceholder = '';
  @Input() reasonMaxLength = 500;
  @Output() cancel = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<string>();

  reason = '';

  onConfirm(): void {
    this.confirmed.emit(this.reason.trim());
  }
}

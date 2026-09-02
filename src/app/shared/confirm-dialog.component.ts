import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirm-backdrop" (click)="cancel.emit()"></div>
    <section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" (click)="$event.stopPropagation()">
      <h2 id="confirm-dialog-title">{{ title }}</h2>
      <p id="confirm-dialog-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="ux-btn ux-btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
        <button class="ux-btn ux-btn-danger" type="button" (click)="confirmed.emit()">{{ confirmLabel }}</button>
      </div>
    </section>
  `,
  styles: [`
    .confirm-backdrop { position: fixed; inset: 0; z-index: 1050; background: rgba(24, 33, 47, .48); }
    .confirm-dialog { position: fixed; z-index: 1051; inset: 50% auto auto 50%; width: min(440px, calc(100vw - 2rem)); transform: translate(-50%, -50%); background: #fff; border-radius: 16px; padding: 1.5rem; box-shadow: 0 20px 55px rgba(16, 24, 40, .25); }
    .confirm-dialog h2 { margin: 0 0 .75rem; font-size: 1.2rem; color: #18212f; }
    .confirm-dialog p { margin: 0; color: #475467; }
    .confirm-actions { display: flex; justify-content: flex-end; gap: .75rem; flex-wrap: wrap; margin-top: 1.5rem; }
  `]
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmar acción';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmar';
  @Output() cancel = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
}

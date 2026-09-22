import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="ffsj-toast"
      [class.ffsj-toast-error]="type === 'error'"
      [class.ffsj-toast-success]="type === 'success'"
      role="alert"
      aria-live="assertive"
      (click)="closed.emit()"
    >
      <i class="bi" [ngClass]="type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'" aria-hidden="true"></i>
      <span class="ffsj-toast-message">{{ message }}</span>
      <button type="button" class="ffsj-toast-close" aria-label="Cerrar notificación" (click)="onCloseClick($event)">
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </div>
  `,
  styles: [`
    .ffsj-toast {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 1080;
      display: flex;
      align-items: center;
      gap: .6rem;
      max-width: min(420px, calc(100vw - 2.5rem));
      padding: .75rem .9rem;
      border-radius: 10px;
      background: #fff;
      border: 1px solid var(--ffsj-line, #e5e7eb);
      box-shadow: 0 12px 32px rgba(15, 23, 42, .18);
      cursor: pointer;
    }
    .ffsj-toast-error { border-left: 4px solid var(--ffsj-red, #b21f2d); }
    .ffsj-toast-error i.bi-exclamation-triangle-fill { color: var(--ffsj-red, #b21f2d); }
    .ffsj-toast-success { border-left: 4px solid #15803d; }
    .ffsj-toast-success i.bi-check-circle-fill { color: #15803d; }
    .ffsj-toast-message { flex: 1 1 auto; font-size: .9rem; color: #18212f; }
    .ffsj-toast-close { flex: 0 0 auto; border: 0; background: transparent; color: var(--ffsj-muted, #667085); padding: .2rem; line-height: 0; }
    .ffsj-toast-close:hover, .ffsj-toast-close:focus-visible { color: #18212f; outline: 2px solid var(--ffsj-line, #e5e7eb); outline-offset: 2px; border-radius: 50%; }
    @media (max-width: 480px) {
      .ffsj-toast { left: 1rem; right: 1rem; max-width: none; }
    }
  `]
})
export class ToastComponent {
  @Input() message = '';
  @Input() type: 'error' | 'success' = 'error';
  @Output() closed = new EventEmitter<void>();

  onCloseClick(event: Event): void {
    event.stopPropagation();
    this.closed.emit();
  }
}

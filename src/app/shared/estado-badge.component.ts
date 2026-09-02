import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-estado-badge',
  standalone: true,
  template: `<span class="estado-badge" [class]="'estado-badge estado-' + normalized"><i class="bi" [class]="icon"></i>{{ label }}</span>`,
  styles: [`
    .estado-badge { display: inline-flex; align-items: center; gap: .35rem; border-radius: 999px; padding: .2rem .55rem; font-size: .78rem; font-weight: 700; line-height: 1.2; white-space: nowrap; background: #f2f4f7; color: #344054; }
    .estado-activa, .estado-abierta, .estado-validada { background: #dcfae6; color: #146c43; }
    .estado-cerrada, .estado-archivada, .estado-cancelada, .estado-rechazada { background: #fef3f2; color: #b42318; }
    .estado-recibida, .estado-en_revision, .estado-en_proceso { background: #eff8ff; color: #175cd3; }
    .estado-con_incidencias, .estado-pendiente { background: #fff7ed; color: #9a3412; }
  `]
})
export class EstadoBadgeComponent {
  @Input({ required: true }) estado = '';

  get normalized(): string {
    return this.estado.toLowerCase().trim().replace(/\s+/g, '_');
  }

  get label(): string {
    const labels: Record<string, string> = {
      activa: 'Activa', abierta: 'Abierta', cerrada: 'Cerrada', archivada: 'Archivada', cancelada: 'Cancelada',
      recibida: 'Recibida', en_revision: 'En revisión', con_incidencias: 'Con incidencias', validada: 'Validada',
      rechazada: 'Rechazada', pendiente: 'Pendiente', en_proceso: 'En proceso'
    };
    return labels[this.normalized] ?? this.estado;
  }

  get icon(): string {
    if (['activa', 'abierta', 'validada'].includes(this.normalized)) return 'bi-check-circle-fill';
    if (['cerrada', 'archivada', 'cancelada', 'rechazada'].includes(this.normalized)) return 'bi-x-circle-fill';
    if (['con_incidencias', 'pendiente'].includes(this.normalized)) return 'bi-exclamation-triangle-fill';
    return 'bi-clock-fill';
  }
}

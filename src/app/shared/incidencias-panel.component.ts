import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';

import { AdjuntoSecretaria, Incidencia, IncidenciaEvento } from '../core/models';
import { AdminAccessService } from '../core/admin-access.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { CompactComposerComponent } from './compact-composer.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

interface CierrePendiente {
  incidencia: Incidencia;
  estado: 'subsanada' | 'cerrada';
}

@Component({
  selector: 'app-incidencias-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CompactComposerComponent, ConfirmDialogComponent],
  template: `
    <section class="incidencias-panel">
      <div class="panel-header">
        <h3 class="h6 mb-0">Incidencias</h3>
        <div class="panel-header-actions">
          <span class="counter-badge" [class.has-open]="abiertas > 0">{{ headerLabel }}</span>
          <button
            *ngIf="puedeCrear"
            type="button"
            class="btn-add-incidencia"
            aria-label="Crear nueva incidencia"
            title="Crear nueva incidencia"
            [attr.aria-expanded]="mostrarNuevaIncidencia"
            (click)="mostrarNuevaIncidencia = !mostrarNuevaIncidencia"
          >
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <p *ngIf="error" class="panel-error" role="alert">{{ error }}</p>

      <div class="incidencias-empty" *ngIf="!incidencias.length">
        <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
        <p class="mb-0 fw-semibold">Sin incidencias.</p>
        <p class="mb-0 text-muted">Aún no se han registrado incidencias.</p>
      </div>

      <ul class="incidence-list" *ngIf="incidencias.length">
        <li class="incidence-item" *ngFor="let incidencia of incidencias" [class.is-open]="incidencia.estado === 'abierta'">
          <button
            type="button"
            class="incidence-summary"
            [attr.aria-expanded]="isExpanded(incidencia)"
            [attr.aria-controls]="'incidencia-body-' + incidencia.id"
            (click)="toggle(incidencia)"
          >
            <span class="estado-badge" [ngClass]="'estado-' + incidencia.estado">{{ labelEstado(incidencia.estado) }}</span>
            <time class="incidence-date">{{ incidencia.fechaAlta | date: 'dd/MM/yyyy HH:mm' }}</time>
            <span class="incidence-preview">{{ incidencia.mensaje }}</span>
            <i class="bi chevron" [ngClass]="isExpanded(incidencia) ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
          </button>

          <div class="incidence-body" *ngIf="isExpanded(incidencia)" [id]="'incidencia-body-' + incidencia.id" role="region">
            <ul class="incidence-timeline" *ngIf="conversacion(incidencia).length">
              <li *ngFor="let evento of conversacion(incidencia)">
                <div class="timeline-meta">
                  <time>{{ evento.createdAt | date: 'dd/MM/yyyy HH:mm' }}</time>
                  <span class="actor-badge" [ngClass]="'actor-' + evento.actor">{{ labelActor(evento.actor) }}</span>
                </div>
                <p class="timeline-message">{{ evento.mensaje }}</p>
                <div class="timeline-attachments" *ngIf="evento.adjuntos?.length">
                  <button
                    type="button"
                    class="attachment-chip"
                    *ngFor="let adjunto of evento.adjuntos"
                    [attr.aria-label]="'Descargar ' + adjunto.originalName"
                    (click)="descargarAdjunto(adjunto)"
                  >
                    <i class="bi bi-paperclip" aria-hidden="true"></i>{{ adjunto.originalName }}
                  </button>
                </div>
              </li>
            </ul>
            <p class="incidence-empty-thread text-muted small" *ngIf="!conversacion(incidencia).length">
              Aún no hay más mensajes en esta incidencia.
            </p>

            <app-compact-composer
              *ngIf="incidencia.estado === 'abierta' && canAssociationRespond"
              class="mt-2"
              placeholder="Escribe tu respuesta o subsanación..."
              attachAriaLabel="Adjuntar archivo a la respuesta"
              sendAriaLabel="Enviar respuesta"
              [value]="respuestas[incidencia.id] || ''"
              (valueChange)="respuestas[incidencia.id] = $event"
              [files]="responseFiles[incidencia.id] || []"
              (filesChange)="responseFiles[incidencia.id] = $event"
              [loading]="loading"
              (send)="responder(incidencia)"
            ></app-compact-composer>

            <div class="incidence-admin-actions" *ngIf="canAdminManage(incidencia)">
              <app-compact-composer
                placeholder="Añade un comentario para la asociación..."
                attachAriaLabel="Adjuntar archivo al comentario"
                sendAriaLabel="Añadir comentario"
                [value]="comentarios[incidencia.id] || ''"
                (valueChange)="comentarios[incidencia.id] = $event"
                [files]="commentFiles[incidencia.id] || []"
                (filesChange)="commentFiles[incidencia.id] = $event"
                [loading]="loading"
                (send)="comentar(incidencia)"
              ></app-compact-composer>

              <div class="close-actions">
                <button class="btn btn-success btn-sm" type="button" [disabled]="loading" (click)="abrirCierre(incidencia, 'subsanada')">
                  Marcar subsanada
                </button>
                <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="loading" (click)="abrirCierre(incidencia, 'cerrada')">
                  Cerrar sin subsanar
                </button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  *ngIf="incidencia.estado === 'respondida'"
                  [disabled]="loading"
                  (click)="abrirDevolucion(incidencia)"
                >
                  Devolver a asociación
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <div class="new-incidencia-block" *ngIf="mostrarComposerNuevo">
        <p class="new-incidencia-label mb-2 fw-semibold" *ngIf="incidencias.length">Nueva incidencia</p>
        <app-compact-composer
          placeholder="Describe la incidencia..."
          attachAriaLabel="Adjuntar archivo a la incidencia"
          sendAriaLabel="Crear incidencia"
          [value]="nuevoMensaje"
          (valueChange)="nuevoMensaje = $event"
          [files]="selectedFiles"
          (filesChange)="selectedFiles = $event"
          [loading]="loading"
          (send)="crear()"
        ></app-compact-composer>
      </div>
    </section>

    <app-confirm-dialog
      *ngIf="cierrePendiente"
      title="Cerrar incidencia"
      message="Puedes indicar un motivo de cierre (opcional)."
      confirmLabel="Confirmar"
      [showReasonField]="true"
      reasonLabel="Motivo (opcional)"
      reasonPlaceholder="Escribe un motivo de cierre..."
      (cancel)="cierrePendiente = null"
      (confirmed)="confirmarCierre($event)"
    ></app-confirm-dialog>

    <app-confirm-dialog
      *ngIf="devolucionPendiente"
      title="Devolver a la asociación"
      message="Indica el motivo de la devolución."
      confirmLabel="Confirmar"
      [showReasonField]="true"
      [requireReason]="true"
      reasonLabel="Motivo"
      reasonPlaceholder="Escribe el motivo de la devolución..."
      (cancel)="devolucionPendiente = null"
      (confirmed)="confirmarDevolucion($event)"
    ></app-confirm-dialog>
  `,
  styles: [`
    .incidencias-panel { border: 1px solid var(--ffsj-line); border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: .75rem; }
    .panel-header-actions { display: flex; align-items: center; gap: .5rem; }
    .counter-badge { min-width: 28px; padding: 0 .5rem; height: 26px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: #eef0f4; font-weight: 700; font-size: .85rem; }
    .counter-badge.has-open { background: var(--ffsj-soft-red); color: var(--ffsj-red-dark); }
    .btn-add-incidencia { width: 30px; height: 30px; border-radius: 50%; border: 0; background: var(--ffsj-red); color: #fff; display: inline-flex; align-items: center; justify-content: center; }
    .btn-add-incidencia:hover, .btn-add-incidencia:focus-visible { background: var(--ffsj-red-dark); outline: 2px solid var(--ffsj-red-dark); outline-offset: 1px; }
    .panel-error { color: var(--ffsj-red-dark); font-size: .9rem; }
    .incidencias-empty { text-align: center; padding: 1.5rem .5rem; color: var(--ffsj-muted); }
    .incidencias-empty i { font-size: 1.5rem; margin-bottom: .35rem; display: inline-block; }
    .incidence-list { list-style: none; padding: 0; margin: 0 0 .5rem; display: grid; gap: .6rem; }
    .incidence-item { border: 1px solid var(--ffsj-line); border-radius: 8px; overflow: hidden; }
    .incidence-item.is-open { border-left: 3px solid var(--ffsj-red); }
    .incidence-summary { width: 100%; display: flex; align-items: center; gap: .6rem; padding: .55rem .75rem; background: #fff; border: 0; text-align: left; }
    .incidence-summary:hover, .incidence-summary:focus-visible { background: #f8f9fb; outline: 2px solid var(--ffsj-red); outline-offset: -2px; }
    .estado-badge { flex: 0 0 auto; border-radius: 999px; padding: .15rem .55rem; font-size: .75rem; font-weight: 700; text-transform: uppercase; background: #eef0f4; color: var(--ffsj-muted); }
    .estado-badge.estado-abierta { background: var(--ffsj-soft-red); color: var(--ffsj-red-dark); }
    .estado-badge.estado-respondida { background: #e7f1ff; color: #0b5ed7; }
    .estado-badge.estado-subsanada { background: #e6f7ec; color: #15803d; }
    .incidence-date { flex: 0 0 auto; color: var(--ffsj-muted); font-size: .82rem; }
    .incidence-preview { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #18212f; }
    .chevron { flex: 0 0 auto; color: var(--ffsj-muted); }
    .incidence-body { padding: .75rem; border-top: 1px solid var(--ffsj-line); background: #fbfcfe; }
    .incidence-empty-thread { margin: 0 0 .5rem; }
    .incidence-timeline { list-style: none; padding: 0; margin: 0 0 .5rem; display: grid; gap: .55rem; }
    .incidence-timeline > li { border-left: 2px solid var(--ffsj-line); padding-left: .6rem; }
    .timeline-meta { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .15rem; }
    .timeline-meta time { color: var(--ffsj-muted); font-size: .8rem; order: 1; }
    .actor-badge { border-radius: 999px; padding: .1rem .5rem; font-size: .72rem; font-weight: 700; background: #eef0f4; color: var(--ffsj-muted); order: 0; }
    .actor-badge.actor-administracion { background: var(--ffsj-soft-red); color: var(--ffsj-red-dark); }
    .timeline-message { margin: 0 0 .35rem; }
    .timeline-attachments { display: flex; flex-wrap: wrap; gap: .4rem; }
    .attachment-chip { display: inline-flex; align-items: center; gap: .3rem; border: 1px solid var(--ffsj-line); border-radius: 999px; padding: .15rem .55rem; font-size: .78rem; background: #f8f9fb; color: #0d6efd; }
    .attachment-chip:hover, .attachment-chip:focus-visible { color: #084298; outline: 2px solid #0d6efd; outline-offset: 1px; }
    .incidence-admin-actions { display: grid; gap: .5rem; margin-top: .6rem; }
    .close-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .new-incidencia-block { margin-top: 1rem; }
  `]
})
export class IncidenciasPanelComponent implements OnChanges {
  @Input({ required: true }) scope!: 'solicitud' | 'registro' | 'inscripcion';
  @Input({ required: true }) scopeId!: string | number;
  @Output() countChange = new EventEmitter<number>();

  incidencias: Incidencia[] = [];
  respuestas: Record<string, string> = {};
  comentarios: Record<string, string> = {};
  responseFiles: Record<string, File[]> = {};
  commentFiles: Record<string, File[]> = {};
  nuevoMensaje = '';
  selectedFiles: File[] = [];
  loading = false;
  error = '';

  mostrarNuevaIncidencia = false;
  expandedIds = new Set<string>();
  cierrePendiente: CierrePendiente | null = null;
  devolucionPendiente: Incidencia | null = null;

  constructor(
    private readonly secretariaService: SecretariaService,
    private readonly adminAccess: AdminAccessService,
    readonly permissions: PermissionsService
  ) {}

  ngOnChanges(): void {
    this.cargar(true);
  }

  get abiertas(): number {
    return this.incidencias.filter(item => ['abierta', 'respondida'].includes(item.estado)).length;
  }

  get headerLabel(): string {
    if (!this.incidencias.length) return '0';
    return `${this.abiertas} abierta${this.abiertas === 1 ? '' : 's'}`;
  }

  get isAdminMode(): boolean {
    return this.adminAccess.isAdmin();
  }

  get puedeCrear(): boolean {
    return this.isAdminMode && this.permissions.hasPermission('incidencias:write');
  }

  get mostrarComposerNuevo(): boolean {
    return this.puedeCrear && (this.mostrarNuevaIncidencia || !this.incidencias.length);
  }

  get canAssociationRespond(): boolean {
    return !this.isAdminMode && this.permissions.hasPermission('incidencias:read');
  }

  canAdminManage(incidencia: Incidencia): boolean {
    return this.isAdminMode && this.permissions.hasPermission('incidencias:write') && ['abierta', 'respondida'].includes(incidencia.estado);
  }

  isExpanded(incidencia: Incidencia): boolean {
    return this.expandedIds.has(String(incidencia.id));
  }

  toggle(incidencia: Incidencia): void {
    const key = String(incidencia.id);
    if (this.expandedIds.has(key)) this.expandedIds.delete(key);
    else this.expandedIds.add(key);
  }

  conversacion(incidencia: Incidencia): IncidenciaEvento[] {
    const eventos = incidencia.eventos || [];
    return eventos.length && eventos[0].tipo === 'creada' ? eventos.slice(1) : eventos;
  }

  labelEstado(estado: string): string {
    const labels: Record<string, string> = {
      abierta: 'Abierta',
      respondida: 'Respondida',
      subsanada: 'Subsanada',
      cerrada: 'Cerrada'
    };
    return labels[estado] || estado;
  }

  labelActor(actor: string): string {
    return actor === 'administracion' ? 'Administración' : actor === 'asociacion' ? 'Asociación' : 'Sistema';
  }

  crear(): void {
    if (!this.nuevoMensaje.trim()) return;
    this.loading = true;
    this.error = '';
    this.secretariaService.crearIncidencia({
      scope: this.scope,
      scopeId: this.scopeId,
      mensaje: this.nuevoMensaje.trim()
    }).pipe(
      switchMap(incidencia => {
        const eventoId = this.lastEventoId(incidencia);
        if (!this.selectedFiles.length || !eventoId) return of(incidencia);
        return forkJoin(this.selectedFiles.map(file => this.secretariaService.subirAdjunto('incidencia_evento', eventoId, file))).pipe(
          switchMap(() => of(incidencia))
        );
      })
    ).subscribe({
      next: () => {
        this.nuevoMensaje = '';
        this.selectedFiles = [];
        this.mostrarNuevaIncidencia = false;
        this.loading = false;
        this.cargar(true);
      },
      error: () => this.fail('No se ha podido crear la incidencia.')
    });
  }

  responder(incidencia: Incidencia): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.responderIncidencia(incidencia.id, this.respuestas[incidencia.id]).pipe(
      switchMap(updated => {
        const files = this.responseFiles[incidencia.id] || [];
        const eventoId = this.lastEventoId(updated);
        if (!files.length || !eventoId) return of(updated);
        return forkJoin(files.map(file => this.secretariaService.subirAdjunto('incidencia_evento', eventoId, file))).pipe(
          switchMap(() => of(updated))
        );
      })
    ).subscribe({
      next: () => {
        this.respuestas[incidencia.id] = '';
        this.responseFiles[incidencia.id] = [];
        this.loading = false;
        this.cargar();
      },
      error: () => this.fail('No se ha podido enviar la respuesta.')
    });
  }

  comentar(incidencia: Incidencia): void {
    const mensaje = this.comentarios[incidencia.id]?.trim();
    if (!mensaje) return;
    this.loading = true;
    this.error = '';
    this.secretariaService.comentarIncidencia(incidencia.id, mensaje).pipe(
      switchMap(actualizada => {
        const files = this.commentFiles[incidencia.id] || [];
        const eventoId = this.lastEventoId(actualizada);
        if (!files.length || !eventoId) return of(actualizada);
        return forkJoin(files.map(file => this.secretariaService.subirAdjunto('incidencia_evento', eventoId, file))).pipe(
          switchMap(() => of(actualizada))
        );
      })
    ).subscribe({
      next: () => {
        this.comentarios[incidencia.id] = '';
        this.commentFiles[incidencia.id] = [];
        this.loading = false;
        this.cargar();
      },
      error: () => this.fail('No se ha podido añadir el comentario.')
    });
  }

  abrirCierre(incidencia: Incidencia, estado: 'subsanada' | 'cerrada'): void {
    this.cierrePendiente = { incidencia, estado };
  }

  confirmarCierre(motivo: string): void {
    if (!this.cierrePendiente) return;
    const { incidencia, estado } = this.cierrePendiente;
    this.resolver(incidencia, estado, motivo);
  }

  abrirDevolucion(incidencia: Incidencia): void {
    this.devolucionPendiente = incidencia;
  }

  confirmarDevolucion(motivo: string): void {
    if (!this.devolucionPendiente || !motivo.trim()) return;
    this.reabrir(this.devolucionPendiente, motivo.trim());
  }

  private resolver(incidencia: Incidencia, estado: 'subsanada' | 'cerrada', motivo: string): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.cerrarIncidencia(incidencia.id, motivo, estado).subscribe({
      next: () => {
        this.cierrePendiente = null;
        this.loading = false;
        this.cargar();
      },
      error: () => this.fail('No se ha podido cerrar la incidencia.')
    });
  }

  private reabrir(incidencia: Incidencia, motivo: string): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.reabrirIncidencia(incidencia.id, motivo).subscribe({
      next: () => {
        this.devolucionPendiente = null;
        this.loading = false;
        this.cargar();
      },
      error: () => this.fail('No se ha podido devolver la incidencia a la asociación.')
    });
  }

  private cargar(expandLatest = false): void {
    if (!this.scope || !this.scopeId) return;
    this.secretariaService.getIncidencias(this.scope, String(this.scopeId)).subscribe({
      next: response => {
        this.incidencias = response.incidencias;
        if (expandLatest && this.incidencias.length) {
          this.expandedIds.add(String(this.incidencias[0].id));
        }
        this.countChange.emit(this.incidencias.length);
      },
      error: () => {
        this.incidencias = [];
        this.error = 'No se han podido cargar las incidencias.';
        this.countChange.emit(0);
      }
    });
  }

  private lastEventoId(incidencia: Incidencia): number | null {
    const eventos = incidencia.eventos || [];
    return eventos.length ? eventos[eventos.length - 1].id : null;
  }

  descargarAdjunto(adjunto: AdjuntoSecretaria): void {
    this.error = '';
    this.secretariaService.descargarAdjunto(adjunto.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = adjunto.originalName || `adjunto-${adjunto.id}`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error = 'No se ha podido descargar el adjunto.'
    });
  }

  private fail(message: string): void {
    this.loading = false;
    this.error = message;
  }
}

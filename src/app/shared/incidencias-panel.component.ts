import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';

import { AdjuntoSecretaria, Incidencia } from '../core/models';
import { AdminAccessService } from '../core/admin-access.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

@Component({
  selector: 'app-incidencias-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="incidencias-panel">
      <div class="panel-header">
        <div>
          <h3 class="h6 mb-1">Incidencias</h3>
          <p class="text-muted mb-0">{{ abiertas }} abierta(s), {{ incidencias.length }} total.</p>
        </div>
        <span class="counter" [class.has-open]="abiertas > 0">{{ abiertas }}</span>
      </div>

      <div class="new-incidence" *ngIf="isAdminMode && permissions.hasPermission('incidencias:write')">
        <textarea class="form-control" rows="2" [(ngModel)]="nuevoMensaje" placeholder="Describe la incidencia"></textarea>
        <div class="d-flex gap-2 flex-wrap">
          <input class="form-control form-control-sm" type="file" multiple (change)="onFiles($event)" />
          <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="!nuevoMensaje.trim() || loading" (click)="crear()">
            Crear incidencia
          </button>
        </div>
      </div>

      <p *ngIf="error" class="error" role="alert">{{ error }}</p>

      <ul class="incidence-list">
        <li *ngFor="let incidencia of incidencias" [class.open]="incidencia.estado === 'abierta'">
          <div class="incidence-title">
            <strong>{{ incidencia.estado }}</strong>
            <small>{{ incidencia.fechaAlta | date: 'dd/MM/yyyy HH:mm' }}</small>
          </div>
          <p>{{ incidencia.mensaje }}</p>
          <p class="response" *ngIf="incidencia.respuesta">{{ incidencia.respuesta }}</p>
          <div class="timeline" *ngIf="incidencia.eventos?.length">
            <article *ngFor="let evento of incidencia.eventos">
              <div class="event-meta">
                <strong>{{ labelEvento(evento.tipo) }}</strong>
                <span>{{ labelActor(evento.actor) }} - {{ evento.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <p>{{ evento.mensaje }}</p>
              <div class="attachments" *ngIf="evento.adjuntos?.length">
                <button *ngFor="let adjunto of evento.adjuntos" class="attachment-link" type="button" (click)="descargarAdjunto(adjunto)">{{ adjunto.originalName }}</button>
              </div>
            </article>
          </div>
          <div class="response-box" *ngIf="incidencia.estado === 'abierta' && canAssociationRespond">
            <input class="form-control form-control-sm" [(ngModel)]="respuestas[incidencia.id]" placeholder="Respuesta o subsanacion" />
            <input class="form-control form-control-sm" type="file" multiple (change)="onResponseFiles(incidencia.id, $event)" />
            <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="loading || !respuestas[incidencia.id]" (click)="responder(incidencia)">
              Responder
            </button>
          </div>
          <div class="response-box" *ngIf="canAdminManage(incidencia)">
            <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="comentarios[incidencia.id]" placeholder="Añade un comentario para la asociación"></textarea>
            <input class="form-control form-control-sm" type="file" multiple (change)="onCommentFiles(incidencia.id, $event)" />
            <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="loading || !comentarios[incidencia.id]?.trim()" (click)="comentar(incidencia)">Añadir comentario</button>
            <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="devoluciones[incidencia.id]" placeholder="Comentario de cierre o motivo si se devuelve a la asociacion"></textarea>
            <input class="form-control form-control-sm" type="file" multiple (change)="onReturnFiles(incidencia.id, $event)" />
            <button class="btn btn-success btn-sm" type="button" [disabled]="loading" (click)="resolver(incidencia, 'subsanada')">
              Marcar subsanada
            </button>
            <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="loading" (click)="resolver(incidencia, 'cerrada')">
              Cerrar sin subsanar
            </button>
            <button class="btn btn-outline-secondary btn-sm" type="button" *ngIf="incidencia.estado === 'respondida'" [disabled]="loading || !devoluciones[incidencia.id]" (click)="reabrir(incidencia)">
              Devolver a asociacion
            </button>
          </div>
        </li>
        <li *ngIf="!incidencias.length" class="empty">Sin incidencias.</li>
      </ul>
    </section>
  `,
  styles: [`
    .incidencias-panel { border: 1px solid #eceff4; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    .panel-header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    .counter { min-width: 28px; height: 28px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: #eef0f4; font-weight: 700; }
    .counter.has-open { background: #fee2e2; color: #991b1b; }
    .new-incidence { display: grid; gap: .5rem; margin: 1rem 0; }
    .incidence-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .65rem; }
    .incidence-list li { border-top: 1px solid #f0f1f4; padding-top: .65rem; }
    .incidence-list li.open { border-left: 3px solid #c8102e; padding-left: .65rem; }
    .incidence-title, .response-box { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
    .incidence-title strong { text-transform: capitalize; }
    .incidence-title small, .response { color: #687386; }
    .timeline { display: grid; gap: .5rem; margin: .65rem 0; }
    .timeline article { border: 1px solid #edf0f5; border-radius: 6px; padding: .65rem; background: #fbfcfe; }
    .timeline p { margin: .35rem 0 0; }
    .event-meta { display: flex; gap: .5rem; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
    .event-meta span { color: #687386; font-size: .82rem; }
    .attachments { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: .5rem; }
    .attachment-link { border: 0; padding: 0; color: #0d6efd; background: transparent; font-size: .85rem; text-decoration: underline; }
    .attachment-link:hover, .attachment-link:focus-visible { color: #084298; }
    .error { margin: .75rem 0; color: #991b1b; font-size: .9rem; }
    .empty { color: #687386; }
  `]
})
export class IncidenciasPanelComponent implements OnChanges {
  @Input({ required: true }) scope!: 'solicitud' | 'registro' | 'inscripcion';
  @Input({ required: true }) scopeId!: string | number;

  incidencias: Incidencia[] = [];
  adjuntosByIncidencia: Record<string, AdjuntoSecretaria[]> = {};
  respuestas: Record<string, string> = {};
  devoluciones: Record<string, string> = {};
  comentarios: Record<string, string> = {};
  responseFiles: Record<string, File[]> = {};
  returnFiles: Record<string, File[]> = {};
  commentFiles: Record<string, File[]> = {};
  nuevoMensaje = '';
  selectedFiles: File[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly secretariaService: SecretariaService,
    private readonly adminAccess: AdminAccessService,
    readonly permissions: PermissionsService
  ) {}

  ngOnChanges(): void {
    this.cargar();
  }

  get abiertas(): number {
    return this.incidencias.filter(item => ['abierta', 'respondida'].includes(item.estado)).length;
  }

  get isAdminMode(): boolean {
    return this.adminAccess.isAdmin();
  }

  get canAssociationRespond(): boolean {
    return !this.isAdminMode && this.permissions.hasPermission('incidencias:read');
  }

  canAdminManage(incidencia: Incidencia): boolean {
    return this.isAdminMode && this.permissions.hasPermission('incidencias:write') && ['abierta', 'respondida'].includes(incidencia.estado);
  }

  onFiles(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.selectedFiles = files ? Array.from(files) : [];
  }

  onResponseFiles(incidenciaId: string, event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.responseFiles[incidenciaId] = files ? Array.from(files) : [];
  }

  onReturnFiles(incidenciaId: string, event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.returnFiles[incidenciaId] = files ? Array.from(files) : [];
  }

  onCommentFiles(incidenciaId: string, event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.commentFiles[incidenciaId] = files ? Array.from(files) : [];
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
        this.loading = false;
        this.cargar();
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

  resolver(incidencia: Incidencia, estado: 'subsanada' | 'cerrada'): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.cerrarIncidencia(incidencia.id, this.devoluciones[incidencia.id] || this.respuestas[incidencia.id], estado).subscribe({
      next: () => {
        this.devoluciones[incidencia.id] = '';
        this.loading = false;
        this.cargar();
      },
      error: () => this.fail('No se ha podido cerrar la incidencia.')
    });
  }

  reabrir(incidencia: Incidencia): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.reabrirIncidencia(incidencia.id, this.devoluciones[incidencia.id]).pipe(
      switchMap(updated => {
        const files = this.returnFiles[incidencia.id] || [];
        const eventoId = this.lastEventoId(updated);
        if (!files.length || !eventoId) return of(updated);
        return forkJoin(files.map(file => this.secretariaService.subirAdjunto('incidencia_evento', eventoId, file))).pipe(
          switchMap(() => of(updated))
        );
      })
    ).subscribe({
      next: () => {
        this.devoluciones[incidencia.id] = '';
        this.returnFiles[incidencia.id] = [];
        this.loading = false;
        this.cargar();
      },
      error: () => this.fail('No se ha podido devolver la incidencia a la asociación.')
    });
  }

  labelEvento(tipo: string): string {
    const labels: Record<string, string> = {
      creada: 'Incidencia creada',
      respuesta_asociacion: 'Respuesta de asociacion',
      comentario_administracion: 'Comentario de administracion',
      devuelta_admin: 'Devuelta por administracion',
      subsanada: 'Subsanada',
      cerrada: 'Cerrada'
    };
    return labels[tipo] || tipo;
  }

  labelActor(actor: string): string {
    return actor === 'administracion' ? 'Administracion' : actor === 'asociacion' ? 'Asociacion' : 'Sistema';
  }

  private cargar(): void {
    if (!this.scope || !this.scopeId) return;
    this.secretariaService.getIncidencias(this.scope, String(this.scopeId)).subscribe({
      next: response => {
        this.incidencias = response.incidencias;
      },
      error: () => {
        this.incidencias = [];
        this.error = 'No se han podido cargar las incidencias.';
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

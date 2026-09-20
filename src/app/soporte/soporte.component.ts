import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subscription, switchMap } from 'rxjs';
import { FfsjSpinnerComponent } from 'ffsj-web-components';
import { EjercicioService } from '../core/ejercicio.service';
import { DashboardSummaryService } from '../core/dashboard-summary.service';
import { AdjuntoSecretaria, SoporteCategoria, SoporteIncidencia } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';
import { AdjuntosSelectorComponent } from '../shared/adjuntos-selector.component';
import { buildFormDiagnostics, FormDiagnosticFieldMeta } from '../rubi/form-diagnostics.util';
import { RubiFormDiagnostics } from '../rubi/rubi-api.service';
import { RubiScreenContextService } from '../rubi/rubi-screen-context.service';

function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

function trimmedLength(minimum: number, maximum: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = String(control.value ?? '').trim().length;
    if (!length) return null;
    if (length < minimum) return { minlength: { requiredLength: minimum, actualLength: length } };
    if (length > maximum) return { maxlength: { requiredLength: maximum, actualLength: length } };
    return null;
  };
}

@Component({ selector: 'app-soporte', standalone: true, imports: [CommonModule, ReactiveFormsModule, FormsModule, AdjuntosSelectorComponent, FfsjSpinnerComponent], templateUrl: './soporte.component.html', styleUrls: ['./soporte.component.scss'] })
export class SoporteComponent implements OnInit, OnDestroy {
  categorias: SoporteCategoria[] = [];
  incidencias: SoporteIncidencia[] = [];
  detalle: SoporteIncidencia | null = null;
  loading = true;
  sending = false;
  submitted = false;
  error = '';
  success = '';
  respuesta = '';
  adjuntos: File[] = [];
  private ticketDeNavegacionAbierto = false;
  private formDiagnosticsSub?: Subscription;
  readonly maxAdjuntoBytes = 10 * 1024 * 1024;
  readonly form = this.fb.group({
    categoria: ['', Validators.required],
    asunto: ['', [trimmedRequired, trimmedLength(3, 180)]],
    descripcion: ['', [trimmedRequired, trimmedLength(10, 5000)]]
  });

  constructor(private readonly fb: FormBuilder, private readonly secretaria: SecretariaService, private readonly router: Router, private readonly route: ActivatedRoute, private readonly ejercicios: EjercicioService, private readonly dashboardSummary: DashboardSummaryService, private readonly rubiScreenContext: RubiScreenContextService) {}

  ngOnInit(): void {
    this.formDiagnosticsSub = this.form.valueChanges.subscribe(() => this.syncRubiScreenContext());
    this.syncRubiScreenContext();
    this.load();
  }

  ngOnDestroy(): void {
    this.formDiagnosticsSub?.unsubscribe();
    this.rubiScreenContext.clear('soporte');
  }

  load(): void {
    this.loading = true; this.error = '';
    this.secretaria.getSoporteCategorias().subscribe({ next: response => { this.categorias = response.categorias; this.loadIncidencias(); }, error: () => this.fail('No se ha podido cargar Soporte.') });
  }

  loadIncidencias(): void {
    this.secretaria.getSoporteIncidencias().subscribe({ next: response => { this.incidencias = response.incidencias; this.loading = false; this.syncRubiScreenContext(); const ticket = Number(this.route.snapshot.queryParamMap.get('ticket')); if (ticket && !this.ticketDeNavegacionAbierto && response.incidencias.some(item => item.id === ticket)) { this.ticketDeNavegacionAbierto = true; this.verDetalle(ticket); } }, error: () => this.fail('No se han podido cargar tus incidencias.') });
  }

  // G (form-diagnostics, formulario normal): unico punto que publica el
  // contexto de Rubi para Soporte. El formulario de nueva incidencia solo
  // esta realmente visible cuando no se esta cargando y no se esta viendo el
  // detalle de un ticket existente (misma condicion que oculta el formulario
  // en la plantilla).
  private syncRubiScreenContext(): void {
    const diagnostics = this.currentFormDiagnostics();
    this.rubiScreenContext.set({
      version: 1, module: 'soporte', view: 'soporte',
      ...(diagnostics ? { state: { formDiagnostics: diagnostics } } : {})
    });
  }

  private currentFormDiagnostics(): RubiFormDiagnostics | undefined {
    if (this.loading || this.detalle) return undefined;
    const fieldMeta: Record<string, FormDiagnosticFieldMeta> = {
      categoria: { label: 'Categoría' }, asunto: { label: 'Asunto' }, descripcion: { label: 'Descripción' }
    };
    return buildFormDiagnostics(this.form, { submitted: this.submitted, fieldMeta });
  }

  enviar(): void {
    this.submitted = true;
    this.syncRubiScreenContext();
    if (this.form.invalid || this.sending) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending = true; this.error = ''; this.success = '';
    this.secretaria.crearSoporteIncidencia({ ...this.form.getRawValue() as { categoria: string; asunto: string; descripcion: string }, ejercicio: this.ejercicios.selectedEjercicio, ruta: this.router.url, userAgent: navigator.userAgent }).pipe(switchMap(response => {
      const initial = response.incidencia.eventos?.find(evento => evento.tipo === 'CREADA');
      return initial && this.adjuntos.length ? forkJoin(this.adjuntos.map(file => this.secretaria.subirAdjuntoSoporte(response.incidencia.id, initial.id, file))).pipe(switchMap(() => this.secretaria.getSoporteIncidencia(response.incidencia.id))) : of(response);
    })).subscribe({
      next: response => {
        this.incidencias = [response.incidencia, ...this.incidencias];
        this.form.reset(); this.adjuntos = []; this.submitted = false; this.sending = false;
        this.syncRubiScreenContext();
        this.success = `Incidencia #${response.incidencia.id} creada correctamente.`;
      },
      error: (response: HttpErrorResponse) => {
        this.sending = false;
        this.error = response.error?.message || 'No se ha podido enviar la incidencia. Inténtalo de nuevo.';
      }
    });
  }

  isInvalid(controlName: 'categoria' | 'asunto' | 'descripcion'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted);
  }

  verDetalle(id: number): void { this.secretaria.getSoporteIncidencia(id).subscribe({ next: response => { this.detalle = response.incidencia; this.syncRubiScreenContext(); this.secretaria.marcarSoporteLeido(id).subscribe({ next: () => { this.loadIncidencias(); this.dashboardSummary.refreshAssociation(); } }); }, error: () => this.error = 'No se ha podido cargar el detalle de la incidencia.' }); }
  marcarDetalleNoLeido(): void { if (!this.detalle || this.sending) return; this.sending = true; this.secretaria.marcarSoporteNoLeido(this.detalle.id).subscribe({ next: () => { this.sending = false; this.success = 'Incidencia marcada como no leida.'; this.loadIncidencias(); this.dashboardSummary.refreshAssociation(); }, error: () => { this.sending = false; this.error = 'No se ha podido marcar la incidencia como no leida.'; } }); }
  responder(): void { if (!this.detalle || !this.respuesta.trim() || this.sending) return; this.sending = true; this.secretaria.responderSoporteIncidencia(this.detalle.id, { mensaje: this.respuesta.trim() }).pipe(switchMap(response => { const message = response.incidencia.eventos?.at(-1); return message && this.adjuntos.length ? forkJoin(this.adjuntos.map(file => this.secretaria.subirAdjuntoSoporte(response.incidencia.id, message.id, file))).pipe(switchMap(() => this.secretaria.getSoporteIncidencia(response.incidencia.id))) : of(response); })).subscribe({ next: response => { this.detalle = response.incidencia; this.incidencias = this.incidencias.map(item => item.id === response.incidencia.id ? { ...item, ...response.incidencia } : item); this.respuesta = ''; this.adjuntos = []; this.sending = false; this.dashboardSummary.refreshAssociation(); }, error: response => { this.sending = false; this.error = response.error?.message || 'No se ha podido enviar la respuesta.'; } }); }
  seleccionarAdjuntos(event: Event): void { const files = Array.from((event.target as HTMLInputElement).files || []); const invalid = files.find(file => !['image/png','image/jpeg','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type) || file.size > this.maxAdjuntoBytes); if (invalid) { this.error = 'Solo se admiten PNG, JPG, PDF, TXT, DOC, DOCX, XLS y XLSX de hasta 10 MB.'; return; } if (this.adjuntos.length + files.length > 5) { this.error = 'Puedes adjuntar un máximo de 5 archivos por mensaje.'; return; } this.adjuntos = [...this.adjuntos, ...files]; }
  quitarAdjunto(index: number): void { this.adjuntos = this.adjuntos.filter((_, current) => current !== index); }
  abrirAdjunto(adjunto: AdjuntoSecretaria): void { this.secretaria.descargarAdjuntoSoporte(adjunto.id).subscribe({ next: blob => { const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); }, error: () => this.error = 'No se ha podido abrir el adjunto.' }); }
  puedeResponder(): boolean { return Boolean(this.detalle && !['RESUELTA', 'CERRADA'].includes(this.detalle.estado)); }
  cerrarDetalle(): void { this.detalle = null; this.syncRubiScreenContext(); }
  estadoLabel(estado: string): string { return ({ ABIERTA: 'Abierta', EN_PROCESO: 'En proceso', ESPERANDO_RESPUESTA_USUARIO: 'Esperando respuesta del usuario', RESUELTA: 'Resuelta', CERRADA: 'Cerrada' } as Record<string, string>)[estado] || estado; }
  private fail(message: string): void { this.loading = false; this.error = message; }
}

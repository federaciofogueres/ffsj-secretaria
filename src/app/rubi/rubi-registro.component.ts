import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize, forkJoin } from 'rxjs';

import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { RegistroDestinatario } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { AdjuntosSelectorComponent } from '../shared/adjuntos-selector.component';
import { TranslatePipe } from '../shared/translate.pipe';
import { buildFormDiagnostics, FormDiagnosticFieldMeta } from './form-diagnostics.util';
import { RegistroAsistidoResultado, RegistroAsistidoPreparacion, RubiApiService, RubiFormDiagnosticIssue, RubiFormDiagnostics } from './rubi-api.service';

const FIELD_LABEL_KEYS: Record<string, string> = {
  destinatarioId: 'rubi.registro.step.destinatario', titulo: 'rubi.registro.field.titulo', mensaje: 'rubi.registro.field.mensaje'
};

// Unicos codigos de backend con valor "de formulario" (adjunto o destinatario
// invalidos); el resto (permisos, caducidad) no es corregible en el formulario.
const SERVER_DIAGNOSTIC_CODES = new Set(['REGISTRO_DESTINATARIO_NO_VALIDO', 'REGISTRO_ADJUNTO_NO_VALIDO', 'REGISTRO_ADJUNTO_REQUERIDO']);

@Component({
  selector: 'app-rubi-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdjuntosSelectorComponent, TranslatePipe],
  templateUrl: './rubi-registro.component.html',
  styleUrls: ['./rubi-alta.component.scss', './rubi-registro.component.scss']
})
export class RubiRegistroComponent implements OnInit, OnDestroy {
  @Input() tipo: 'documentacion' | 'comunicacion' = 'documentacion';
  @Output() closed = new EventEmitter<'cancelled' | 'expired'>();
  @Output() openNormalFlow = new EventEmitter<void>();
  @Output() preparationStateChanged = new EventEmitter<boolean>();

  readonly form = this.fb.group({
    destinatarioId: [null as number | null, Validators.required],
    titulo: ['', [Validators.required, Validators.maxLength(255)]],
    mensaje: ['', [Validators.required, Validators.minLength(10)]]
  });

  destinatarios: RegistroDestinatario[] = [];
  adjuntos: File[] = [];
  prepared: RegistroAsistidoPreparacion | null = null;
  confirmed: RegistroAsistidoResultado | null = null;
  pendingUploads: File[] = [];
  uploading = false;
  loading = true;
  confirming = false;
  submitted = false;
  confirmationAccepted = false;
  errorKey = '';
  exerciseBlocked = false;
  private lastServerIssue: RubiFormDiagnosticIssue | null = null;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private readonly discarded = new Set<string>();
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: RubiApiService,
    private readonly secretaria: SecretariaService,
    private readonly permissions: PermissionsService,
    private readonly ejercicios: EjercicioService,
    readonly i18n: I18nService
  ) {}

  get requiereAdjunto(): boolean { return this.tipo === 'documentacion'; }

  ngOnInit(): void {
    const context = this.permissions.contextSnapshot;
    if (!this.permissions.hasPermission('registro:write') || !context?.asociacionId) {
      this.errorKey = 'rubi.registro.error.permission'; this.loading = false; return;
    }
    // La comunicacion, igual que en el Registro real, no permite enviarse mientras se
    // consulta un ejercicio historico no activo. La documentacion no exige ejercicio.
    if (this.tipo === 'comunicacion' && !this.ejercicios.isSelectedActive) {
      this.exerciseBlocked = true;
    }
    this.subscriptions.add(this.secretaria.getRegistroDestinatarios().subscribe({
      next: response => { this.destinatarios = response.destinatarios; this.loading = false; },
      error: () => { this.errorKey = 'rubi.registro.error.options'; this.loading = false; }
    }));
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); this.discardPrepared(); this.clearTimer(); }

  controlInvalid(name: keyof typeof this.form.controls): boolean { const control = this.form.controls[name]; return control.invalid && (control.touched || this.submitted); }

  get canSubmit(): boolean {
    return this.form.valid && !this.exerciseBlocked && (!this.requiereAdjunto || this.adjuntos.length > 0);
  }

  // G (form-diagnostics): unico punto de lectura para Rubi; nunca expone
  // `form.value` ni los ficheros adjuntos, solo metadatos de validacion.
  // Incluye, ademas de los errores de Angular, las dos condiciones de negocio
  // que tambien bloquean el envio sin ser errores de un FormControl: falta de
  // adjunto obligatorio y ejercicio no activo (comunicacion).
  formDiagnostics(): RubiFormDiagnostics {
    const fieldMeta: Record<string, FormDiagnosticFieldMeta> = {};
    Object.entries(FIELD_LABEL_KEYS).forEach(([field, key]) => fieldMeta[field] = { label: this.i18n.t(key) });
    const extraIssues: RubiFormDiagnosticIssue[] = [];
    if (this.requiereAdjunto && !this.adjuntos.length) extraIssues.push({ code: 'REGISTRO_ADJUNTO_REQUERIDO', source: 'client' });
    if (this.exerciseBlocked) extraIssues.push({ code: 'REGISTRO_EJERCICIO_NO_ACTIVO', source: 'client' });
    if (this.lastServerIssue) extraIssues.push(this.lastServerIssue);
    return buildFormDiagnostics(this.form, { submitted: this.submitted, fieldMeta, extraIssues });
  }

  private diagnosticIssueFor(error: unknown): RubiFormDiagnosticIssue | null {
    if (!(error instanceof HttpErrorResponse)) return null;
    const code = String(error.error?.details?.code || '');
    return SERVER_DIAGNOSTIC_CODES.has(code) ? { code, source: 'server' } : null;
  }

  prepare(): void {
    this.submitted = true; this.errorKey = ''; this.lastServerIssue = null;
    if (!this.canSubmit) { this.form.markAllAsTouched(); this.errorKey = 'rubi.registro.error.form'; return; }
    const { destinatarioId, titulo, mensaje } = this.form.getRawValue();
    this.loading = true;
    const metadatos = this.adjuntos.map(file => ({ fileName: file.name, mimeType: file.type, size: file.size }));
    this.subscriptions.add(this.api.prepararRegistro(this.tipo, Number(destinatarioId), titulo!.trim(), mensaje!.trim(), metadatos)
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: result => {
          this.prepared = result; this.confirmationAccepted = false;
          if (result.confirmacion) { this.preparationStateChanged.emit(true); this.scheduleExpiry(result.confirmacion.expiraAt); }
        },
        error: error => { this.errorKey = this.errorFor(error); this.lastServerIssue = this.diagnosticIssueFor(error); }
      }));
  }

  edit(): void { this.discardPrepared(); this.prepared = null; this.lastServerIssue = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false); }
  cancel(): void { this.discardPrepared(); this.clearSensitive(); this.closed.emit('cancelled'); }
  continueInNormalFlow(): void { this.discardPrepared(); this.clearSensitive(); this.openNormalFlow.emit(); }

  confirm(): void {
    const confirmation = this.prepared?.confirmacion;
    if (!confirmation?.confirmacionHumanaHabilitada || !this.confirmationAccepted || this.confirming) return;
    this.confirming = true; this.errorKey = '';
    this.subscriptions.add(this.api.confirmarRegistro(confirmation.referencia).pipe(finalize(() => this.confirming = false)).subscribe({
      next: result => {
        this.confirmed = result; this.prepared = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false);
        this.uploadAttachments(result.registroId, this.adjuntos);
      },
      error: error => { this.errorKey = this.errorFor(error); this.confirmationAccepted = false; }
    }));
  }

  retryUploads(): void {
    if (!this.confirmed) return;
    this.uploadAttachments(this.confirmed.registroId, this.pendingUploads);
  }

  // El registro ya existe (creado por Rubi vía preparar/confirmar); los adjuntos se
  // suben aparte, tras la confirmación, contra ese id ya real, exactamente igual que
  // en el Registro normal (Angular -> API directo, nunca a través de Gemini). Si
  // alguno falla, el registro ya creado no se pierde ni se duplica: solo se ofrece
  // reintentar los ficheros pendientes.
  private uploadAttachments(registroId: number, files: File[]): void {
    if (!files.length) { this.pendingUploads = []; return; }
    this.uploading = true;
    this.subscriptions.add(forkJoin(files.map(file => this.secretaria.subirAdjunto('registro', registroId, file)))
      .pipe(finalize(() => this.uploading = false))
      .subscribe({
        next: () => { this.pendingUploads = []; },
        error: () => { this.pendingUploads = files; this.errorKey = 'rubi.registro.error.uploadFailed'; }
      }));
  }

  private errorFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'rubi.registro.error.prepare';
    const code = String(error.error?.details?.code || '');
    if (error.status === 401 || error.status === 403) return code === 'RUBI_TRANSACTIONAL_DISABLED' ? 'rubi.registro.error.transactionDisabled' : 'rubi.registro.error.permission';
    if (code === 'REGISTRO_DESTINATARIO_NO_VALIDO') return 'rubi.registro.error.destinatario';
    if (code === 'REGISTRO_ADJUNTO_REQUERIDO' || code === 'REGISTRO_ADJUNTO_NO_VALIDO') return 'rubi.registro.error.adjunto';
    if (code.includes('CONFIRMACION_')) return 'rubi.registro.error.expired';
    if (code === 'REGISTRO_PREPARACION_CAMBIADA') return 'rubi.registro.error.contextChanged';
    return error.status === 400 ? 'rubi.registro.error.form' : 'rubi.registro.error.prepare';
  }

  private scheduleExpiry(value: string): void {
    this.clearTimer();
    this.expiryTimer = setTimeout(() => { this.prepared = null; this.clearSensitive(); this.closed.emit('expired'); }, Math.max(0, new Date(value).getTime() - Date.now()));
  }
  private discardPrepared(): void {
    const reference = this.prepared?.confirmacion?.referencia;
    if (!reference || this.discarded.has(reference)) return;
    this.discarded.add(reference); this.api.cancelarPreparacionRegistro(reference).subscribe({ error: () => undefined });
  }
  private clearSensitive(): void { this.form.reset(); this.adjuntos = []; this.prepared = null; this.lastServerIssue = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false); }
  private clearTimer(): void { if (this.expiryTimer) clearTimeout(this.expiryTimer); this.expiryTimer = undefined; }
}

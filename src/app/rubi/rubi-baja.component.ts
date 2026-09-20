import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { Asociado } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { TranslatePipe } from '../shared/translate.pipe';
import { buildFormDiagnostics, FormDiagnosticFieldMeta } from './form-diagnostics.util';
import { BajaConfirmacionResultado, BajaPreparacion, RubiApiService, RubiFormDiagnosticIssue, RubiFormDiagnostics } from './rubi-api.service';

const FIELD_LABEL_KEYS: Record<string, string> = {
  asociadoId: 'rubi.baja.select.title', motivo: 'rubi.baja.field.motivo'
};

const SERVER_DIAGNOSTIC_CODES = new Set(['BAJA_PERSONA_NO_DISPONIBLE']);

@Component({
  selector: 'app-rubi-baja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './rubi-baja.component.html',
  styleUrls: ['./rubi-alta.component.scss', './rubi-baja.component.scss']
})
export class RubiBajaComponent implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<'cancelled' | 'expired'>();
  @Output() openNormalFlow = new EventEmitter<void>();
  @Output() preparationStateChanged = new EventEmitter<boolean>();

  readonly form = this.fb.group({
    asociadoId: [null as number | null, Validators.required],
    motivo: ['', Validators.maxLength(250)]
  });

  personas: Asociado[] = [];
  selected: Asociado | null = null;
  prepared: BajaPreparacion | null = null;
  confirmed: BajaConfirmacionResultado | null = null;
  loading = true;
  confirming = false;
  submitted = false;
  confirmationAccepted = false;
  errorKey = '';
  private lastServerIssue: RubiFormDiagnosticIssue | null = null;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private readonly discarded = new Set<string>();
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: RubiApiService,
    private readonly censo: CensoService,
    private readonly permissions: PermissionsService,
    private readonly ejercicios: EjercicioService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    const context = this.permissions.contextSnapshot;
    const exercise = this.ejercicios.selectedSnapshot;
    if (!this.permissions.hasPermission('solicitudes:write') || !context?.asociacionId) {
      this.errorKey = 'rubi.baja.error.permission'; this.loading = false; return;
    }
    if (!exercise?.id || !exercise.activo || exercise.estadoAsociacion !== 'INICIADO') {
      this.errorKey = 'rubi.baja.error.exercise'; this.loading = false; return;
    }
    const associationId = Number(context.asociacionId);
    const exerciseId = Number(exercise.id);
    this.subscriptions.add(this.censo.getAsociadosByAsociacion(associationId, exercise.ejercicio).subscribe({
      next: personas => { this.personas = personas.filter(persona => persona.estado !== 'baja'); this.loading = false; },
      error: () => { this.errorKey = 'rubi.baja.error.options'; this.loading = false; }
    }));
    this.subscriptions.add(this.permissions.contextChanges.subscribe(value => {
      if (this.prepared && Number(value?.asociacionId || 0) !== associationId) this.invalidate();
    }));
    this.subscriptions.add(this.ejercicios.selectedChanges.subscribe(value => {
      if (this.prepared && Number(value?.id || 0) !== exerciseId) this.invalidate();
    }));
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); this.discardPrepared(); this.clearTimer(); this.clearSensitive(); }

  selectPerson(): void {
    this.selected = this.personas.find(item => item.id === Number(this.form.value.asociadoId)) || null;
  }

  controlInvalid(name: keyof typeof this.form.controls): boolean { const control = this.form.controls[name]; return control.invalid && (control.touched || this.submitted); }

  // G (form-diagnostics): unico punto de lectura para Rubi; nunca expone
  // `form.value`, solo metadatos de validacion ya calculados por Angular.
  formDiagnostics(): RubiFormDiagnostics {
    const fieldMeta: Record<string, FormDiagnosticFieldMeta> = {};
    Object.entries(FIELD_LABEL_KEYS).forEach(([field, key]) => fieldMeta[field] = { label: this.i18n.t(key) });
    return buildFormDiagnostics(this.form, {
      submitted: this.submitted,
      fieldMeta,
      extraIssues: this.lastServerIssue ? [this.lastServerIssue] : []
    });
  }

  private diagnosticIssueFor(error: unknown): RubiFormDiagnosticIssue | null {
    if (!(error instanceof HttpErrorResponse)) return null;
    const code = String(error.error?.details?.code || '');
    return SERVER_DIAGNOSTIC_CODES.has(code) ? { code, source: 'server' } : null;
  }

  prepare(): void {
    this.submitted = true; this.errorKey = ''; this.lastServerIssue = null;
    const exercise = this.ejercicios.selectedSnapshot;
    if (!this.selected || this.form.invalid || !exercise?.id) {
      this.form.markAllAsTouched(); this.errorKey = 'rubi.baja.error.form'; return;
    }
    const motivo = this.form.getRawValue().motivo?.trim() || undefined;
    this.loading = true;
    this.subscriptions.add(this.api.prepararBaja(exercise.id, this.selected.id, motivo).pipe(finalize(() => this.loading = false)).subscribe({
      next: result => {
        this.prepared = result; this.confirmationAccepted = false;
        if (result.confirmacion) { this.preparationStateChanged.emit(true); this.scheduleExpiry(result.confirmacion.expiraAt); }
      }, error: error => { this.errorKey = this.errorFor(error); this.lastServerIssue = this.diagnosticIssueFor(error); }
    }));
  }

  edit(): void { this.discardPrepared(); this.prepared = null; this.lastServerIssue = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false); }
  cancel(): void { this.discardPrepared(); this.clearSensitive(); this.closed.emit('cancelled'); }
  continueInNormalFlow(): void { this.discardPrepared(); this.clearSensitive(); this.openNormalFlow.emit(); }

  confirm(): void {
    const confirmation = this.prepared?.confirmacion;
    if (!confirmation?.confirmacionHumanaHabilitada || !this.confirmationAccepted || this.confirming) return;
    this.confirming = true; this.errorKey = '';
    this.subscriptions.add(this.api.confirmarBaja(confirmation.referencia).pipe(finalize(() => this.confirming = false)).subscribe({
      next: result => { this.confirmed = result; this.prepared = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false); },
      error: error => { this.errorKey = this.errorFor(error); this.confirmationAccepted = false; }
    }));
  }

  private errorFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'rubi.baja.error.prepare';
    const code = String(error.error?.details?.code || '');
    if (error.status === 401 || error.status === 403) return code === 'RUBI_TRANSACTIONAL_DISABLED' ? 'rubi.baja.error.transactionDisabled' : 'rubi.baja.error.permission';
    if (code === 'BAJA_DUPLICADA') return 'rubi.baja.error.duplicate';
    if (code === 'BAJA_PERSONA_NO_DISPONIBLE') return 'rubi.baja.error.person';
    if (code.includes('CONFIRMACION_')) return 'rubi.baja.error.expired';
    if (code === 'BAJA_PREPARACION_CAMBIADA') return 'rubi.baja.error.contextChanged';
    return error.status === 400 ? 'rubi.baja.error.form' : 'rubi.baja.error.prepare';
  }

  private scheduleExpiry(value: string): void {
    this.clearTimer();
    this.expiryTimer = setTimeout(() => { this.prepared = null; this.clearSensitive(); this.closed.emit('expired'); }, Math.max(0, new Date(value).getTime() - Date.now()));
  }
  private discardPrepared(): void {
    const reference = this.prepared?.confirmacion?.referencia;
    if (!reference || this.discarded.has(reference)) return;
    this.discarded.add(reference); this.api.cancelarPreparacionBaja(reference).subscribe({ error: () => undefined });
  }
  private invalidate(): void { this.discardPrepared(); this.prepared = null; this.lastServerIssue = null; this.clearTimer(); this.errorKey = 'rubi.baja.error.contextChanged'; this.preparationStateChanged.emit(false); }
  private clearSensitive(): void { this.form.reset(); this.selected = null; this.prepared = null; this.lastServerIssue = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false); }
  private clearTimer(): void { if (this.expiryTimer) clearTimeout(this.expiryTimer); this.expiryTimer = undefined; }
}

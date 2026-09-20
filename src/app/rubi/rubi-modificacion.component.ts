import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize, forkJoin } from 'rxjs';

import { ALTA_TELEFONO_PATTERN, fechaNacimientoValidator, identificacionValidator, normalizarIdentificacion } from '../asociados/alta-form.utils';
import { CensoService } from '../core/censo.service';
import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { Asociado, CargoCupoSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { TranslatePipe } from '../shared/translate.pipe';
import { buildFormDiagnostics, FormDiagnosticFieldMeta } from './form-diagnostics.util';
import { ModificacionConfirmacionResultado, ModificacionPreparacion, RubiApiService, RubiFormDiagnosticIssue, RubiFormDiagnostics } from './rubi-api.service';

const FIELD_LABEL_KEYS: Record<string, string> = {
  asociadoId: 'rubi.mod.select.title', identificacion: 'rubi.alta.field.identification', nacimiento: 'rubi.alta.field.birthDate',
  nombre: 'rubi.alta.field.name', apellidos: 'rubi.alta.field.surnames', direccion: 'rubi.alta.field.address',
  cp: 'rubi.alta.field.postcode', telefono: 'rubi.alta.field.phone', email: 'rubi.alta.field.email'
};

// Unicos codigos de backend con valor "de formulario": persona ya no
// disponible o sin cambios reales detectados server-side (el resto - permisos,
// caducidad, duplicados - no es informacion corregible en el propio formulario).
const SERVER_DIAGNOSTIC_CODES = new Set(['MODIFICACION_PERSONA_NO_DISPONIBLE', 'MODIFICACION_SIN_CAMBIOS']);

@Component({
  selector: 'app-rubi-modificacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './rubi-modificacion.component.html',
  styleUrls: ['./rubi-alta.component.scss', './rubi-modificacion.component.scss']
})
export class RubiModificacionComponent implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<'cancelled' | 'expired'>();
  @Output() openNormalFlow = new EventEmitter<void>();
  @Output() preparationStateChanged = new EventEmitter<boolean>();

  readonly form = this.fb.group({
    asociadoId: [null as number | null, Validators.required],
    identificacion: ['', identificacionValidator],
    nacimiento: ['', fechaNacimientoValidator],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(150)]],
    direccion: ['', Validators.maxLength(200)],
    cp: ['', Validators.pattern(/^\d{5}$/)],
    telefono: ['', Validators.pattern(ALTA_TELEFONO_PATTERN)],
    email: ['', Validators.email]
  });

  personas: Asociado[] = [];
  cargos: CargoCupoSecretaria[] = [];
  selectedCargoIds = new Set<number>();
  selected: Asociado | null = null;
  prepared: ModificacionPreparacion | null = null;
  confirmed: ModificacionConfirmacionResultado | null = null;
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
    private readonly secretaria: SecretariaService,
    private readonly permissions: PermissionsService,
    private readonly ejercicios: EjercicioService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    const context = this.permissions.contextSnapshot;
    const exercise = this.ejercicios.selectedSnapshot;
    if (!this.permissions.hasPermission('solicitudes:write') || !context?.asociacionId) {
      this.errorKey = 'rubi.mod.error.permission'; this.loading = false; return;
    }
    if (!exercise?.id || !exercise.activo || exercise.estadoAsociacion !== 'INICIADO') {
      this.errorKey = 'rubi.mod.error.exercise'; this.loading = false; return;
    }
    const associationId = Number(context.asociacionId);
    const exerciseId = Number(exercise.id);
    this.subscriptions.add(forkJoin({
      personas: this.censo.getAsociadosByAsociacion(associationId, exercise.ejercicio),
      cargos: this.secretaria.getCargosCupos(associationId, exercise.ejercicio)
    }).subscribe({
      next: result => {
        this.personas = result.personas.filter(persona => persona.estado !== 'baja');
        this.cargos = result.cargos.cargos;
        this.loading = false;
      },
      error: () => { this.errorKey = 'rubi.mod.error.options'; this.loading = false; }
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
    if (!this.selected) return;
    const person = this.selected;
    this.form.patchValue({
      identificacion: person.dni || person.sip || '', nacimiento: person.fechaNacimiento || '',
      nombre: person.nombre, apellidos: person.apellidos, direccion: person.direccion || '',
      cp: person.codigoPostal || person.codigo_postal || person.cp || '', telefono: person.telefono || '', email: person.email || ''
    });
    this.selectedCargoIds = new Set((person.cargoIds?.length ? person.cargoIds : person.cargoId ? [person.cargoId] : []).map(Number));
  }

  toggleCargo(id: number, checked: boolean): void { checked ? this.selectedCargoIds.add(Number(id)) : this.selectedCargoIds.delete(Number(id)); }
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
    if (!this.selected || this.form.invalid || !this.selectedCargoIds.size || !exercise?.id) {
      this.form.markAllAsTouched(); this.errorKey = 'rubi.mod.error.form'; return;
    }
    const value = this.form.getRawValue();
    const proposed: Record<string, unknown> = {
      nif: normalizarIdentificacion(value.identificacion), nacimiento: value.nacimiento, nombre: value.nombre?.trim(),
      apellidos: value.apellidos?.trim(), direccion: value.direccion?.trim(), cp: value.cp?.trim(),
      telefono: value.telefono?.trim(), email: value.email?.trim(), cargoIds: [...this.selectedCargoIds].sort((a, b) => a - b)
    };
    const original: Record<string, unknown> = {
      nif: normalizarIdentificacion(this.selected.dni || this.selected.sip || ''), nacimiento: this.selected.fechaNacimiento || '',
      nombre: this.selected.nombre, apellidos: this.selected.apellidos, direccion: this.selected.direccion || '',
      cp: this.selected.codigoPostal || this.selected.codigo_postal || this.selected.cp || '', telefono: this.selected.telefono || '',
      email: this.selected.email || '', cargoIds: (this.selected.cargoIds?.length ? this.selected.cargoIds : this.selected.cargoId ? [this.selected.cargoId] : []).map(Number).sort((a, b) => a - b)
    };
    const cambios = Object.fromEntries(Object.entries(proposed).filter(([key, next]) => JSON.stringify(next ?? '') !== JSON.stringify(original[key] ?? '')));
    if (!Object.keys(cambios).length) {
      this.errorKey = 'rubi.mod.error.noChanges';
      this.lastServerIssue = { code: 'MODIFICACION_SIN_CAMBIOS', source: 'client' };
      return;
    }
    this.loading = true;
    this.subscriptions.add(this.api.prepararModificacion(exercise.id, this.selected.id, cambios).pipe(finalize(() => this.loading = false)).subscribe({
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
    this.subscriptions.add(this.api.confirmarModificacion(confirmation.referencia).pipe(finalize(() => this.confirming = false)).subscribe({
      next: result => { this.confirmed = result; this.prepared = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false); },
      error: error => { this.errorKey = this.errorFor(error); this.confirmationAccepted = false; }
    }));
  }

  display(value: unknown): string {
    if (Array.isArray(value)) return value.map(id => this.cargos.find(cargo => Number(cargo.id) === Number(id))?.nombre || id).join(', ');
    return String(value ?? '') || '—';
  }

  private errorFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'rubi.mod.error.prepare';
    const code = String(error.error?.details?.code || '');
    if (error.status === 401 || error.status === 403) return code === 'RUBI_TRANSACTIONAL_DISABLED' ? 'rubi.mod.error.transactionDisabled' : 'rubi.mod.error.permission';
    if (code === 'MODIFICACION_DUPLICADA') return 'rubi.mod.error.duplicate';
    if (code === 'MODIFICACION_PERSONA_NO_DISPONIBLE') return 'rubi.mod.error.person';
    if (code.includes('CONFIRMACION_')) return 'rubi.mod.error.expired';
    if (code === 'MODIFICACION_PREPARACION_CAMBIADA') return 'rubi.mod.error.contextChanged';
    return error.status === 400 ? 'rubi.mod.error.form' : 'rubi.mod.error.prepare';
  }

  private scheduleExpiry(value: string): void {
    this.clearTimer();
    this.expiryTimer = setTimeout(() => { this.prepared = null; this.clearSensitive(); this.closed.emit('expired'); }, Math.max(0, new Date(value).getTime() - Date.now()));
  }
  private discardPrepared(): void {
    const reference = this.prepared?.confirmacion?.referencia;
    if (!reference || this.discarded.has(reference)) return;
    this.discarded.add(reference); this.api.cancelarPreparacionModificacion(reference).subscribe({ error: () => undefined });
  }
  private invalidate(): void { this.discardPrepared(); this.prepared = null; this.lastServerIssue = null; this.clearTimer(); this.errorKey = 'rubi.mod.error.contextChanged'; this.preparationStateChanged.emit(false); }
  private clearSensitive(): void { this.form.reset(); this.selected = null; this.selectedCargoIds.clear(); this.prepared = null; this.lastServerIssue = null; this.confirmationAccepted = false; this.clearTimer(); this.preparationStateChanged.emit(false); }
  private clearTimer(): void { if (this.expiryTimer) clearTimeout(this.expiryTimer); this.expiryTimer = undefined; }
}

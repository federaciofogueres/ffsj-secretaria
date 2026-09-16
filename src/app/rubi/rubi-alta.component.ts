import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';

import {
  ALTA_TELEFONO_PATTERN,
  esMenorDeEdad,
  fechaNacimientoValidator,
  identificacionValidator,
  normalizarIdentificacion
} from '../asociados/alta-form.utils';
import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { CargoCupoSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { TranslatePipe } from '../shared/translate.pipe';
import { AltaPreparacion, RubiApiService } from './rubi-api.service';

@Component({
  selector: 'app-rubi-alta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './rubi-alta.component.html',
  styleUrls: ['./rubi-alta.component.scss']
})
export class RubiAltaComponent implements OnInit, OnDestroy {
  @ViewChild('identificationInput') private identificationInput?: ElementRef<HTMLInputElement>;
  @Output() closed = new EventEmitter<'cancelled' | 'expired'>();
  @Output() openNormalFlow = new EventEmitter<void>();

  readonly form = this.fb.group({
    tipo: ['Hoguera adulta', Validators.required],
    identificacion: ['', identificacionValidator],
    nacimiento: ['', [Validators.required, fechaNacimientoValidator]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(150)]],
    direccion: ['', Validators.maxLength(200)],
    cp: ['', Validators.pattern(/^\d{5}$/)],
    localidad: ['', Validators.maxLength(100)],
    provincia: ['', Validators.maxLength(100)],
    telefono: ['', Validators.pattern(ALTA_TELEFONO_PATTERN)],
    email: ['', Validators.email],
    representante1Nombre: [''],
    representante1Telefono: [''],
    representante2Nombre: [''],
    representante2Telefono: ['']
  });

  cargos: CargoCupoSecretaria[] = [];
  selectedCargoIds = new Set<number>();
  loading = false;
  loadingOptions = true;
  unavailable = false;
  submitted = false;
  errorKey = '';
  prepared: AltaPreparacion | null = null;
  expired = false;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private readonly discardedReferences = new Set<string>();
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: RubiApiService,
    private readonly secretaria: SecretariaService,
    private readonly permissions: PermissionsService,
    private readonly ejercicios: EjercicioService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    const context = this.permissions.contextSnapshot;
    const exercise = this.ejercicios.selectedSnapshot;
    if (!this.permissions.hasPermission('solicitudes:write')) {
      this.errorKey = 'rubi.alta.error.permission';
      this.unavailable = true;
      this.loadingOptions = false;
      return;
    }
    if (!context?.asociacionId || !exercise?.id || !exercise.activo || exercise.estadoAsociacion !== 'INICIADO') {
      this.errorKey = 'rubi.alta.error.exercise';
      this.unavailable = true;
      this.loadingOptions = false;
      return;
    }
    this.subscriptions.add(this.secretaria.getCargosCupos(context.asociacionId, exercise.ejercicio).subscribe({
      next: response => {
        this.cargos = response.cargos;
        this.loadingOptions = false;
        this.selectDefaultCargo();
        this.focusFirstControl();
      },
      error: () => {
        this.loadingOptions = false;
        this.errorKey = 'rubi.alta.error.options';
        this.unavailable = true;
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearExpiryTimer();
    this.discardPrepared();
    this.clearSensitiveState();
  }

  get isMinor(): boolean { return esMenorDeEdad(this.form.value.nacimiento); }

  get filteredCargos(): CargoCupoSecretaria[] {
    const infantil = this.form.value.tipo === 'Hoguera infantil';
    return this.cargos.filter(cargo => Boolean(cargo.esInfantil) === infantil);
  }

  controlInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted);
  }

  onTypeChanged(): void {
    this.selectedCargoIds.clear();
    this.selectDefaultCargo();
  }

  toggleCargo(cargoId: number, checked: boolean): void {
    checked ? this.selectedCargoIds.add(Number(cargoId)) : this.selectedCargoIds.delete(Number(cargoId));
  }

  prepare(): void {
    this.submitted = true;
    this.errorKey = '';
    this.focusFirstControl();
    if (this.form.invalid || !this.selectedCargoIds.size) {
      this.form.markAllAsTouched();
      this.errorKey = 'rubi.alta.error.form';
      return;
    }
    if (this.isMinor && !this.validPrimaryRepresentative()) {
      this.errorKey = 'rubi.alta.error.representative';
      return;
    }
    const exercise = this.ejercicios.selectedSnapshot;
    if (!exercise?.id || !exercise.activo || exercise.estadoAsociacion !== 'INICIADO') {
      this.errorKey = 'rubi.alta.error.contextChanged';
      return;
    }

    const cargoIds = [...this.selectedCargoIds];
    const selected = cargoIds.map(id => this.cargos.find(cargo => Number(cargo.id) === id)).filter(Boolean) as CargoCupoSecretaria[];
    const value = this.form.getRawValue();
    const datos: Record<string, unknown> = {
      tipo: value.tipo,
      tipoHoguera: value.tipo,
      identificacion: normalizarIdentificacion(value.identificacion),
      nif: normalizarIdentificacion(value.identificacion),
      dni: '',
      sip: '',
      nacimiento: value.nacimiento,
      nombre: value.nombre?.trim(),
      apellidos: value.apellidos?.trim(),
      direccion: value.direccion?.trim(),
      cp: value.cp?.trim(),
      localidad: value.localidad?.trim(),
      provincia: value.provincia?.trim(),
      telefono: value.telefono?.trim(),
      email: value.email?.trim(),
      cargoId: cargoIds[0],
      cargoIds,
      cargoNombre: selected[0]?.nombre || '',
      cargoNombres: selected.map(cargo => cargo.nombre)
    };
    if (this.isMinor) {
      datos['representantesLegales'] = [
        { nombre: value.representante1Nombre?.trim(), telefono: value.representante1Telefono?.trim() },
        { nombre: value.representante2Nombre?.trim(), telefono: value.representante2Telefono?.trim() }
      ].filter(item => item.nombre || item.telefono);
    }

    this.loading = true;
    this.subscriptions.add(this.api.prepararAlta(exercise.id, datos).pipe(finalize(() => this.loading = false)).subscribe({
      next: preparation => {
        this.prepared = preparation;
        this.submitted = false;
        if (preparation.confirmacion) this.scheduleExpiry(preparation.confirmacion.expiraAt);
      },
      error: error => this.errorKey = this.errorFor(error)
    }));
  }

  edit(): void {
    this.discardPrepared();
    this.clearExpiryTimer();
    this.prepared = null;
    this.expired = false;
    this.submitted = false;
    this.errorKey = '';
  }

  cancel(): void {
    this.discardPrepared();
    this.clearSensitiveState();
    this.closed.emit('cancelled');
  }

  continueInNormalFlow(): void {
    this.discardPrepared();
    this.clearSensitiveState();
    this.openNormalFlow.emit();
  }

  private selectDefaultCargo(): void {
    const normalizedPreferred = this.form.value.tipo === 'Hoguera infantil' ? 'asociado/a infantil' : 'asociado/a';
    const preferred = this.filteredCargos.find(cargo => cargo.nombre.trim().toLocaleLowerCase('es') === normalizedPreferred)
      || this.filteredCargos[0];
    if (preferred) this.selectedCargoIds.add(Number(preferred.id));
  }

  private validPrimaryRepresentative(): boolean {
    const name = String(this.form.value.representante1Nombre || '').trim();
    const phone = String(this.form.value.representante1Telefono || '').trim();
    return Boolean(name) && ALTA_TELEFONO_PATTERN.test(phone);
  }

  private errorFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'rubi.alta.error.prepare';
    const code = String(error.error?.details?.code || '');
    if (error.status === 401 || error.status === 403) return 'rubi.alta.error.permission';
    if (code === 'REGISTRO_ALTA_DUPLICADO' || code === 'SOLICITUD_ALTA_DUPLICADA') return 'rubi.alta.error.duplicate';
    if (code === 'ASOCIADO_YA_ACTIVO_EN_ASOCIACION') return 'rubi.alta.error.active';
    if (code === 'ALTA_REPRESENTACION_REQUERIDA') return 'rubi.alta.error.representative';
    if (code === 'ALTA_CARGO_NO_DISPONIBLE') return 'rubi.alta.error.cargo';
    if (code === 'ALTA_REQUIERE_FLUJO_NORMAL') return 'rubi.alta.error.normalFlow';
    if (code === 'CONFIRMACION_CADUCADA' || code === 'CONFIRMACION_SUSTITUIDA') return 'rubi.alta.error.expired';
    if (code === 'ALTA_EJERCICIO_NO_DISPONIBLE') return 'rubi.alta.error.exercise';
    if (code === 'ALTA_DATOS_INVALIDOS') return 'rubi.alta.error.validation';
    if (error.status === 409) return 'rubi.alta.error.contextChanged';
    if (error.status === 400) return 'rubi.alta.error.validation';
    return 'rubi.alta.error.prepare';
  }

  private scheduleExpiry(expiresAt: string): void {
    this.clearExpiryTimer();
    const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    this.expiryTimer = setTimeout(() => {
      this.discardPrepared();
      this.prepared = null;
      this.expired = true;
      this.clearSensitiveState();
      this.closed.emit('expired');
    }, delay);
  }

  private discardPrepared(): void {
    const reference = this.prepared?.confirmacion?.referencia;
    if (!reference || this.discardedReferences.has(reference)) return;
    this.discardedReferences.add(reference);
    this.api.cancelarPreparacionAlta(reference).subscribe({ error: () => undefined });
  }

  private clearSensitiveState(): void {
    this.form.reset({ tipo: 'Hoguera adulta' });
    this.selectedCargoIds.clear();
    this.prepared = null;
    this.clearExpiryTimer();
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
  }

  private focusFirstControl(): void {
    setTimeout(() => this.identificationInput?.nativeElement.focus());
  }
}

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { RubiAltaComponent } from './rubi-alta.component';
import { AltaPreparacion, RubiApiService } from './rubi-api.service';

describe('RubiAltaComponent', () => {
  let fixture: ComponentFixture<RubiAltaComponent>;
  let component: RubiAltaComponent;
  let api: jasmine.SpyObj<RubiApiService>;
  let contextChanges: BehaviorSubject<any>;
  let exerciseChanges: BehaviorSubject<any>;

  const prepared = (overrides: Partial<AltaPreparacion> = {}): AltaPreparacion => ({
    estado: 'preparada', asociacionId: 12, ejercicio: { id: 7, ejercicio: 2027 },
    persona: null, datos: {}, cargos: [{ id: 8, nombre: 'Asociado/a' }],
    antecedentes: { requiereCertificacion: false, asociacionesAnteriores: [] },
    conflictosComplejos: [], siguientePaso: 'confirmar',
    efectos: { creaSolicitud: true, escribeEnCenso: false, requiereFirma: true, requiereCertificacion: false, circuito: 'ordinario' },
    confirmacion: { referencia: 'x'.repeat(43), expiraAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), confirmacionHumanaHabilitada: true },
    ...overrides
  });

  beforeEach(async () => {
    api = jasmine.createSpyObj<RubiApiService>('RubiApiService', ['prepararAlta', 'cancelarPreparacionAlta', 'confirmarAlta']);
    api.cancelarPreparacionAlta.and.returnValue(of({ cancelada: true }));
    contextChanges = new BehaviorSubject({ asociacionId: 12 });
    exerciseChanges = new BehaviorSubject({ id: 7, ejercicio: 2027, activo: true, estadoAsociacion: 'INICIADO' });
    const secretaria = jasmine.createSpyObj<SecretariaService>('SecretariaService', ['getCargosCupos']);
    secretaria.getCargosCupos.and.returnValue(of({ cargos: [{
      id: 8, nombre: 'Asociado/a', esInfantil: false, obligatorio: false,
      modoOcupacion: 'multiple', maximo: 0, ocupados: 0, reservados: 0,
      plazasDisponibles: null, conflictos: []
    }] }));
    await TestBed.configureTestingModule({
      imports: [RubiAltaComponent],
      providers: [
        I18nService,
        { provide: RubiApiService, useValue: api },
        { provide: SecretariaService, useValue: secretaria },
        { provide: PermissionsService, useValue: {
          contextSnapshot: { asociacionId: 12 }, contextChanges: contextChanges.asObservable(),
          hasPermission: (permission: string) => permission === 'solicitudes:write'
        } },
        { provide: EjercicioService, useValue: {
          selectedSnapshot: { id: 7, ejercicio: 2027, activo: true, estadoAsociacion: 'INICIADO' },
          selectedChanges: exerciseChanges.asObservable()
        } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RubiAltaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function fillValidAdult(): void {
    component.form.patchValue({
      tipo: 'Hoguera adulta', identificacion: 'TEST1234Z', nacimiento: '1990-05-10',
      nombre: 'Persona', apellidos: 'Privada', telefono: '600111222', email: 'persona@example.invalid'
    });
  }

  it('sends personal data only to the deterministic preparation endpoint and stops at the summary', () => {
    api.prepararAlta.and.returnValue(of(prepared()));
    fillValidAdult();
    component.prepare();

    expect(api.prepararAlta).toHaveBeenCalledTimes(1);
    const [exercise, data] = api.prepararAlta.calls.mostRecent().args;
    expect(exercise).toBe(7);
    expect(data['nif']).toBe('TEST1234Z');
    expect(data['nombre']).toBe('Persona');
    expect(data['telefono']).toBe('600111222');
    expect(component.prepared?.estado).toBe('preparada');
    expect(api.confirmarAlta).not.toHaveBeenCalled();
  });

  it('requires structured legal representation for a minor', () => {
    fillValidAdult();
    component.form.patchValue({ nacimiento: '2015-05-10' });
    component.prepare();
    expect(api.prepararAlta).not.toHaveBeenCalled();
    expect(component.errorKey).toBe('rubi.alta.error.representative');
  });

  it('derives complex cargo conflicts to the normal flow without a confirmation reference', () => {
    api.prepararAlta.and.returnValue(of(prepared({
      estado: 'requiere_flujo_normal', siguientePaso: 'derivar_flujo_normal', confirmacion: undefined,
      conflictosComplejos: [{ code: 'CARGO_SIN_PLAZAS', cargoId: 8, cargoNombre: 'Presidencia' }]
    })));
    fillValidAdult();
    component.prepare();
    expect(component.prepared?.estado).toBe('requiere_flujo_normal');
    expect(api.cancelarPreparacionAlta).not.toHaveBeenCalled();
  });

  it('shows safe functional messages from backend codes and a generic technical error', () => {
    fillValidAdult();
    const cases = [
      ['ASOCIADO_YA_ACTIVO_EN_ASOCIACION', 409, 'rubi.alta.error.active'],
      ['REGISTRO_ALTA_DUPLICADO', 409, 'rubi.alta.error.duplicate'],
      ['ALTA_REPRESENTACION_REQUERIDA', 400, 'rubi.alta.error.representative'],
      ['ALTA_EJERCICIO_NO_DISPONIBLE', 409, 'rubi.alta.error.exercise'],
      ['ALTA_CARGO_NO_DISPONIBLE', 400, 'rubi.alta.error.cargo'],
      ['ALTA_PREPARATION_STORE_UNAVAILABLE', 503, 'rubi.alta.error.prepare']
    ] as const;
    for (const [code, status, key] of cases) {
      api.prepararAlta.and.returnValue(throwError(() => new HttpErrorResponse({ status, error: { details: { code } } })));
      component.prepare();
      expect(component.errorKey).withContext(code).toBe(key);
    }
  });

  // G (form-diagnostics): CASO G1 (pattern + required combinados).
  it('formDiagnostics reports the real Angular validation errors with real field labels, never the field value', () => {
    component.form.patchValue({ telefono: 'abc' });
    const diagnostics = component.formDiagnostics();
    expect(diagnostics.present).toBe(true);
    expect(diagnostics.valid).toBe(false);
    const telefonoIssue = diagnostics.issues.find(issue => issue.field === 'telefono');
    expect(telefonoIssue).toEqual({ field: 'telefono', label: component.i18n.t('rubi.alta.field.phone'), code: 'pattern', source: 'client' });
    expect(JSON.stringify(diagnostics)).not.toContain('abc');
  });

  it('formDiagnostics reports present=true valid=true and no issues on a valid, untouched form', () => {
    fillValidAdult();
    const diagnostics = component.formDiagnostics();
    expect(diagnostics).toEqual({ present: true, valid: true, submitted: false, issues: [], totalIssues: 0, truncated: false });
  });

  it('formDiagnostics surfaces a safe backend code (e.g. cargo no longer available) as a server issue', () => {
    fillValidAdult();
    api.prepararAlta.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { details: { code: 'ALTA_CARGO_NO_DISPONIBLE' } } })));
    component.prepare();
    const diagnostics = component.formDiagnostics();
    expect(diagnostics.valid).toBe(false);
    expect(diagnostics.issues).toContain({ code: 'ALTA_CARGO_NO_DISPONIBLE', source: 'server' });
  });

  it('formDiagnostics drops the server issue once the draft is edited again', () => {
    fillValidAdult();
    api.prepararAlta.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { details: { code: 'ALTA_CARGO_NO_DISPONIBLE' } } })));
    component.prepare();
    expect(component.formDiagnostics().issues.some(issue => issue.source === 'server')).toBeTrue();
    api.prepararAlta.and.returnValue(of(prepared()));
    fillValidAdult();
    component.prepare();
    expect(component.formDiagnostics().issues.some(issue => issue.source === 'server')).toBeFalse();
  });

  it('formDiagnostics never leaks unrelated backend codes (permission/expiry/duplicate) as form issues', () => {
    fillValidAdult();
    api.prepararAlta.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { details: { code: 'REGISTRO_ALTA_DUPLICADO' } } })));
    component.prepare();
    expect(component.formDiagnostics().issues.length).toBe(0);
  });

  it('invalidates and clears a prepared draft when editing or cancelling', () => {
    api.prepararAlta.and.returnValue(of(prepared()));
    fillValidAdult();
    component.prepare();
    component.edit();
    expect(api.cancelarPreparacionAlta).toHaveBeenCalledWith('x'.repeat(43));
    expect(component.prepared).toBeNull();
    expect(component.form.value.nombre).toBe('Persona');
    component.cancel();
    expect(component.form.value.nombre).toBeNull();
  });

  it('requires an explicit human acknowledgement and prevents double click', () => {
    const pending = new Subject<any>();
    api.prepararAlta.and.returnValue(of(prepared()));
    api.confirmarAlta.and.returnValue(pending.asObservable());
    fillValidAdult();
    component.prepare();

    component.confirm();
    expect(api.confirmarAlta).not.toHaveBeenCalled();
    component.confirmationAccepted = true;
    component.confirm();
    component.confirm();
    expect(api.confirmarAlta).toHaveBeenCalledTimes(1);

    pending.next({ solicitudId: 501, numero: 'SOL-501', estado: 'registrada', idempotentReplay: false });
    pending.complete();
    expect(component.confirmed?.solicitudId).toBe(501);
    expect(component.prepared).toBeNull();
    expect(component.form.value.nombre).toBeNull();
  });

  it('does not expose confirmation when the transactional capability is disabled', () => {
    api.prepararAlta.and.returnValue(of(prepared({
      confirmacion: { referencia: 'x'.repeat(43), expiraAt: new Date(Date.now() + 10000).toISOString(), confirmacionHumanaHabilitada: false }
    })));
    fillValidAdult();
    component.prepare();
    component.confirmationAccepted = true;
    component.confirm();
    expect(api.confirmarAlta).not.toHaveBeenCalled();
  });

  it('preserves a valid preparation on technical failure for an idempotent retry', () => {
    api.prepararAlta.and.returnValue(of(prepared()));
    api.confirmarAlta.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    fillValidAdult();
    component.prepare();
    component.confirmationAccepted = true;
    component.confirm();
    expect(component.errorKey).toBe('rubi.alta.error.confirm');
    expect(component.prepared?.confirmacion?.referencia).toBe('x'.repeat(43));
  });

  it('withdraws confirmation when the backend disables the transactional flag', () => {
    api.prepararAlta.and.returnValue(of(prepared()));
    api.confirmarAlta.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 403, error: { details: { code: 'RUBI_TRANSACTIONAL_DISABLED' } }
    })));
    fillValidAdult();
    component.prepare();
    component.confirmationAccepted = true;
    component.confirm();
    expect(component.errorKey).toBe('rubi.alta.error.transactionDisabled');
    expect(component.prepared?.confirmacion?.confirmacionHumanaHabilitada).toBeFalse();
  });

  it('invalidates and clears the preparation on functional failure or context change', () => {
    api.prepararAlta.and.returnValue(of(prepared()));
    api.confirmarAlta.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 410, error: { details: { code: 'CONFIRMACION_CADUCADA' } }
    })));
    fillValidAdult();
    component.prepare();
    component.confirmationAccepted = true;
    component.confirm();
    expect(component.prepared).toBeNull();
    expect(component.form.value.nombre).toBeNull();

    api.prepararAlta.and.returnValue(of(prepared()));
    fillValidAdult();
    component.toggleCargo(8, true);
    component.prepare();
    contextChanges.next({ asociacionId: 99 });
    expect(component.prepared).toBeNull();
    expect(component.errorKey).toBe('rubi.alta.error.contextChanged');
  });

  it('clears personal data when the preparation expires', fakeAsync(() => {
    api.prepararAlta.and.returnValue(of(prepared({
      confirmacion: { referencia: 'y'.repeat(43), expiraAt: new Date(Date.now() + 1000).toISOString(), confirmacionHumanaHabilitada: true }
    })));
    fillValidAdult();
    component.prepare();
    tick(1001);
    expect(api.cancelarPreparacionAlta).toHaveBeenCalledWith('y'.repeat(43));
    expect(component.form.value.nombre).toBeNull();
    expect(component.prepared).toBeNull();
  }));
});

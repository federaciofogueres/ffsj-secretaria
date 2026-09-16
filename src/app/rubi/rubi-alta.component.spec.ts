import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

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

  const prepared = (overrides: Partial<AltaPreparacion> = {}): AltaPreparacion => ({
    estado: 'preparada', asociacionId: 12, ejercicio: { id: 7, ejercicio: 2027 },
    persona: null, datos: {}, cargos: [{ id: 8, nombre: 'Asociado/a' }],
    antecedentes: { requiereCertificacion: false, asociacionesAnteriores: [] },
    conflictosComplejos: [], siguientePaso: 'confirmar',
    efectos: { creaSolicitud: true, escribeEnCenso: false, requiereFirma: true, requiereCertificacion: false, circuito: 'ordinario' },
    confirmacion: { referencia: 'x'.repeat(43), expiraAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() },
    ...overrides
  });

  beforeEach(async () => {
    api = jasmine.createSpyObj<RubiApiService>('RubiApiService', ['prepararAlta', 'cancelarPreparacionAlta']);
    api.cancelarPreparacionAlta.and.returnValue(of({ cancelada: true }));
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
          contextSnapshot: { asociacionId: 12 }, hasPermission: (permission: string) => permission === 'solicitudes:write'
        } },
        { provide: EjercicioService, useValue: {
          selectedSnapshot: { id: 7, ejercicio: 2027, activo: true, estadoAsociacion: 'INICIADO' }
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
    expect((api as any).confirmarAlta).toBeUndefined();
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

  it('clears personal data when the preparation expires', fakeAsync(() => {
    api.prepararAlta.and.returnValue(of(prepared({
      confirmacion: { referencia: 'y'.repeat(43), expiraAt: new Date(Date.now() + 1000).toISOString() }
    })));
    fillValidAdult();
    component.prepare();
    tick(1001);
    expect(api.cancelarPreparacionAlta).toHaveBeenCalledWith('y'.repeat(43));
    expect(component.form.value.nombre).toBeNull();
    expect(component.prepared).toBeNull();
  }));
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CensoService } from '../core/censo.service';
import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { RubiApiService } from './rubi-api.service';
import { RubiModificacionComponent } from './rubi-modificacion.component';

describe('RubiModificacionComponent', () => {
  let fixture: ComponentFixture<RubiModificacionComponent>;
  let component: RubiModificacionComponent;
  let api: jasmine.SpyObj<RubiApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('RubiApiService', ['prepararModificacion', 'confirmarModificacion', 'cancelarPreparacionModificacion']);
    api.cancelarPreparacionModificacion.and.returnValue(of({ cancelada: true }));
    const context$ = new BehaviorSubject<any>({ asociacionId: 12 });
    const exercise$ = new BehaviorSubject<any>({ id: 7, ejercicio: 2027, activo: true, estadoAsociacion: 'INICIADO' });
    await TestBed.configureTestingModule({
      imports: [RubiModificacionComponent],
      providers: [I18nService,
        { provide: RubiApiService, useValue: api },
        { provide: CensoService, useValue: { getAsociadosByAsociacion: () => of([{ id: 91, nombre: 'Ana', apellidos: 'Prueba', cargo: 'Asociada', cargoId: 8, cargoIds: [8], tipo: 'adulto', dni: '12345678Z', telefono: '600000000', email: 'ana@example.test', fechaNacimiento: '1990-01-01' }]) } },
        { provide: SecretariaService, useValue: { getCargosCupos: () => of({ cargos: [{ id: 8, nombre: 'Asociada', esInfantil: false }] }) } },
        { provide: PermissionsService, useValue: { contextSnapshot: context$.value, contextChanges: context$.asObservable(), hasPermission: () => true } },
        { provide: EjercicioService, useValue: { selectedSnapshot: exercise$.value, selectedChanges: exercise$.asObservable() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RubiModificacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('selecciona una persona y envia solo los cambios por el endpoint determinista', () => {
    api.prepararModificacion.and.returnValue(of({ estado: 'preparada', asociacionId: 12, ejercicio: { id: 7, ejercicio: 2027 }, persona: { id: 91, nombre: 'Ana', apellidos: 'Prueba' }, cambios: [{ campo: 'telefono', antes: '600000000', despues: '611111111' }], conflictosComplejos: [], siguientePaso: 'confirmar', confirmacion: { referencia: 'x'.repeat(43), expiraAt: '2099-01-01T00:00:00Z', confirmacionHumanaHabilitada: true } }));
    component.form.patchValue({ asociadoId: 91 }); component.selectPerson();
    component.form.patchValue({ telefono: '611111111' }); component.prepare();
    const args = api.prepararModificacion.calls.mostRecent().args;
    expect(args[0]).toBe(7); expect(args[1]).toBe(91); expect(args[2]).toEqual({ telefono: '611111111' });
    expect(JSON.stringify(args[2])).not.toContain('ana@example.test');
    expect(component.prepared?.cambios[0]).toEqual({ campo: 'telefono', antes: '600000000', despues: '611111111' });
  });

  it('requiere confirmacion humana y registra mediante llamada Angular API', () => {
    api.confirmarModificacion.and.returnValue(of({ solicitudId: 501, numero: 'SOL-501', tipo: 'cambio', idempotentReplay: false }));
    component.prepared = { estado: 'preparada', asociacionId: 12, ejercicio: { id: 7, ejercicio: 2027 }, persona: { id: 91, nombre: 'Ana', apellidos: 'Prueba' }, cambios: [], conflictosComplejos: [], siguientePaso: 'confirmar', confirmacion: { referencia: 'x'.repeat(43), expiraAt: '2099-01-01T00:00:00Z', confirmacionHumanaHabilitada: true } };
    component.confirm(); expect(api.confirmarModificacion).not.toHaveBeenCalled();
    component.confirmationAccepted = true; component.confirm();
    expect(api.confirmarModificacion).toHaveBeenCalledWith('x'.repeat(43));
    expect(component.confirmed?.solicitudId).toBe(501);
  });

  it('deriva errores funcionales sin mostrar detalles tecnicos', () => {
    api.prepararModificacion.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { details: { code: 'MODIFICACION_DUPLICADA' }, stack: 'secret' } })));
    component.form.patchValue({ asociadoId: 91 }); component.selectPerson(); component.form.patchValue({ telefono: '611111111' }); component.prepare();
    expect(component.errorKey).toBe('rubi.mod.error.duplicate');
    expect(component.errorKey).not.toContain('secret');
  });

  it('incluye los textos nuevos en ES VA y EN', () => {
    const i18n = TestBed.inject(I18nService);
    for (const language of ['es', 'va', 'en'] as const) {
      i18n.setLanguage(language);
      expect(i18n.t('rubi.mod.title')).not.toBe('rubi.mod.title');
      expect(i18n.t('rubi.mod.before')).not.toBe('rubi.mod.before');
      expect(i18n.t('rubi.mod.confirm.action')).not.toBe('rubi.mod.confirm.action');
    }
  });
});

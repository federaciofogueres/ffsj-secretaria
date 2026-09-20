import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CensoService } from '../core/censo.service';
import { EjercicioService } from '../core/ejercicio.service';
import { I18nService } from '../core/i18n.service';
import { PermissionsService } from '../core/permissions.service';
import { RubiApiService } from './rubi-api.service';
import { RubiBajaComponent } from './rubi-baja.component';

describe('RubiBajaComponent', () => {
  let fixture: ComponentFixture<RubiBajaComponent>;
  let component: RubiBajaComponent;
  let api: jasmine.SpyObj<RubiApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('RubiApiService', ['prepararBaja', 'confirmarBaja', 'cancelarPreparacionBaja']);
    api.cancelarPreparacionBaja.and.returnValue(of({ cancelada: true }));
    const context$ = new BehaviorSubject<any>({ asociacionId: 12 });
    const exercise$ = new BehaviorSubject<any>({ id: 7, ejercicio: 2027, activo: true, estadoAsociacion: 'INICIADO' });
    await TestBed.configureTestingModule({
      imports: [RubiBajaComponent],
      providers: [I18nService,
        { provide: RubiApiService, useValue: api },
        { provide: CensoService, useValue: { getAsociadosByAsociacion: () => of([{ id: 91, nombre: 'Ana', apellidos: 'Prueba', estado: 'activo' }]) } },
        { provide: PermissionsService, useValue: { contextSnapshot: context$.value, contextChanges: context$.asObservable(), hasPermission: () => true } },
        { provide: EjercicioService, useValue: { selectedSnapshot: exercise$.value, selectedChanges: exercise$.asObservable() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RubiBajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('selecciona una persona y prepara la baja sin enviar PII fuera del endpoint determinista', () => {
    api.prepararBaja.and.returnValue(of({ estado: 'preparada', asociacionId: 12, ejercicio: { id: 7, ejercicio: 2027 }, persona: { id: 91, nombre: 'Ana', apellidos: 'Prueba' }, conflictosComplejos: [], siguientePaso: 'confirmar', efectos: { creaSolicitud: true, escribeEnCenso: false, requiereFirma: true, circuito: 'ordinario' }, confirmacion: { referencia: 'x'.repeat(43), expiraAt: '2099-01-01T00:00:00Z', confirmacionHumanaHabilitada: true } }));
    component.form.patchValue({ asociadoId: 91 }); component.selectPerson();
    component.form.patchValue({ motivo: 'Voluntaria' }); component.prepare();
    const args = api.prepararBaja.calls.mostRecent().args;
    expect(args[0]).toBe(7); expect(args[1]).toBe(91); expect(args[2]).toBe('Voluntaria');
    expect(component.prepared?.persona).toEqual({ id: 91, nombre: 'Ana', apellidos: 'Prueba' });
  });

  it('requiere confirmacion humana y registra mediante llamada Angular API', () => {
    api.confirmarBaja.and.returnValue(of({ solicitudId: 501, numero: 'SOL-501', tipo: 'baja', idempotentReplay: false }));
    component.prepared = { estado: 'preparada', asociacionId: 12, ejercicio: { id: 7, ejercicio: 2027 }, persona: { id: 91, nombre: 'Ana', apellidos: 'Prueba' }, conflictosComplejos: [], siguientePaso: 'confirmar', efectos: { creaSolicitud: true, escribeEnCenso: false, requiereFirma: true, circuito: 'ordinario' }, confirmacion: { referencia: 'x'.repeat(43), expiraAt: '2099-01-01T00:00:00Z', confirmacionHumanaHabilitada: true } };
    component.confirm(); expect(api.confirmarBaja).not.toHaveBeenCalled();
    component.confirmationAccepted = true; component.confirm();
    expect(api.confirmarBaja).toHaveBeenCalledWith('x'.repeat(43));
    expect(component.confirmed?.solicitudId).toBe(501);
  });

  it('deriva errores funcionales sin mostrar detalles tecnicos', () => {
    api.prepararBaja.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { details: { code: 'BAJA_DUPLICADA' }, stack: 'secret' } })));
    component.form.patchValue({ asociadoId: 91 }); component.selectPerson(); component.prepare();
    expect(component.errorKey).toBe('rubi.baja.error.duplicate');
    expect(component.errorKey).not.toContain('secret');
  });

  it('formDiagnostics reporta el required de la persona sin exponer nombres reales', () => {
    const diagnostics = component.formDiagnostics();
    expect(diagnostics.valid).toBe(false);
    expect(diagnostics.issues).toContain(jasmine.objectContaining({ field: 'asociadoId', code: 'required', source: 'client' }));
    expect(JSON.stringify(diagnostics)).not.toContain('Ana');
  });

  it('formDiagnostics incluye un codigo seguro de backend (persona ya no disponible) como issue de servidor, y lo limpia al editar', () => {
    api.prepararBaja.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { details: { code: 'BAJA_PERSONA_NO_DISPONIBLE' } } })));
    component.form.patchValue({ asociadoId: 91 }); component.selectPerson(); component.prepare();
    expect(component.formDiagnostics().issues).toContain({ code: 'BAJA_PERSONA_NO_DISPONIBLE', source: 'server' });
    component.edit();
    expect(component.formDiagnostics().issues.some(issue => issue.source === 'server')).toBeFalse();
  });

  it('formDiagnostics no filtra codigos de backend ajenos al formulario (p.ej. duplicada)', () => {
    api.prepararBaja.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { details: { code: 'BAJA_DUPLICADA' } } })));
    component.form.patchValue({ asociadoId: 91 }); component.selectPerson(); component.prepare();
    expect(component.formDiagnostics().issues.some(issue => issue.source === 'server')).toBeFalse();
  });

  it('deriva al flujo normal cuando hay un cargo obligatorio implicado', () => {
    api.prepararBaja.and.returnValue(of({ estado: 'requiere_flujo_normal', asociacionId: 12, ejercicio: { id: 7, ejercicio: 2027 }, persona: { id: 91, nombre: 'Ana', apellidos: 'Prueba' }, conflictosComplejos: [{ code: 'CARGO_OBLIGATORIO_REQUIERE_SUSTITUCION', cargoIds: [8] }], siguientePaso: 'derivar_flujo_normal', efectos: { creaSolicitud: true, escribeEnCenso: false, requiereFirma: true, circuito: 'ordinario' } }));
    component.form.patchValue({ asociadoId: 91 }); component.selectPerson(); component.prepare();
    expect(component.prepared?.estado).toBe('requiere_flujo_normal');
    expect(component.prepared?.confirmacion).toBeUndefined();
  });

  it('incluye los textos nuevos en ES VA y EN', () => {
    const i18n = TestBed.inject(I18nService);
    for (const language of ['es', 'va', 'en'] as const) {
      i18n.setLanguage(language);
      expect(i18n.t('rubi.baja.title')).not.toBe('rubi.baja.title');
      expect(i18n.t('rubi.baja.confirm.action')).not.toBe('rubi.baja.confirm.action');
      expect(i18n.t('rubi.baja.normal.title')).not.toBe('rubi.baja.normal.title');
    }
  });
});

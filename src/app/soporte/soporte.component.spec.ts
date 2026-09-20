import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { DashboardSummaryService } from '../core/dashboard-summary.service';
import { EjercicioService } from '../core/ejercicio.service';
import { SecretariaService } from '../core/secretaria.service';
import { RubiScreenContextService } from '../rubi/rubi-screen-context.service';
import { SoporteComponent } from './soporte.component';

// G (form-diagnostics, formulario normal): Soporte es uno de los formularios
// de tramite normales identificados en la auditoria del bug de
// AsociadosGestion (sin ningun wiring a Rubi hasta ahora). Reutiliza el mismo
// patron ya validado alli: buildFormDiagnostics() + valueChanges + limpieza
// cuando el formulario deja de estar visible (viendo el detalle de un ticket).

describe('SoporteComponent (form-diagnostics)', () => {
  let component: SoporteComponent;
  let fixture: ComponentFixture<SoporteComponent>;
  let secretaria: jasmine.SpyObj<SecretariaService>;
  let rubiScreenContext: RubiScreenContextService;

  beforeEach(async () => {
    secretaria = jasmine.createSpyObj<SecretariaService>('SecretariaService', [
      'getSoporteCategorias', 'getSoporteIncidencias', 'crearSoporteIncidencia', 'getSoporteIncidencia', 'marcarSoporteLeido'
    ]);
    secretaria.getSoporteCategorias.and.returnValue(of({ categorias: [{ id: 1, nombre: 'General' } as any], estados: [] }));
    secretaria.getSoporteIncidencias.and.returnValue(of({ incidencias: [] }));

    await TestBed.configureTestingModule({
      imports: [SoporteComponent],
      providers: [
        { provide: SecretariaService, useValue: secretaria },
        { provide: EjercicioService, useValue: { selectedEjercicio: 2027 } },
        { provide: DashboardSummaryService, useValue: { refreshAssociation: () => undefined } },
        { provide: Router, useValue: { url: '/soporte' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SoporteComponent);
    component = fixture.componentInstance;
    rubiScreenContext = TestBed.inject(RubiScreenContextService);
    fixture.detectChanges();
  });

  it('publica formDiagnostics presente e invalido para el formulario de nueva incidencia, recien abierto', () => {
    const context = rubiScreenContext.current;
    expect(context?.module).toBe('soporte');
    expect(context?.state?.formDiagnostics?.present).toBeTrue();
    expect(context?.state?.formDiagnostics?.valid).toBeFalse();
  });

  it('corregir los campos actualiza el diagnostico de inmediato (valueChanges)', () => {
    component.form.patchValue({ categoria: '1', asunto: 'Un asunto de prueba', descripcion: 'Una descripcion suficientemente larga' });
    const diagnostics = rubiScreenContext.current?.state?.formDiagnostics;
    expect(diagnostics?.valid).toBeTrue();
    expect(diagnostics?.issues).toEqual([]);
  });

  it('nunca incluye el texto introducido (posible PII) en el screenContext publicado', () => {
    component.form.patchValue({ asunto: 'Mi telefono es 600123456', descripcion: 'Contactadme en persona.privada@example.invalid por favor' });
    const raw = JSON.stringify(rubiScreenContext.current);
    expect(raw).not.toContain('600123456');
    expect(raw).not.toContain('persona.privada@example.invalid');
  });

  it('viendo el detalle de un ticket existente, el formulario deja de estar activo (formDiagnostics ausente); cerrar el detalle lo restaura', () => {
    secretaria.getSoporteIncidencia.and.returnValue(of({ incidencia: { id: 5, estado: 'ABIERTA' } as any }));
    secretaria.marcarSoporteLeido.and.returnValue(of({} as any));
    component.verDetalle(5);
    expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();
    component.cerrarDetalle();
    expect(rubiScreenContext.current?.state?.formDiagnostics?.present).toBeTrue();
  });

  it('tras enviar correctamente, el formulario se resetea y el diagnostico refleja el formulario vacio de nuevo', () => {
    secretaria.crearSoporteIncidencia.and.returnValue(of({ incidencia: { id: 9, eventos: [] } as any }));
    component.form.patchValue({ categoria: '1', asunto: 'Un asunto de prueba', descripcion: 'Una descripcion suficientemente larga' });
    component.enviar();
    expect(component.submitted).toBeFalse();
    const diagnostics = rubiScreenContext.current?.state?.formDiagnostics;
    expect(diagnostics?.present).toBeTrue();
    expect(diagnostics?.valid).toBeFalse();
  });

  it('preguntar "que me falta" antes de enviar no bombardea con errores de campos aun no tocados (submitted=false)', () => {
    const diagnostics = rubiScreenContext.current?.state?.formDiagnostics;
    expect(diagnostics?.submitted).toBeFalse();
  });
});

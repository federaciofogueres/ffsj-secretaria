import { FormBuilder } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminAccessService } from '../core/admin-access.service';
import { ApiUrlService } from '../core/api-url.service';
import { CensoService } from '../core/censo.service';
import { EjercicioService } from '../core/ejercicio.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { InscripcionesComponent } from './inscripciones.component';
import { InscripcionDraftStateService } from './inscripcion-draft-state.service';

describe('InscripcionesComponent', () => {
  function createComponent(entrada?: any): InscripcionesComponent {
    const secretaria = jasmine.createSpyObj('SecretariaService', [
      'getAdjuntosInscripcion', 'getAdjuntos', 'getMiEntradaInscripcion', 'enviarInscripcion'
    ]);
    secretaria.getAdjuntosInscripcion.and.returnValue(of({ adjuntos: [] }));
    secretaria.getAdjuntos.and.returnValue(of({ adjuntos: [] }));
    secretaria.getMiEntradaInscripcion.and.returnValue(entrada ? of(entrada) : of());
    secretaria.enviarInscripcion.and.returnValue(of(entrada || { id: 1 }));

    return new InscripcionesComponent(
      new FormBuilder(),
      secretaria,
      { asociacionId: 1 } as any,
      {} as any,
      { isAdmin: () => false } as any,
      { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null }, routeConfig: null } } as any,
      { navigate: () => Promise.resolve(true) } as any,
      { hasPermission: () => true } as any,
      { isSelectedActive: true, selectedSnapshot: null } as any,
      new InscripcionDraftStateService()
    );
  }

  it('conserva el estado global al cambiar de pestaña y al volver a seleccionar la inscripción', () => {
    const component = createComponent();
    const inscription: any = {
      id: 'inscripcion-draft',
      titulo: 'Inscripción de prueba',
      tiposPermitidos: ['adulto'],
      campos: [
        { key: 'texto', label: 'Texto', type: 'text' },
        { key: 'responsable', label: 'Responsable', type: 'responsable' },
        { key: 'selector', label: 'Selector', type: 'select', options: ['Uno', 'Dos'] }
      ]
    };

    component.selectInscription(inscription);
    const originalForm = component.form;
    component.form.patchValue({ texto: 'Valor de texto', responsable: 'Responsable elegido', selector: 'Dos' });

    component.setAssociationTab('asociados');
    component.setAssociationTab('formulario');
    component.selectInscription({ ...inscription, campos: [...inscription.campos] });

    expect(component.form).toBe(originalForm);
    expect(component.form.getRawValue()).toEqual({
      texto: 'Valor de texto',
      responsable: 'Responsable elegido',
      selector: 'Dos'
    });
  });

  it('conserva, guarda y recupera todos los tipos dinámicos al crear una inscripción', () => {
    const component = createComponent();
    const inscription = inscriptionWithAllFieldTypes();
    component.asociados = asociados();
    component.selectInscription(inscription);
    fillAllFieldTypes(component, 'creacion');

    navigateTabsRepeatedly(component);
    expectDynamicValues(component, 'creacion');

    const secretaria = (component as any).secretariaService as jasmine.SpyObj<any>;
    secretaria.enviarInscripcion.and.callFake((payload: any) => of(entryFromPayload(payload)));
    component.submit();

    expect(secretaria.enviarInscripcion).toHaveBeenCalledWith(jasmine.objectContaining({
      datos: expectedPersistedValues('creacion'),
      participantes: ['101']
    }));

    const recovered = createRecoveredComponent(entryFromPayload(secretaria.enviarInscripcion.calls.mostRecent().args[0]));
    navigateTabsRepeatedly(recovered);
    expectDynamicValues(recovered, 'creacion');
    expect((recovered as any).buildDatosFormulario()).toEqual(expectedPersistedValues('creacion'));
  });

  it('conserva, guarda y recupera todos los tipos dinámicos al editar una inscripción', () => {
    const initial = entryFromPayload({
      asociacionId: 1,
      formularioId: 'inscripcion-tipos',
      datos: expectedPersistedValues('creacion'),
      participantes: ['101']
    });
    const component = createRecoveredComponent(initial);

    component.modificarMiInscripcion();
    fillAllFieldTypes(component, 'edicion');
    navigateTabsRepeatedly(component);
    expectDynamicValues(component, 'edicion');

    const secretaria = (component as any).secretariaService as jasmine.SpyObj<any>;
    secretaria.enviarInscripcion.and.callFake((payload: any) => of(entryFromPayload(payload)));
    component.submit();

    expect(secretaria.enviarInscripcion).toHaveBeenCalledWith(jasmine.objectContaining({
      datos: expectedPersistedValues('edicion'),
      participantes: ['101', '102']
    }));

    const recovered = createRecoveredComponent(entryFromPayload(secretaria.enviarInscripcion.calls.mostRecent().args[0]));
    navigateTabsRepeatedly(recovered);
    expectDynamicValues(recovered, 'edicion');
    expect((recovered as any).buildDatosFormulario()).toEqual(expectedPersistedValues('edicion'));
  });

  for (const mode of ['creacion', 'edicion'] as const) {
    it(`mantiene visibles los controles dinamicos en DOM al volver de otra pestana (${mode})`, async () => {
      const fixture = await createRenderedComponent();
      const component = fixture.componentInstance;
      component.detailMode = true;
      component.asociados = asociados();
      component.selectInscription(inscriptionWithAllFieldTypes());
      component.associationMode = 'edit';
      if (mode === 'edicion') component.miEntrada = { id: 1, estado: 'recibida' } as any;
      fixture.detectChanges();

      const texto = valueInput(fixture, 'texto');
      texto.value = `texto-visible-${mode}`;
      texto.dispatchEvent(new Event('input'));
      setInputValue(fixture, 'area', `area-visible-${mode}`);
      valueInput(fixture, 'fecha').value = '2026-09-15';
      valueInput(fixture, 'fecha').dispatchEvent(new Event('input'));
      valueInput(fixture, 'hora').value = '10:30';
      valueInput(fixture, 'hora').dispatchEvent(new Event('input'));
      valueInput(fixture, 'fechaHora').value = '2026-09-15T10:30';
      valueInput(fixture, 'fechaHora').dispatchEvent(new Event('input'));
      setInputValue(fixture, 'telefono', '600000001');
      setInputValue(fixture, 'correo', 'visible@example.test');
      setInputValue(fixture, 'numero', '12');
      setSelectValue(fixture, 'selectorSimple', ['opcion-id-2']);
      setSelectValue(fixture, 'selectorMultiple', ['opcion-id-1', 'opcion-id-3']);
      setInputValue(fixture, 'responsable', 'Ana Responsable - Presidenta');
      setInputValue(fixture, 'asociado', 'Bruno Asociado - Secretario');
      component.form.get('asociados')?.setValue(['101', '102']);
      fixture.detectChanges();

      component.goAssociationStep(1);
      fixture.detectChanges();
      component.goAssociationStep(3);
      fixture.detectChanges();
      component.goAssociationStep(2);
      fixture.detectChanges();
      component.goAssociationStep(1);
      fixture.detectChanges();
      component.goAssociationStep(2);
      fixture.detectChanges();

      expect(valueInput(fixture, 'texto').value).toBe(`texto-visible-${mode}`);
      expect(valueInput(fixture, 'area').value).toBe(`area-visible-${mode}`);
      expect(valueInput(fixture, 'fecha').value).toBe('2026-09-15');
      expect(valueInput(fixture, 'hora').value).toBe('10:30');
      expect(valueInput(fixture, 'fechaHora').value).toBe('2026-09-15T10:30');
      expect(valueInput(fixture, 'telefono').value).toBe('600000001');
      expect(valueInput(fixture, 'correo').value).toBe('visible@example.test');
      expect(valueInput(fixture, 'numero').value).toBe('12');
      expect(selectValue(fixture, 'selectorSimple')).toEqual(['opcion-id-2']);
      expect(selectValue(fixture, 'selectorMultiple')).toEqual(['opcion-id-1', 'opcion-id-3']);
      expect(valueInput(fixture, 'responsable').value).toBe('Ana Responsable - Presidenta');
      expect(valueInput(fixture, 'asociado').value).toBe('Bruno Asociado - Secretario');
      expect(component.form.get('asociados')?.value).toEqual(['101', '102']);
      expect(fixture.nativeElement.querySelectorAll('.asociado-chip').length).toBe(2);
    });
  }

  async function createRenderedComponent(): Promise<ComponentFixture<InscripcionesComponent>> {
    const secretaria = jasmine.createSpyObj<SecretariaService>('SecretariaService', [
      'getAdjuntosInscripcion', 'getAdjuntos', 'getMiEntradaInscripcion', 'enviarInscripcion',
      'getActividades', 'getInscripciones'
    ]);
    secretaria.getAdjuntosInscripcion.and.returnValue(of({ adjuntos: [] }));
    secretaria.getAdjuntos.and.returnValue(of({ adjuntos: [] }));
    secretaria.getMiEntradaInscripcion.and.returnValue(of());
    secretaria.enviarInscripcion.and.returnValue(of({ id: 1 }));
    secretaria.getActividades.and.returnValue(of({ actividades: [] }));
    secretaria.getInscripciones.and.returnValue(of({ inscripciones: [], paginacion: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));

    await TestBed.configureTestingModule({
      imports: [InscripcionesComponent],
      providers: [
        { provide: SecretariaService, useValue: secretaria },
        { provide: CensoService, useValue: { asociacionId: 1, getAsociadosByAsociacion: () => of([]) } },
        { provide: ApiUrlService, useValue: {} },
        { provide: AdminAccessService, useValue: { isAdmin: () => false } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null }, routeConfig: null } } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: PermissionsService, useValue: { hasPermission: () => true } },
        { provide: EjercicioService, useValue: { isSelectedActive: true, selectedSnapshot: null } },
        InscripcionDraftStateService
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(InscripcionesComponent);
    fixture.detectChanges();
    return fixture;
  }

  function valueInput(fixture: ComponentFixture<InscripcionesComponent>, key: string): HTMLInputElement {
    const input = fixture.nativeElement.querySelector(`#inscripcion-campo-${key}`) as HTMLInputElement;
    expect(input).withContext(`input ${key} visible`).toBeTruthy();
    return input;
  }

  function setInputValue(fixture: ComponentFixture<InscripcionesComponent>, key: string, value: string): void {
    const input = valueInput(fixture, key);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelectValue(fixture: ComponentFixture<InscripcionesComponent>, key: string, values: string[]): void {
    const select = fixture.nativeElement.querySelector(`#inscripcion-campo-${key}`) as HTMLSelectElement;
    Array.from(select.options).forEach(option => option.selected = values.includes(option.text));
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function selectValue(fixture: ComponentFixture<InscripcionesComponent>, key: string): string[] {
    const select = fixture.nativeElement.querySelector(`#inscripcion-campo-${key}`) as HTMLSelectElement;
    return Array.from(select.selectedOptions).map(option => option.text);
  }

  function createRecoveredComponent(entrada: any): InscripcionesComponent {
    const component = createComponent(entrada);
    component.asociados = asociados();
    (component as any).asociadosCargados = true;
    component.selectInscription(inscriptionWithAllFieldTypes());
    return component;
  }

  function inscriptionWithAllFieldTypes(): any {
    return {
      id: 'inscripcion-tipos',
      titulo: 'Inscripción de todos los tipos',
      tiposPermitidos: ['adulto', 'infantil'],
      campos: [
        { key: 'texto', label: 'Texto', type: 'text' },
        { key: 'area', label: 'Área', type: 'textarea' },
        { key: 'fecha', label: 'Fecha', type: 'date' },
        { key: 'hora', label: 'Hora', type: 'time' },
        { key: 'fechaHora', label: 'Fecha y hora', type: 'datetime' },
        { key: 'telefono', label: 'Teléfono', type: 'tel' },
        { key: 'correo', label: 'Correo', type: 'email' },
        { key: 'numero', label: 'Número', type: 'number' },
        { key: 'selectorSimple', label: 'Selector simple', type: 'select', options: ['opcion-id-1', 'opcion-id-2'] },
        { key: 'selectorMultiple', label: 'Selector múltiple', type: 'select', selectionMode: 'multiple', options: ['opcion-id-1', 'opcion-id-2', 'opcion-id-3'] },
        { key: 'responsable', label: 'Responsable', type: 'responsable' },
        { key: 'asociado', label: 'Asociado', type: 'asociado' },
        { key: 'asociados', label: 'Asociados', type: 'asociado', selectionMode: 'multiple' }
      ]
    };
  }

  function asociados(): any[] {
    return [
      { id: 101, nombre: 'Ana', apellidos: 'Responsable', tipo: 'adulto', telefono: '600000101', email: 'ana@example.test', cargo: 'Presidenta' },
      { id: 102, nombre: 'Bruno', apellidos: 'Asociado', tipo: 'adulto', telefono: '600000102', email: 'bruno@example.test', cargo: 'Secretario' },
      { id: 103, nombre: 'Carla', apellidos: 'Infantil', tipo: 'infantil', telefono: '600000103', email: 'carla@example.test', cargo: '' }
    ];
  }

  function fillAllFieldTypes(component: InscripcionesComponent, mode: 'creacion' | 'edicion'): void {
    const suffix = mode === 'creacion' ? 'creado' : 'editado';
    component.form.patchValue({
      texto: `texto-${suffix}`,
      area: `area-${suffix}`,
      fecha: mode === 'creacion' ? '2026-09-15' : '2026-09-16',
      hora: mode === 'creacion' ? '10:30' : '11:45',
      fechaHora: mode === 'creacion' ? '2026-09-15T10:30' : '2026-09-16T11:45',
      telefono: mode === 'creacion' ? '600000001' : '600000002',
      correo: `${suffix}@example.test`,
      numero: mode === 'creacion' ? '12' : '24',
      selectorSimple: mode === 'creacion' ? 'opcion-id-2' : 'opcion-id-1',
      selectorMultiple: mode === 'creacion' ? ['opcion-id-1', 'opcion-id-3'] : ['opcion-id-2', 'opcion-id-3'],
      responsable: 'Ana Responsable - Presidenta',
      asociado: 'Bruno Asociado - Secretario',
      asociados: mode === 'creacion' ? ['101', '102'] : ['102', '103']
    });
    component.selectedParticipants = new Set(mode === 'creacion' ? ['101'] : ['101', '102']);
    (component as any).guardarBorradorActual();
  }

  function navigateTabsRepeatedly(component: InscripcionesComponent): void {
    component.goAssociationStep(1);
    component.goAssociationStep(2);
    component.goAssociationStep(3);
    component.goAssociationStep(2);
    component.goAssociationStep(1);
    component.goAssociationStep(2);
  }

  function expectDynamicValues(component: InscripcionesComponent, mode: 'creacion' | 'edicion'): void {
    const suffix = mode === 'creacion' ? 'creado' : 'editado';
    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
      texto: `texto-${suffix}`,
      area: `area-${suffix}`,
      fecha: mode === 'creacion' ? '2026-09-15' : '2026-09-16',
      hora: mode === 'creacion' ? '10:30' : '11:45',
      fechaHora: mode === 'creacion' ? '2026-09-15T10:30' : '2026-09-16T11:45',
      telefono: mode === 'creacion' ? '600000001' : '600000002',
      correo: `${suffix}@example.test`,
      numero: mode === 'creacion' ? '12' : '24',
      selectorSimple: mode === 'creacion' ? 'opcion-id-2' : 'opcion-id-1',
      selectorMultiple: mode === 'creacion' ? ['opcion-id-1', 'opcion-id-3'] : ['opcion-id-2', 'opcion-id-3'],
      responsable: 'Ana Responsable - Presidenta',
      asociado: 'Bruno Asociado - Secretario',
      asociados: mode === 'creacion' ? ['101', '102'] : ['102', '103']
    }));
    expect([...component.selectedParticipants]).toEqual(mode === 'creacion' ? ['101'] : ['101', '102']);
  }

  function expectedPersistedValues(mode: 'creacion' | 'edicion'): Record<string, unknown> {
    const suffix = mode === 'creacion' ? 'creado' : 'editado';
    return {
      texto: `texto-${suffix}`,
      area: `area-${suffix}`,
      fecha: mode === 'creacion' ? '2026-09-15' : '2026-09-16',
      hora: mode === 'creacion' ? '10:30' : '11:45',
      fechaHora: mode === 'creacion' ? '2026-09-15T10:30' : '2026-09-16T11:45',
      telefono: mode === 'creacion' ? '600000001' : '600000002',
      correo: `${suffix}@example.test`,
      numero: mode === 'creacion' ? '12' : '24',
      selectorSimple: mode === 'creacion' ? 'opcion-id-2' : 'opcion-id-1',
      selectorMultiple: mode === 'creacion' ? ['opcion-id-1', 'opcion-id-3'] : ['opcion-id-2', 'opcion-id-3'],
      responsable: { id: 101, nombre: 'Ana Responsable', telefono: '600000101', email: 'ana@example.test', cargo: 'Presidenta' },
      asociado: '102',
      asociados: mode === 'creacion' ? ['101', '102'] : ['102', '103']
    };
  }

  function entryFromPayload(payload: any): any {
    return {
      id: 1,
      numero: 'I-1',
      asociacionId: payload.asociacionId,
      formularioId: payload.formularioId,
      estado: 'recibida',
      fechaEntrada: '2026-09-15T00:00:00Z',
      datos: payload.datos,
      participantes: payload.participantes
    };
  }
});

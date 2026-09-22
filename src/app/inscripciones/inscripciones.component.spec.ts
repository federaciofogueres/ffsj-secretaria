import { FormBuilder } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
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
  function createComponent(entrada?: any, routeId: string | null = null, rubiScreenContext?: any, isAdmin = false, overrides: { router?: any } = {}): InscripcionesComponent {
    const secretaria = jasmine.createSpyObj('SecretariaService', [
      'getAdjuntosInscripcion', 'getAdjuntos', 'getMiEntradaInscripcion', 'enviarInscripcion', 'subirAdjunto'
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
      { isAdmin: () => isAdmin } as any,
      { snapshot: { paramMap: { get: () => routeId }, queryParamMap: { get: () => null }, routeConfig: null } } as any,
      overrides.router || { navigate: () => Promise.resolve(true) } as any,
      { hasPermission: () => true } as any,
      { isSelectedActive: true, selectedSnapshot: null } as any,
      new InscripcionDraftStateService(),
      rubiScreenContext || { set: () => undefined, clear: () => undefined } as any
    );
  }

  it('A (post-auditoria 1.8.1#RUBI): el listado expone view=listado sin ningún id seleccionado', () => {
    const rubiScreenContext = jasmine.createSpyObj('RubiScreenContextService', ['set', 'clear']);
    const component = createComponent(undefined, null, rubiScreenContext);
    spyOn(component as any, 'cargarDatos');
    component.ngOnInit();
    expect(rubiScreenContext.set).toHaveBeenCalledWith({ version: 1, module: 'inscripciones', view: 'listado' });
  });

  it('A (post-auditoria 1.8.1#RUBI): el detalle expone view=detalle con el id de la ruta, sin datos del formulario', () => {
    const rubiScreenContext = jasmine.createSpyObj('RubiScreenContextService', ['set', 'clear']);
    const component = createComponent(undefined, 'INS-42', rubiScreenContext);
    spyOn(component as any, 'cargarDatos');
    component.ngOnInit();
    expect(rubiScreenContext.set).toHaveBeenCalledWith({ version: 1, module: 'inscripciones', view: 'detalle', state: { selectedInscriptionId: 'INS-42' } });
  });

  it('A (post-auditoria 1.8.1#RUBI): ngOnDestroy limpia el contexto de la pantalla', () => {
    const rubiScreenContext = jasmine.createSpyObj('RubiScreenContextService', ['set', 'clear']);
    const component = createComponent(undefined, null, rubiScreenContext);
    component.ngOnDestroy();
    expect(rubiScreenContext.clear).toHaveBeenCalledWith('inscripciones');
  });

  describe('detalle de Asociación en dialog compartido con Administración (0.43.0#ESMERALDA)', () => {
    function entradaConIncidencias(overrides: any = {}): any {
      return { id: 55, numero: 'INS-2026-000007', asociacionId: 1, formularioId: 'inscripcion-tipos', estado: 'con_incidencias', fechaEntrada: '2026-09-19T12:09:00Z', ...overrides };
    }

    it('al recuperar una entrada ya presentada, abre el dialog compartido en vez de la sección plana antigua', () => {
      const entrada = entradaConIncidencias();
      const component = createRecoveredComponent(entrada);
      expect(component.entradaDetalleDialogOpen).toBeTrue();
      expect(component.selectedEntrada).toEqual(jasmine.objectContaining({ id: 55 }));
      expect(component.associationMode).toBe('view');
    });

    it('0.43.5#ESMERALDA: tras ENVIAR una inscripción nueva (sin incidencias todavía), abre el mismo dialog nuevo, nunca la sección plana antigua', () => {
      const component = createComponent();
      const inscription = inscriptionWithAllFieldTypes();
      component.asociados = asociados();
      component.selectInscription(inscription);
      fillAllFieldTypes(component, 'creacion');
      navigateTabsRepeatedly(component);

      const secretaria = (component as any).secretariaService as jasmine.SpyObj<any>;
      const entradaSinIncidencias = { ...entryFromPayload({ asociacionId: 1, formularioId: inscription.id, datos: {}, participantes: [] }), estado: 'recibida' };
      secretaria.enviarInscripcion.and.returnValue(of(entradaSinIncidencias));

      component.submit();

      expect(component.entradaDetalleDialogOpen).withContext('debe abrir siempre el dialog nuevo, incluso sin incidencias (una entrada recién creada nunca las tiene)').toBeTrue();
      expect(component.associationMode).toBe('view');
      expect((component as any).associationMode).not.toBe('summary');
    });

    it('cerrar el dialog en Asociación navega al listado conservando el contexto de filtros', () => {
      const router = jasmine.createSpyObj('Router', ['navigate']);
      router.navigate.and.returnValue(Promise.resolve(true));
      const component = createRecoveredComponent(entradaConIncidencias(), { router });
      component.cerrarDetalleEntrada();
      expect(component.entradaDetalleDialogOpen).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/inscripciones'], jasmine.anything());
    });

    it('cerrar el dialog en Administración NO navega (el listado de inscritos ya está montado detrás)', () => {
      const router = jasmine.createSpyObj('Router', ['navigate']);
      router.navigate.and.returnValue(Promise.resolve(true));
      const component = createComponent(undefined, null, undefined, true, { router });
      component.abrirDetalleEntrada(entradaConIncidencias());
      router.navigate.calls.reset();
      component.cerrarDetalleEntrada();
      expect(component.entradaDetalleDialogOpen).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('modificar la inscripción cierra el dialog antes de pasar al formulario de edición', () => {
      const component = createRecoveredComponent(entradaConIncidencias({ estado: 'recibida' }));
      expect(component.entradaDetalleDialogOpen).toBeTrue();
      component.modificarMiInscripcion();
      expect(component.entradaDetalleDialogOpen).toBeFalse();
      expect(component.associationMode).toBe('edit');
    });

    it('0.43.5#ESMERALDA: una subida de adjunto lenta que termina tras cambiar de entrada no pisa la lista de adjuntos de la entrada actual', () => {
      const entradaA = entradaConIncidencias({ id: 55 });
      const entradaB = entradaConIncidencias({ id: 77 });
      const component = createRecoveredComponent(entradaA);
      const secretaria = (component as any).secretariaService as jasmine.SpyObj<any>;

      const subirSubject = new Subject<any>();
      secretaria.subirAdjunto.and.returnValue(subirSubject.asObservable());
      const inputA = { files: [new File(['a'], 'de-A.pdf')], value: 'x' } as unknown as HTMLInputElement;
      component.onAdjuntosEntradaChange({ target: inputA } as unknown as Event, entradaA);

      // Mientras la subida de A sigue en vuelo, se abre el detalle de OTRA
      // entrada (B) y su propia lista de adjuntos ya se ha cargado.
      secretaria.getAdjuntos.calls.reset();
      component.abrirDetalleEntrada(entradaB);
      const adjuntosDeB: any[] = [{ id: 999, originalName: 'de-B.pdf', scope: 'inscripcion_entrada', scopeId: '77', fileName: 'de-B.pdf', mimeType: 'application/pdf', sizeBytes: 1, uploadedAt: '2026-01-01', downloadUrl: '' }];
      secretaria.getAdjuntos.and.returnValue(of({ adjuntos: adjuntosDeB }));
      (component as any).cargarAdjuntosEntrada(entradaB.id);

      // Ahora responde (tarde) la subida de A.
      subirSubject.next({});
      subirSubject.complete();

      expect(component.selectedEntrada?.id).toBe(77);
      expect(component.adjuntosEntrada).withContext('la respuesta tardía de A no debe sobrescribir los adjuntos de B, que es la entrada abierta ahora').toEqual(adjuntosDeB);
    });

    it('categoriaLabel deriva la categoría de tiposPermitidos reales, sin inventar un campo nuevo', () => {
      const component = createComponent();
      expect(component.categoriaLabel(['adulto', 'infantil'])).toBe('Adulto, Infantil');
      expect(component.categoriaLabel(['adulto'])).toBe('Adulto');
      expect(component.categoriaLabel([])).toBe('');
      expect(component.categoriaLabel(undefined)).toBe('');
    });

    it('RUBI (0.43.0#ESMERALDA): con el dialog abierto, expone la entrada, la pestaña activa y si tiene incidencias, sin datos de formulario', () => {
      const rubiScreenContext = jasmine.createSpyObj('RubiScreenContextService', ['set', 'clear']);
      const component = createComponent(undefined, null, rubiScreenContext);
      component.abrirDetalleEntrada(entradaConIncidencias());
      const ultimaLlamada = rubiScreenContext.set.calls.mostRecent().args[0];
      expect(ultimaLlamada.state.entradaId).toBe(55);
      expect(ultimaLlamada.state.entradaDetalleTab).toBe('informacion');
      expect(ultimaLlamada.state.entradaConIncidencias).toBeTrue();

      rubiScreenContext.set.calls.reset();
      component.activarPestanaEntradaDetalle('incidencias');
      expect(rubiScreenContext.set.calls.mostRecent().args[0].state.entradaDetalleTab).toBe('incidencias');
    });
  });

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

  // 0.30.0#ESMERALDA: instrucciones de Administracion (campo `informacion`).
  describe('instrucciones de la inscripción (0.30.0#ESMERALDA)', () => {
    it('una inscripción sin instrucciones no muestra ningún bloque (compatibilidad con inscripciones existentes)', async () => {
      const fixture = await createRenderedComponent();
      const component = fixture.componentInstance;
      component.detailMode = true;
      component.selectInscription({ id: 'ins-1', titulo: 'Sin instrucciones', tiposPermitidos: [], campos: [] } as any);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.detail-header')).withContext('detalle de la inscripción visible').toBeTruthy();
      expect(fixture.nativeElement.querySelector('.inscription-instructions')).toBeNull();
    });

    it('muestra las instrucciones de la inscripción renderizadas como Markdown de forma segura, antes del contenido operativo', async () => {
      const fixture = await createRenderedComponent();
      const component = fixture.componentInstance;
      component.detailMode = true;
      component.selectInscription({
        id: 'ins-2', titulo: 'Con instrucciones', tiposPermitidos: [], campos: [],
        informacion: '**Importante**: trae el DNI.<script>window.__pwn = true;</script>'
      } as any);
      fixture.detectChanges();
      const bloque = fixture.nativeElement.querySelector('.inscription-instructions');
      expect(bloque).withContext('bloque de instrucciones visible').toBeTruthy();
      expect(bloque.innerHTML).toContain('<strong>Importante</strong>');
      expect(bloque.innerHTML).not.toContain('<script');
      expect((window as any).__pwn).toBeUndefined();

      const pasos = fixture.nativeElement.querySelector('.inscription-steps');
      expect(pasos).withContext('pasos de la asociación presentes').toBeTruthy();
      expect(bloque.compareDocumentPosition(pasos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Administración puede escribir instrucciones en Markdown al crear una inscripción y persisten en el payload de creación', async () => {
      const fixture = await createRenderedComponent(true);
      const component = fixture.componentInstance;
      component.crearNuevaInscripcion();
      fixture.detectChanges();

      component.inscripcionAdminForm.patchValue({
        titulo: 'Nueva inscripción', propietarioId: '1', fechaLimite: '2026-12-31'
      });
      const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.admin-panel textarea.markdown-editor-textarea');
      expect(textarea).withContext('editor Markdown visible en el primer paso').toBeTruthy();
      textarea.value = '## Documentación requerida\n\n- DNI\n- Justificante';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      component.crearInscripcion();

      const secretaria = (component as any).secretariaService as jasmine.SpyObj<SecretariaService>;
      expect(secretaria.crearInscripcion).toHaveBeenCalledWith(jasmine.objectContaining({
        informacion: '## Documentación requerida\n\n- DNI\n- Justificante'
      }));
    });

    it('Administración puede editar posteriormente las instrucciones de una inscripción existente', async () => {
      const fixture = await createRenderedComponent(true);
      const component = fixture.componentInstance;
      component.detailMode = true;
      component.selectInscription({
        id: 'ins-3', titulo: 'Existente', tiposPermitidos: [], campos: [], informacion: 'Instrucciones originales',
        fechaPublicacion: '2026-01-01', fechaLimite: '2026-12-31', propietarioId: 1
      } as any);
      component.adminTab = 'gestion';
      fixture.detectChanges();

      const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.admin-panel textarea.markdown-editor-textarea');
      expect(textarea.value).toBe('Instrucciones originales');
      textarea.value = 'Instrucciones actualizadas';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      component.crearInscripcion();

      const secretaria = (component as any).secretariaService as jasmine.SpyObj<SecretariaService>;
      expect(secretaria.actualizarInscripcion).toHaveBeenCalledWith('ins-3', jasmine.objectContaining({
        informacion: 'Instrucciones actualizadas'
      }));
    });
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

  async function createRenderedComponent(isAdmin = false): Promise<ComponentFixture<InscripcionesComponent>> {
    const secretaria = jasmine.createSpyObj<SecretariaService>('SecretariaService', [
      'getAdjuntosInscripcion', 'getAdjuntos', 'getMiEntradaInscripcion', 'enviarInscripcion',
      'getActividades', 'getInscripciones', 'getResponsablesInscripcion', 'getFormularios',
      'crearInscripcion', 'actualizarInscripcion', 'getInscripcionEntradas'
    ]);
    secretaria.getAdjuntosInscripcion.and.returnValue(of({ adjuntos: [] }));
    secretaria.getAdjuntos.and.returnValue(of({ adjuntos: [] }));
    secretaria.getMiEntradaInscripcion.and.returnValue(of());
    secretaria.enviarInscripcion.and.returnValue(of({ id: 1 }));
    secretaria.getActividades.and.returnValue(of({ actividades: [] }));
    secretaria.getInscripciones.and.returnValue(of({ inscripciones: [], paginacion: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));
    secretaria.getResponsablesInscripcion.and.returnValue(of({ responsables: [] }));
    secretaria.getFormularios.and.returnValue(of({ formularios: [], paginacion: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));
    secretaria.getInscripcionEntradas.and.returnValue(of({ entradas: [] }));
    const inscripcionGuardada = (id: string, informacion: string): any => ({
      id, titulo: 'Guardada', estado: 'abierta', fechaPublicacion: '2026-01-01', fechaLimite: '2026-12-31',
      informacion, tiposPermitidos: [], campos: []
    });
    secretaria.crearInscripcion.and.callFake((payload: any) => of(inscripcionGuardada('ins-nueva', payload?.informacion || '')));
    secretaria.actualizarInscripcion.and.callFake((id: any, payload: any) => of(inscripcionGuardada(String(id), payload?.informacion || '')));

    await TestBed.configureTestingModule({
      imports: [InscripcionesComponent],
      providers: [
        { provide: SecretariaService, useValue: secretaria },
        { provide: CensoService, useValue: { asociacionId: 1, getAsociadosByAsociacion: () => of([]) } },
        { provide: ApiUrlService, useValue: {} },
        { provide: AdminAccessService, useValue: { isAdmin: () => isAdmin } },
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

  function createRecoveredComponent(entrada: any, overrides: { router?: any } = {}): InscripcionesComponent {
    const component = createComponent(entrada, null, undefined, false, overrides);
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

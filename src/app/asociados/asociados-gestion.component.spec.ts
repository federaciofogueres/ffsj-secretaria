import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { FfsjDialogAlertService } from 'ffsj-web-components';

import { CensoService } from '../core/censo.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { EjercicioService } from '../core/ejercicio.service';
import { RubiScreenContextService } from '../rubi/rubi-screen-context.service';
import { AsociadosService } from './asociados.service';
import { AsociadosGestionComponent } from './asociados-gestion.component';

describe('AsociadosGestionComponent', () => {
  let component: AsociadosGestionComponent;
  let fixture: ComponentFixture<AsociadosGestionComponent>;
  let secretariaService: jasmine.SpyObj<SecretariaService>;
  let asociadosService: jasmine.SpyObj<AsociadosService>;
  // G (form-diagnostics, cambio de ejercicio): backed por un BehaviorSubject
  // real para poder reproducir en los tests un cambio de ejercicio emitido
  // por selectedChanges (el selector global), no solo un valor estatico.
  let ejercicioSeleccionado: BehaviorSubject<{ ejercicio: number; activo: boolean } | null>;

  const presidente = {
    id: 100,
    nombre: 'Ana',
    apellidos: 'Presidenta',
    cargo: 'Presidente',
    tipo: 'adulto' as const
  };
  const sustituto = {
    id: 101,
    nombre: 'Luis',
    apellidos: 'Sustituto',
    cargo: '',
    tipo: 'adulto' as const
  };

  // G (form-diagnostics, visibilidad real): permite reconstruir el TestBed
  // con un query param `tab` distinto para reproducir tanto la entrada SIN
  // `?tab=altas` (el bug real en DEV) como la entrada CON el parametro
  // explicito, sin depender de setTab()/patchValue() para simularlo.
  async function configurarTestBed(routeQueryParams: Record<string, string> = {}): Promise<void> {
    secretariaService = jasmine.createSpyObj<SecretariaService>('SecretariaService', [
      'getRegistroPendiente',
      'getSolicitudes',
      'crearRegistroPendiente',
      'crearSolicitud',
      'enviarSolicitud',
      'getCargosCupos'
    ]);
    secretariaService.getRegistroPendiente.and.returnValue(of({ items: [] }));
    secretariaService.getSolicitudes.and.returnValue(of({ solicitudes: [] }));
    secretariaService.getCargosCupos.and.returnValue(of({ cargos: [] }));
    let registroId = 1;
    secretariaService.crearRegistroPendiente.and.callFake((payload: any) => of({
      id: registroId++,
      asociacionId: payload.asociacionId,
      tipo: payload.tipo,
      asociadoId: payload.asociadoId,
      estado: 'pendiente',
      datos: payload.datos,
      datosOriginales: payload.datosOriginales,
      observaciones: payload.observaciones,
      createdAt: '',
      updatedAt: ''
    }));
    secretariaService.crearSolicitud.and.returnValue(of({
      id: 50,
      numero: 'SOL-2026-000050',
      asociacionId: 25,
      tipo: 'baja',
      estado: 'registrada',
      totalRegistros: 2,
      fechaAlta: ''
    }));
    secretariaService.enviarSolicitud.and.returnValue(of({
      id: 50,
      numero: 'SOL-2026-000050',
      asociacionId: 25,
      tipo: 'baja',
      estado: 'enviada',
      totalRegistros: 2,
      fechaAlta: ''
    }));

    asociadosService = jasmine.createSpyObj<AsociadosService>('AsociadosService', ['getAdultos', 'getInfantiles', 'getHistorico']);
    asociadosService.getAdultos.and.returnValue(of([presidente, sustituto]));
    asociadosService.getInfantiles.and.returnValue(of([]));
    asociadosService.getHistorico.and.returnValue(of([
      {
        cargo: 'Presidente',
        ejercicio: new Date().getFullYear(),
        nombreAsociacion: 'Asociacion',
        idCargo: 1,
        idEjercicio: 1,
        idAsociacion: 25,
        active: 1
      }
    ]));

    const censoService = jasmine.createSpyObj<CensoService>('CensoService', ['getCargos', 'getAsociacion']);
    Object.defineProperty(censoService, 'asociacionId', { get: () => 25 });
    censoService.getCargos.and.returnValue(of([{ id: 1, nombre: 'Presidente', requerido: 1 } as any]));
    censoService.getAsociacion.and.returnValue(of({ tipo_asociacion: 2 } as any));

    ejercicioSeleccionado = new BehaviorSubject<{ ejercicio: number; activo: boolean } | null>({ ejercicio: new Date().getFullYear(), activo: true });
    const ejercicioServiceMock = {
      selectedChanges: ejercicioSeleccionado.asObservable(),
      get selectedSnapshot() { return ejercicioSeleccionado.value; },
      get isSelectedActive() { return Boolean(ejercicioSeleccionado.value?.activo); }
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AsociadosGestionComponent],
      providers: [
        { provide: SecretariaService, useValue: secretariaService },
        { provide: AsociadosService, useValue: asociadosService },
        { provide: CensoService, useValue: censoService },
        { provide: PermissionsService, useValue: { hasPermission: () => true } },
        { provide: EjercicioService, useValue: ejercicioServiceMock },
        { provide: FfsjDialogAlertService, useValue: { openDialogAlert: () => ({ afterClosed: () => of(null) }) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: (key: string) => routeQueryParams[key] ?? null } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsociadosGestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configurarTestBed();
  });

  it('abre selector de sustituto cuando una baja afecta a un cargo obligatorio', () => {
    component.toggleSeleccionBaja(presidente);

    component.guardarBajasPendientes();

    expect(component.sustitucionesDialogOpen).toBeTrue();
    expect(component.sustitucionesCargo.length).toBe(1);
    expect(component.sustitutosDisponibles(component.sustitucionesCargo[0]).map(item => item.id)).toEqual([101]);
    expect(secretariaService.crearRegistroPendiente).not.toHaveBeenCalled();
  });

  it('consulta cupos con el tipo real de la asociación', () => {
    expect(secretariaService.getCargosCupos).toHaveBeenCalledWith(25, new Date().getFullYear());
  });

  it('crea una solicitud conjunta con baja y cambio de cargo cuando se confirma el sustituto', () => {
    component.toggleSeleccionBaja(presidente);
    component.guardarBajasPendientes();
    component.sustitucionesCargo[0].sustitutoId = sustituto.id;

    component.confirmarSolicitudConSustituciones();

    expect(secretariaService.crearRegistroPendiente).toHaveBeenCalledTimes(2);
    expect(secretariaService.crearRegistroPendiente.calls.argsFor(0)[0].tipo).toBe('baja');
    expect(secretariaService.crearRegistroPendiente.calls.argsFor(1)[0].tipo).toBe('cambio');
    expect(secretariaService.crearRegistroPendiente.calls.argsFor(1)[0].datos).toEqual(jasmine.objectContaining({
      tramiteOrigen: 'sustitucion_cargo_obligatorio',
      tipoCambio: 'cargo',
      cargoNombre: 'Presidente',
      sustituyeAId: presidente.id
    }));
    expect(secretariaService.crearSolicitud).toHaveBeenCalledWith(jasmine.objectContaining({
      tipo: 'baja',
      registroPendienteIds: [1, 2],
      observaciones: 'Solicitud conjunta: baja y cambio de cargo obligatorio'
    }));
    expect(secretariaService.enviarSolicitud).not.toHaveBeenCalled();
    expect(component.solicitudDetalle).toEqual(jasmine.objectContaining({
      id: 50,
      estado: 'registrada'
    }));
  });

  it('no bloquea al asociado por una solicitud de cambio ya validada', () => {
    component.solicitudes = [{
      id: 51,
      numero: 'SOL-2027-000051',
      asociacionId: 25,
      tipo: 'cambio',
      estado: 'validada',
      totalRegistros: 1,
      fechaAlta: '',
      items: [{
        id: 1,
        solicitudId: 51,
        registroPendienteId: 9,
        tipo: 'cambio',
        datos: { asociadoId: presidente.id },
        estado: 'validado'
      }]
    } as any];

    expect(component.asociadoBloqueado(presidente)).toBeFalse();
  });

  // G (form-diagnostics, formulario normal): reproduce exactamente el bug
  // confirmado en DEV - el formulario NORMAL de alta (no el embebido de Rubi)
  // no publicaba ningun diagnostico en RubiScreenContextService.
  describe('form-diagnostics del formulario normal (bug confirmado en DEV)', () => {
    let rubiScreenContext: RubiScreenContextService;

    beforeEach(() => {
      rubiScreenContext = TestBed.inject(RubiScreenContextService);
    });

    it('CASO A: publica formDiagnostics presente e invalido cuando el formulario de Altas esta visible con datos incompletos', () => {
      component.setTab('altas');
      const context = rubiScreenContext.current;
      expect(context?.module).toBe('asociados');
      expect(context?.view).toBe('gestion');
      expect(context?.tab).toBe('altas');
      expect(context?.state?.formDiagnostics?.present).toBeTrue();
      expect(context?.state?.formDiagnostics?.valid).toBeFalse();
      expect(context?.state?.formDiagnostics?.issues.length).toBeGreaterThan(0);
    });

    it('payload de regresion: el caso real (/asociados/gestion, tab altas, formulario visible) ya no genera un screenContext sin state.formDiagnostics', () => {
      component.setTab('altas');
      const context = rubiScreenContext.current;
      expect(context).toEqual(jasmine.objectContaining({
        version: 1, module: 'asociados', view: 'gestion', tab: 'altas'
      }));
      expect(context?.state?.formDiagnostics).toBeDefined();
    });

    it('CASO B: corregir un campo actualiza el diagnostico en el siguiente mensaje (valueChanges), sin esperar a cambiar de pestana', () => {
      component.setTab('altas');
      let issues = rubiScreenContext.current?.state?.formDiagnostics?.issues || [];
      expect(issues.some(issue => issue.field === 'nombre')).toBeTrue();
      component.altaForm.patchValue({ nombre: 'Ana', apellidos: 'Prueba', nacimiento: '1990-01-01' });
      issues = rubiScreenContext.current?.state?.formDiagnostics?.issues || [];
      expect(issues.some(issue => issue.field === 'nombre')).toBeFalse();
      expect(issues.some(issue => issue.field === 'nacimiento')).toBeFalse();
    });

    it('CASO C: sin cargo seleccionado, formDiagnostics explica que falta seleccionar un cargo (condicion real de guardarRegistroAltaOCambio)', () => {
      component.setTab('altas');
      component.cargosSeleccionadosIds.clear();
      component.quitarCargoSeleccionado(999);
      const issues = rubiScreenContext.current?.state?.formDiagnostics?.issues || [];
      expect(issues).toContain(jasmine.objectContaining({ code: 'ALTA_CARGO_REQUERIDO', source: 'client' }));
    });

    // Bug de contexto (validacion manual DEV): `accionesBloqueadasPorEjercicio`
    // depende del selector GLOBAL de ejercicio, que el usuario puede cambiar
    // sin tocar el formulario, sin cambiar de pestana y sin pulsar ningun
    // boton. Esta suite usa unicamente `ejercicioSeleccionado.next(...)` (el
    // mismo Observable real que consume el componente via
    // `selectedChanges`), nunca `setTab()`/`patchValue()`/una llamada manual
    // a sync, para reproducir exactamente el caso real.
    describe('cambio de ejercicio via selectedChanges (sin tocar el formulario)', () => {
      it('con el formulario de Altas visible y el ejercicio activo, no hay ALTA_EJERCICIO_NO_DISPONIBLE', () => {
        component.setTab('altas');
        const issues = rubiScreenContext.current?.state?.formDiagnostics?.issues || [];
        expect(issues.some(issue => issue.code === 'ALTA_EJERCICIO_NO_DISPONIBLE')).toBeFalse();
      });

      it('emitir un ejercicio NO activo por selectedChanges anade ALTA_EJERCICIO_NO_DISPONIBLE de inmediato, sin ninguna otra accion', () => {
        component.setTab('altas');
        expect(rubiScreenContext.current?.state?.formDiagnostics?.issues.some(issue => issue.code === 'ALTA_EJERCICIO_NO_DISPONIBLE')).toBeFalse();

        ejercicioSeleccionado.next({ ejercicio: 2020, activo: false });

        const issues = rubiScreenContext.current?.state?.formDiagnostics?.issues || [];
        expect(issues).toContain(jasmine.objectContaining({ code: 'ALTA_EJERCICIO_NO_DISPONIBLE', source: 'client' }));
      });

      it('volver a emitir un ejercicio activo hace desaparecer ALTA_EJERCICIO_NO_DISPONIBLE de inmediato', () => {
        component.setTab('altas');
        ejercicioSeleccionado.next({ ejercicio: 2020, activo: false });
        expect(rubiScreenContext.current?.state?.formDiagnostics?.issues.some(issue => issue.code === 'ALTA_EJERCICIO_NO_DISPONIBLE')).toBeTrue();

        ejercicioSeleccionado.next({ ejercicio: new Date().getFullYear(), activo: true });

        const issues = rubiScreenContext.current?.state?.formDiagnostics?.issues || [];
        expect(issues.some(issue => issue.code === 'ALTA_EJERCICIO_NO_DISPONIBLE')).toBeFalse();
      });

      it('limpieza: ngOnDestroy desuscribe de selectedChanges (un evento posterior ya no toca el screenContext)', () => {
        component.setTab('altas');
        fixture.destroy();
        rubiScreenContext.clear();
        ejercicioSeleccionado.next({ ejercicio: 2020, activo: false });
        expect(rubiScreenContext.current).toBeNull();
      });
    });

    it('CASO D: cambiar de Altas a Solicitudes hace desaparecer formDiagnostics de inmediato', () => {
      component.setTab('altas');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeDefined();
      component.setTab('solicitudes');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();
    });

    it('CASO E: cambiar de Altas a Modificaciones no arrastra el diagnostico del alta', () => {
      component.setTab('altas');
      component.altaForm.patchValue({ telefono: 'no-es-un-telefono-valido' });
      expect(rubiScreenContext.current?.state?.formDiagnostics?.issues.some(issue => issue.field === 'telefono')).toBeTrue();
      component.setTab('modificaciones');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();
    });

    it('CASO F: nunca incluye ningun valor introducido en el formulario (PII) en el screenContext publicado', () => {
      component.setTab('altas');
      component.altaForm.patchValue({
        nombre: 'Persona Privada', apellidos: 'Confidencial', telefono: '600123456',
        email: 'persona.privada@example.invalid', identificacion: 'X1234567Z', direccion: 'Calle Falsa 123'
      });
      const raw = JSON.stringify(rubiScreenContext.current);
      for (const secret of ['Persona Privada', 'Confidencial', '600123456', 'persona.privada@example.invalid', 'X1234567Z', 'Calle Falsa 123']) {
        expect(raw).not.toContain(secret);
      }
    });

    it('pestana Bajas nunca inventa un formDiagnostics (no existe un formulario equivalente)', () => {
      component.setTab('bajas');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();
    });

    it('el formulario valido y completo no reporta ningun issue', () => {
      component.setTab('altas');
      component.altaForm.patchValue({
        identificacion: 'X1234567L', nombre: 'Ana', apellidos: 'Prueba', nacimiento: '1990-01-01',
        cp: '03001', telefono: '600111222', email: 'ana@example.invalid'
      });
      const diagnostics = rubiScreenContext.current?.state?.formDiagnostics;
      expect(diagnostics?.valid).toBeTrue();
      expect(diagnostics?.issues).toEqual([]);
    });
  });

  // G (form-diagnostics, visibilidad real - bug real en DEV tras el merge de
  // fix/rubi-normal-form-diagnostics): `mostrarFormMod` NO es "hay un
  // formulario visible", solo controla la visibilidad del formulario de
  // Modificacion. En Altas, la plantilla muestra el formulario SIEMPRE que
  // no se este viendo el listado de pendientes, sin comprobar
  // `mostrarFormMod` en ningun momento. Estos tests reproducen el escenario
  // real: entrar a /asociados/gestion sin `?tab=altas` y sin llamar a
  // setTab()/patchValue()/una sincronizacion manual.
  describe('visibilidad real del formulario (bug real: entrada inicial sin ?tab=altas)', () => {
    let rubiScreenContext: RubiScreenContextService;

    beforeEach(() => {
      rubiScreenContext = TestBed.inject(RubiScreenContextService);
    });

    it('CASO 1 (bug real): entrada normal a /asociados/gestion SIN query param ya publica formDiagnostics presente', () => {
      // No se llama a setTab(), no se parchea estado, no hay sync manual:
      // esto es exactamente lo que hace ngOnInit() con la ActivatedRoute por
      // defecto (sin ?tab=altas). Este test debe fallar con el guard
      // anterior (`if (!this.mostrarFormMod) return undefined;`), porque
      // mostrarFormMod solo se pone a true dentro del `if` de query param.
      expect(component.activeTab).toBe('altas');
      const context = rubiScreenContext.current;
      expect(context?.module).toBe('asociados');
      expect(context?.view).toBe('gestion');
      expect(context?.tab).toBe('altas');
      expect(context?.state?.formDiagnostics?.present).toBeTrue();
    });

    it('payload de regresion: la entrada real sin ?tab=altas produce el payload completo esperado', () => {
      const context = rubiScreenContext.current;
      expect(context).toEqual(jasmine.objectContaining({ version: 1, module: 'asociados', view: 'gestion', tab: 'altas' }));
      expect(context?.state?.formDiagnostics?.present).toBeTrue();
      expect(context?.state?.formDiagnostics?.issues.length).toBeGreaterThan(0);
    });

    it('CASO 2: entrada explicita con ?tab=altas tambien publica formDiagnostics presente', async () => {
      TestBed.resetTestingModule();
      await configurarTestBed({ tab: 'altas' });
      const contextConParam = TestBed.inject(RubiScreenContextService);
      expect(component.activeTab).toBe('altas');
      expect(contextConParam.current?.tab).toBe('altas');
      expect(contextConParam.current?.state?.formDiagnostics?.present).toBeTrue();
    });

    it('CASO 3: abrir pendientes de Alta hace desaparecer formDiagnostics de inmediato, sin sync manual', () => {
      expect(rubiScreenContext.current?.state?.formDiagnostics?.present).toBeTrue();
      component.abrirPendientes('alta');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();
    });

    it('CASO 4: volver desde pendientes de Alta hace reaparecer formDiagnostics de inmediato', () => {
      component.abrirPendientes('alta');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();
      component.volverDesdePendientes();
      expect(rubiScreenContext.current?.state?.formDiagnostics?.present).toBeTrue();
    });

    it('CASO 5: pestana Modificaciones sin persona seleccionada no publica formDiagnostics', () => {
      component.setTab('modificaciones');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();
    });

    it('CASO 6: Modificacion abierta (persona seleccionada) publica formDiagnostics presente', () => {
      component.setTab('modificaciones');
      component.mostrarFormMod = true;
      // setTab() ya sincroniza; forzamos una nueva emision de valueChanges
      // (via un metodo publico, sin tocar el metodo privado de sync) para
      // que el screenContext recoja el mostrarFormMod=true recien puesto,
      // igual que hace la app cuando el formulario reacciona a cualquier
      // cambio real.
      component.altaForm.patchValue({});
      expect(rubiScreenContext.current?.state?.formDiagnostics?.present).toBeTrue();
    });

    it('CASO 7: con la modificacion abierta, abrir pendientes de cambio hace desaparecer formDiagnostics; volver la restaura porque mostrarFormMod sigue en true', () => {
      component.setTab('modificaciones');
      component.mostrarFormMod = true;
      component.altaForm.patchValue({});
      expect(rubiScreenContext.current?.state?.formDiagnostics?.present).toBeTrue();

      component.abrirPendientes('cambio');
      expect(rubiScreenContext.current?.state?.formDiagnostics).toBeUndefined();

      // Comportamiento real: volverDesdePendientes() solo cierra el listado
      // de pendientes; no reabre ni cierra la modificacion por su cuenta.
      // Como mostrarFormMod sigue en true (nadie lo cambio), el formulario
      // de Modificacion vuelve a ser el visible y el diagnostico reaparece.
      component.volverDesdePendientes();
      expect(component.mostrarFormMod).toBeTrue();
      expect(rubiScreenContext.current?.state?.formDiagnostics?.present).toBeTrue();
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FfsjDialogAlertService } from 'ffsj-web-components';

import { SolicitudSecretaria } from '../core/models';
import { CensoService } from '../core/censo.service';
import { SecretariaService } from '../core/secretaria.service';
import { SolicitudesComponent } from './solicitudes.component';

describe('SolicitudesComponent', () => {
  let component: SolicitudesComponent;
  let fixture: ComponentFixture<SolicitudesComponent>;
  let secretariaService: jasmine.SpyObj<SecretariaService>;
  let censoService: jasmine.SpyObj<CensoService>;

  const solicitudes: SolicitudSecretaria[] = [
    {
      id: 1,
      numero: 'SOL-2026-000001',
      asociacionId: 25,
      tipo: 'alta',
      estado: 'enviada',
      totalRegistros: 2,
      fechaAlta: '2026-07-01T10:00:00.000Z',
      fechaRegistro: '2026-07-01T10:00:00.000Z',
      fechaEntrada: '2026-07-01T11:00:00.000Z'
    },
    {
      id: 2,
      numero: 'SOL-2026-000002',
      asociacionId: 30,
      tipo: 'baja',
      estado: 'registrada',
      totalRegistros: 1,
      fechaAlta: '2026-07-02T10:00:00.000Z',
      fechaRegistro: '2026-07-02T10:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    secretariaService = jasmine.createSpyObj<SecretariaService>('SecretariaService', [
      'getSolicitudesGlobal',
      'getSolicitud',
      'validarSolicitud',
      'rechazarSolicitud',
      'finalizarSolicitud',
      'cancelarEnvioSolicitud',
      'getIncidencias',
      'getRegistroDestinatarios',
      'solicitarInformacionRepresentacionLegal'
    ]);
    secretariaService.getSolicitudesGlobal.and.returnValue(of({ solicitudes, paginacion: { page: 1, pageSize: 20, total: 25, totalPages: 2 } }));
    secretariaService.getIncidencias.and.returnValue(of({ incidencias: [] }));
    secretariaService.getRegistroDestinatarios.and.returnValue(of({ destinatarios: [{
      id: 9, nombre: 'Registro', departamentoNombre: 'Secretaría', departamentoId: 1, departamentoCodigo: 'secretaria'
    }] }));
    secretariaService.getSolicitud.and.returnValue(of({
      ...solicitudes[0],
      items: [
        {
          id: 10,
          solicitudId: 1,
          registroPendienteId: 5,
          estado: 'pendiente',
          datos: { nombre: 'Maria', apellidos: 'Prueba', dni: '12345678A' },
          datosOriginales: null
        }
      ]
    }));
    secretariaService.validarSolicitud.and.returnValue(of({ ...solicitudes[0], estado: 'validada' }));
    secretariaService.solicitarInformacionRepresentacionLegal.and.returnValue(of({
      solicitud: { ...solicitudes[0], estado: 'validada' },
      comunicacion: { id: 4, numero: 'REG-4', asociacionId: 25, tipo: 'comunicacion', origen: 'administracion', titulo: 'Representación legal', estado: 'enviada', fechaEntrada: '', adjuntos: [] },
      duplicada: false
    }));
    censoService = jasmine.createSpyObj<CensoService>('CensoService', ['getAsociacion', 'getAsociaciones']);
    censoService.getAsociacion.and.callFake((id: number) => of({
      id,
      cif: '',
      nombre: id === 25 ? 'Doctor Bergez - Carolinas' : 'Otra asociacion'
    }));
    censoService.getAsociaciones.and.returnValue(of([
      { id: 25, cif: '', nombre: 'Doctor Bergez - Carolinas' },
      { id: 30, cif: '', nombre: 'Otra asociacion' }
    ]));

    await TestBed.configureTestingModule({
      imports: [SolicitudesComponent],
      providers: [
        { provide: SecretariaService, useValue: secretariaService },
        { provide: CensoService, useValue: censoService }
        , { provide: FfsjDialogAlertService, useValue: { openDialogAlert: () => ({ afterClosed: () => of(null) }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga solicitudes desde el registro global', () => {
    expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalled();
    expect(censoService.getAsociacion).toHaveBeenCalledWith(25);
    expect(censoService.getAsociacion).toHaveBeenCalledWith(30);
    expect(component.solicitudes.length).toBe(2);
  });

  it('la carga inicial aplica por defecto el filtro Estado: Enviada (conserva el comportamiento actual)', () => {
    expect(component.filtroAplicado).toEqual({ campo: 'estado', valor: 'enviada', etiqueta: 'Estado: Enviada' });
    expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ estado: 'enviada' }));
  });

  describe('0.43.4#ESMERALDA: patrón compacto de búsqueda/filtros', () => {
    it('buscar por Nº de solicitud envía "busqueda" y reinicia la página', () => {
      component.campoBusqueda = 'numero';
      component.valorNumero = '25';
      component.paginaActual = 2;
      component.aplicarBusqueda();

      expect(component.paginaActual).toBe(1);
      expect(component.filtroAplicado).toEqual({ campo: 'numero', valor: '25', etiqueta: 'Nº solicitud: 25' });
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, busqueda: '25' }));
    });

    it('buscar por Tipo envía "tipo" exacto', () => {
      component.campoBusqueda = 'tipo';
      component.valorTipo = 'alta';
      component.aplicarBusqueda();

      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ tipo: 'alta' }));
    });

    // 0.43.5#ESMERALDA: la búsqueda por Asociación admite texto libre parcial
    // (no exige seleccionar una opción exacta del datalist), ya que el
    // nombre no vive en secretaria_solicitudes y se resuelve aquí contra la
    // lista ya cargada a una lista de ids candidatos (asociacionIds).
    it('buscar por Asociación con texto vacío no aplica ningún filtro', () => {
      component.campoBusqueda = 'asociacion';
      component.valorAsociacionTexto = '   ';
      component.aplicarBusqueda();
      expect(component.filtroAplicado).toBeNull();
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ asociacionIds: undefined }));
    });

    it('buscar por Asociación con texto parcial resuelve todas las asociaciones cuyo nombre lo contiene', () => {
      component.campoBusqueda = 'asociacion';
      component.valorAsociacionTexto = 'doc';
      component.aplicarBusqueda();
      expect(component.filtroAplicado).toEqual({ campo: 'asociacion', valor: 'doc', etiqueta: 'Asociación: doc' });
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ asociacionIds: [25] }));
    });

    it('buscar por Asociación no distingue mayúsculas/minúsculas', () => {
      component.campoBusqueda = 'asociacion';
      component.valorAsociacionTexto = 'CAROL';
      component.aplicarBusqueda();
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ asociacionIds: [25] }));
    });

    it('buscar por Asociación sin ninguna coincidencia real envía un id imposible en vez de ignorar el filtro (evita mostrar todas las solicitudes)', () => {
      component.campoBusqueda = 'asociacion';
      component.valorAsociacionTexto = 'nombre que no existe en ninguna asociación';
      component.aplicarBusqueda();
      expect(component.filtroAplicado?.etiqueta).toBe('Asociación: nombre que no existe en ninguna asociación');
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ asociacionIds: [-1] }));
    });

    it('buscar por Fecha de alta envía "fechaAlta"', () => {
      component.campoBusqueda = 'fecha_alta';
      component.valorFechaAlta = '2026-07-11';
      component.aplicarBusqueda();

      expect(component.filtroAplicado?.etiqueta).toBe('Fecha de alta: 11/07/2026');
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ fechaAlta: '2026-07-11' }));
    });

    it('quitar el filtro activo recarga sin él', () => {
      component.quitarFiltro();
      expect(component.filtroAplicado).toBeNull();
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ estado: undefined, tipo: undefined, busqueda: undefined }));
    });

    it('Limpiar filtros restablece todo (filtro, solo problemáticas y borradores)', () => {
      component.soloProblematicas = true;
      component.campoBusqueda = 'tipo';
      component.valorTipo = 'baja';
      component.limpiarFiltros();

      expect(component.filtroAplicado).toBeNull();
      expect(component.soloProblematicas).toBeFalse();
      expect(component.campoBusqueda).toBe('numero');
    });

    it('activar "Solo problemáticas" recarga inmediatamente, sin esperar al botón Buscar', () => {
      secretariaService.getSolicitudesGlobal.calls.reset();
      component.soloProblematicas = true;
      component.cargarSolicitudes(true);
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ soloProblematicas: true }));
    });
  });

  describe('0.43.4#ESMERALDA: ordenación por columnas', () => {
    it('por defecto ordena por fecha de alta descendente', () => {
      expect(component.ordenCampo).toBe('fecha_alta');
      expect(component.ordenDireccion).toBe('desc');
    });

    it('pulsar una columna nueva ordena ascendente por esa columna y reinicia la página', () => {
      component.paginaActual = 3;
      component.ordenarPor('numero');

      expect(component.ordenCampo).toBe('numero');
      expect(component.ordenDireccion).toBe('asc');
      expect(component.paginaActual).toBe(1);
      expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ ordenCampo: 'numero', ordenDireccion: 'asc' }));
    });

    it('pulsar la misma columna dos veces invierte la dirección', () => {
      component.ordenarPor('estado');
      expect(component.ordenDireccion).toBe('asc');
      component.ordenarPor('estado');
      expect(component.ordenDireccion).toBe('desc');
    });

    it('iconoOrden y ariaSort reflejan la columna y dirección activas', () => {
      component.ordenarPor('tipo');
      expect(component.iconoOrden('tipo')).toBe('bi-chevron-up');
      expect(component.ariaSort('tipo')).toBe('ascending');
      expect(component.iconoOrden('estado')).toBe('bi-chevron-expand');
      expect(component.ariaSort('estado')).toBe('none');
    });
  });

  it('cambia de página respetando los límites', () => {
    component.cambiarPagina(1);
    expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({ page: 2 }));

    component.paginaActual = 1;
    component.cambiarPagina(-1);
    expect(component.paginaActual).toBe(1);
  });

  it('permite validar una solicitud enviada', () => {
    component.verSolicitud(solicitudes[0]);
    expect(secretariaService.getSolicitud).toHaveBeenCalledWith(1);
    expect(component.detalleDialogOpen).toBeTrue();

    component.validar();

    expect(secretariaService.validarSolicitud).toHaveBeenCalledWith(1);
    expect(component.detalle?.estado).toBe('validada');
  });

  it('ofrece solicitar información tras una validación excepcional', () => {
    secretariaService.validarSolicitud.and.returnValue(of({
      ...solicitudes[0], estado: 'validada', validacionExcepcionalRepresentacionLegal: {
        menores: [{ itemId: 10, nombre: 'Maria', apellidos: 'Prueba' }]
      }
    }));
    component.verSolicitud(solicitudes[0]);
    component.validar();

    expect(component.solicitudConRepresentacionPendiente?.id).toBe(1);
    component.solicitarInformacionRepresentacionLegal();
    expect(secretariaService.solicitarInformacionRepresentacionLegal).toHaveBeenCalledWith(1, 9);
  });

  describe('0.43.4#ESMERALDA: errores mediante toast (ya no bloque embebido)', () => {
    it('no existe ya el bloque de error embebido en el listado', () => {
      expect(fixture.nativeElement.querySelector('.alert-danger')).toBeNull();
    });

    it('un error de carga muestra el toast, y cerrarlo (aspa o click) lo retira', () => {
      secretariaService.getSolicitudesGlobal.and.returnValue(of({ solicitudes: [], paginacion: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));
      (component as any).error = 'No se han podido cargar las solicitudes.';
      fixture.detectChanges();

      const toast: HTMLElement = fixture.nativeElement.querySelector('app-toast');
      expect(toast).withContext('el toast debe aparecer cuando hay un error').toBeTruthy();
      expect(toast.textContent).toContain('No se han podido cargar las solicitudes.');

      const cerrar: HTMLButtonElement = toast.querySelector('.ffsj-toast-close')!;
      cerrar.click();
      fixture.detectChanges();

      expect(component.error).toBe('');
      expect(fixture.nativeElement.querySelector('app-toast')).toBeNull();
    });
  });

  it('permite cerrar el dialogo de detalle', () => {
    component.verSolicitud(solicitudes[0]);
    component.cerrarDetalle();

    expect(component.detalleDialogOpen).toBeFalse();
  });

  it('organiza el detalle en pestañas navegables con teclado', () => {
    component.verSolicitud(solicitudes[0]);
    component.activarPestanaDetalle('cambios');
    component.navegarPestanasDetalle(new KeyboardEvent('keydown', { key: 'ArrowRight' }), 1);

    expect(component.pestanaDetalle).toBe('incidencias');
  });

  it('presenta los cambios de un asociado con efecto y valores comparables', () => {
    const item = {
      id: 12,
      solicitudId: 1,
      registroPendienteId: 7,
      tipo: 'cambio' as const,
      estado: 'pendiente',
      datos: { nombre: 'Maria', telefono: '600000001' },
      datosOriginales: { nombre: 'Maria', telefono: '600000000' }
    };

    expect(component.efectoItem(item)).toBe('Actualización de datos propuesta');
    expect(component.diferenciasItem(item)).toEqual([{ campo: 'Teléfono', anterior: '600000000', nuevo: '600000001' }]);
  });

  it('identifica cambios de cargo dentro de una solicitud conjunta de baja', () => {
    const item = {
      id: 11,
      solicitudId: 2,
      registroPendienteId: 6,
      tipo: 'cambio' as const,
      estado: 'pendiente',
      datos: {
        nombre: 'Luis',
        apellidos: 'Sustituto',
        tipoCambio: 'cargo',
        cargoNombre: 'Presidente',
        ejercicio: 2026,
        sustituyeANombre: 'Ana Presidenta'
      },
      datosOriginales: null
    };

    component.detalle = { ...solicitudes[1], items: [item] };

    expect(component.labelTipoItem(item)).toBe('Cambio de cargo');
    expect(component.cambiosItem(item)).toEqual([
      'Cargo: Presidente',
      'Ejercicio: 2026',
      'Sustituye a: Ana Presidenta'
    ]);
  });

  it('completa los datos heredados de una cesión y el DNI original en el detalle', () => {
    component.detalle = { ...solicitudes[1], ejercicio: 2026 };
    const item = {
      id: 13,
      solicitudId: 2,
      registroPendienteId: 8,
      tipo: 'cambio' as const,
      estado: 'pendiente',
      datos: {
        nombre: 'Irene',
        apellidos: 'Artiaga Inocencio',
        tipoCambio: 'cargo',
        cargoNombres: ['Vocal'],
        cedeCargoANombre: 'Daniel Perez Brotons'
      },
      datosOriginales: { dni: '48570119P' }
    };

    expect(component.identifierItem(item)).toBe('48570119P');
    expect(component.cambiosItem(item)).toEqual([
      'Cargo: Vocal',
      'Ejercicio: 2026',
      'Cede a: Daniel Perez Brotons'
    ]);
    expect(component.diferenciasItem(item)[1].nuevo).toBe('2026');
  });

  it('no muestra una sustitución inexistente en un cambio de cargo conjunto', () => {
    component.detalle = { ...solicitudes[1], ejercicio: 2027 };
    const item = {
      id: 14,
      solicitudId: 2,
      registroPendienteId: 9,
      tipo: 'cambio' as const,
      estado: 'pendiente',
      datos: { tipoCambio: 'cargo', cargoNombres: ['Asociado/a', 'Presidencia'] },
      datosOriginales: null
    };

    expect(component.cambiosItem(item)).toEqual([
      'Cargo: Asociado/a, Presidencia',
      'Ejercicio: 2027'
    ]);
    expect(component.diferenciasItem(item).map(diferencia => diferencia.campo)).not.toContain('Sustituye a');
  });
});

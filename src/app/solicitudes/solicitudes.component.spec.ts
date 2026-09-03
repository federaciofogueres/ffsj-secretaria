import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

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
      'getIncidencias'
    ]);
    secretariaService.getSolicitudesGlobal.and.returnValue(of({ solicitudes, paginacion: { page: 1, pageSize: 20, total: 25, totalPages: 2 } }));
    secretariaService.getIncidencias.and.returnValue(of({ incidencias: [] }));
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
    censoService = jasmine.createSpyObj<CensoService>('CensoService', ['getAsociacion']);
    censoService.getAsociacion.and.callFake((id: number) => of({
      id,
      cif: '',
      nombre: id === 25 ? 'Doctor Bergez - Carolinas' : 'Otra asociacion'
    }));

    await TestBed.configureTestingModule({
      imports: [SolicitudesComponent],
      providers: [
        { provide: SecretariaService, useValue: secretariaService },
        { provide: CensoService, useValue: censoService }
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

  it('envía filtros al servidor y reinicia la página', () => {
    component.filtroTipo = 'alta';
    component.filtroTexto = '25';
    component.paginaActual = 2;
    component.aplicarFiltros();

    expect(component.paginaActual).toBe(1);
    expect(secretariaService.getSolicitudesGlobal).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 1, tipo: 'alta', busqueda: '25'
    }));
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
      'Sustituye a: Daniel Perez Brotons'
    ]);
    expect(component.diferenciasItem(item)[1].nuevo).toBe('2026');
  });
});

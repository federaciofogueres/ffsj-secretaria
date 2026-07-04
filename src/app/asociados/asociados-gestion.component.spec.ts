import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FfsjDialogAlertService } from 'ffsj-web-components';

import { CensoService } from '../core/censo.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { AsociadosService } from './asociados.service';
import { AsociadosGestionComponent } from './asociados-gestion.component';

describe('AsociadosGestionComponent', () => {
  let component: AsociadosGestionComponent;
  let fixture: ComponentFixture<AsociadosGestionComponent>;
  let secretariaService: jasmine.SpyObj<SecretariaService>;
  let asociadosService: jasmine.SpyObj<AsociadosService>;

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

  beforeEach(async () => {
    secretariaService = jasmine.createSpyObj<SecretariaService>('SecretariaService', [
      'getRegistroPendiente',
      'getSolicitudes',
      'crearRegistroPendiente',
      'crearSolicitud',
      'enviarSolicitud'
    ]);
    secretariaService.getRegistroPendiente.and.returnValue(of({ items: [] }));
    secretariaService.getSolicitudes.and.returnValue(of({ solicitudes: [] }));
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

    const censoService = jasmine.createSpyObj<CensoService>('CensoService', ['getCargos']);
    Object.defineProperty(censoService, 'asociacionId', { get: () => 25 });
    censoService.getCargos.and.returnValue(of([{ id: 1, nombre: 'Presidente', requerido: 1 } as any]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AsociadosGestionComponent],
      providers: [
        { provide: SecretariaService, useValue: secretariaService },
        { provide: AsociadosService, useValue: asociadosService },
        { provide: CensoService, useValue: censoService },
        { provide: PermissionsService, useValue: { hasPermission: () => true } },
        { provide: FfsjDialogAlertService, useValue: { openDialogAlert: () => ({ afterClosed: () => of(null) }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsociadosGestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('abre selector de sustituto cuando una baja afecta a un cargo obligatorio', () => {
    component.toggleSeleccionBaja(presidente);

    component.guardarBajasPendientes();

    expect(component.sustitucionesDialogOpen).toBeTrue();
    expect(component.sustitucionesCargo.length).toBe(1);
    expect(component.sustitutosDisponibles(component.sustitucionesCargo[0]).map(item => item.id)).toEqual([101]);
    expect(secretariaService.crearRegistroPendiente).not.toHaveBeenCalled();
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
    expect(secretariaService.enviarSolicitud).toHaveBeenCalledWith(50);
  });
});

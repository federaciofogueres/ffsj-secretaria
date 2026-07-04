import { HttpClient } from '@angular/common/http';
import { AuthService } from 'ffsj-web-components';

import { ApiUrlService } from './api-url.service';
import { CensoService } from './censo.service';

describe('CensoService', () => {
  let service: CensoService;

  beforeEach(() => {
    service = new CensoService(
      jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'put']),
      { censoBasePath: 'http://censo.test' } as ApiUrlService,
      jasmine.createSpyObj<AuthService>('AuthService', ['getIdAsociacion', 'getToken'])
    );
  });

  it('clasifica provisionalmente como infantil a los menores de 18 anos a 01/07/2026', () => {
    const asociado = (service as any).mapAsociado({
      id: 1,
      nombre: 'Infantil',
      apellidos: 'Prueba',
      fecha_nacimiento: '02/07/2008'
    });

    expect(asociado.tipo).toBe('infantil');
  });

  it('clasifica como adulto a quien ya tiene 18 anos a 01/07/2026', () => {
    const asociado = (service as any).mapAsociado({
      id: 2,
      nombre: 'Adulto',
      apellidos: 'Prueba',
      fecha_nacimiento: '01/07/2008'
    });

    expect(asociado.tipo).toBe('adulto');
  });

  it('mapea el historico de cargos de un asociado', () => {
    const historico = (service as any).mapHistoricoAsociado({
      cargo: 'Secretaria',
      ejercicio: 2026,
      nombreAsociacion: 'Doctor Bergez - Carolinas',
      idCargo: 16,
      idEjercicio: 5,
      idAsociacion: 25,
      active: 1
    });

    expect(historico).toEqual({
      cargo: 'Secretaria',
      ejercicio: 2026,
      nombreAsociacion: 'Doctor Bergez - Carolinas',
      idCargo: 16,
      idEjercicio: 5,
      idAsociacion: 25,
      active: 1
    });
  });

  it('mapea datos completos del asociado para formularios de modificacion', () => {
    const asociado = (service as any).mapAsociado({
      id: 354,
      nif: '48627219K',
      nombre: 'Judit',
      apellidos: 'Esteban Garcia',
      telefono: '627 133 062',
      email: null,
      direccion: 'C/ Doctor Bergez n 78 6B',
      codigo_postal: '03012',
      fecha_nacimiento: '1994-01-18 00:00:00.000'
    });

    expect(asociado.dni).toBe('48627219K');
    expect(asociado.telefono).toBe('627 133 062');
    expect(asociado.direccion).toBe('C/ Doctor Bergez n 78 6B');
    expect(asociado.codigoPostal).toBe('03012');
    expect(asociado.fechaNacimiento).toBe('1994-01-18');
  });
});

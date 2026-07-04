import { of } from 'rxjs';

import { AsociadosService } from './asociados.service';
import { CensoService } from '../core/censo.service';
import { AdminAccessService } from '../core/admin-access.service';
import { HistoricoAsociado } from '../core/models';

describe('AsociadosService', () => {
  const historico: HistoricoAsociado[] = [
    {
      cargo: 'Secretaria',
      ejercicio: 2026,
      nombreAsociacion: 'Doctor Bergez - Carolinas',
      idCargo: 16,
      idEjercicio: 5,
      idAsociacion: 25,
      active: 1
    },
    {
      cargo: 'Presidenta',
      ejercicio: 2025,
      nombreAsociacion: 'Otra asociacion',
      idCargo: 1,
      idEjercicio: 4,
      idAsociacion: 99,
      active: 0
    }
  ];

  function createService(isAdmin: boolean, asociacionId = 25): AsociadosService {
    const censo = jasmine.createSpyObj<CensoService>(
      'CensoService',
      ['getAsociadosByAsociacion', 'getHistoricoByAsociado'],
      { asociacionId }
    );
    censo.getAsociadosByAsociacion.and.returnValue(of([]));
    censo.getHistoricoByAsociado.and.returnValue(of(historico));

    const adminAccess = jasmine.createSpyObj<AdminAccessService>('AdminAccessService', ['isAdmin']);
    adminAccess.isAdmin.and.returnValue(isAdmin);

    return new AsociadosService(censo, adminAccess);
  }

  it('filtra el historico por la asociacion autenticada en acceso de asociacion', done => {
    createService(false, 25).getHistorico(8976).subscribe(result => {
      expect(result.length).toBe(1);
      expect(result[0].idAsociacion).toBe(25);
      done();
    });
  });

  it('devuelve todo el historico para administradores globales', done => {
    createService(true, -1).getHistorico(8976).subscribe(result => {
      expect(result.length).toBe(2);
      expect(result.map(item => item.idAsociacion)).toEqual([25, 99]);
      done();
    });
  });

  it('rellena el cargo del listado con el cargo del ejercicio actual', done => {
    const currentYear = new Date().getFullYear();
    const censo = jasmine.createSpyObj<CensoService>(
      'CensoService',
      ['getAsociadosByAsociacion', 'getHistoricoByAsociado'],
      { asociacionId: 25 }
    );
    censo.getAsociadosByAsociacion.and.returnValue(
      of([
        {
          id: 8976,
          nombre: 'Usuario',
          apellidos: 'Demo',
          cargo: '',
          tipo: 'adulto'
        }
      ])
    );
    censo.getHistoricoByAsociado.and.returnValue(
      of([
        {
          cargo: 'Secretaria',
          ejercicio: currentYear,
          nombreAsociacion: 'Doctor Bergez - Carolinas',
          idCargo: 16,
          idEjercicio: 5,
          idAsociacion: 25,
          active: 1
        },
        {
          cargo: 'Presidenta',
          ejercicio: currentYear - 1,
          nombreAsociacion: 'Doctor Bergez - Carolinas',
          idCargo: 1,
          idEjercicio: 4,
          idAsociacion: 25,
          active: 0
        }
      ])
    );

    const adminAccess = jasmine.createSpyObj<AdminAccessService>('AdminAccessService', ['isAdmin']);
    adminAccess.isAdmin.and.returnValue(false);

    new AsociadosService(censo, adminAccess).getAdultos().subscribe(result => {
      expect(result[0].cargo).toBe('Secretaria');
      done();
    });
  });
});

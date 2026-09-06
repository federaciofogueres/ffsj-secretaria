import { of } from 'rxjs';

import { AsociadosService } from './asociados.service';
import { CensoService } from '../core/censo.service';
import { AdminAccessService } from '../core/admin-access.service';
import { HistoricoAsociado } from '../core/models';
import { EjercicioService } from '../core/ejercicio.service';

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
    const ejercicioService = { selectedChanges: of({ ejercicio: 2026 }) } as EjercicioService;

    return new AsociadosService(censo, adminAccess, ejercicioService);
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

  it('usa el listado agregado con los cargos del ejercicio seleccionado', done => {
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
    const adminAccess = jasmine.createSpyObj<AdminAccessService>('AdminAccessService', ['isAdmin']);
    adminAccess.isAdmin.and.returnValue(false);
    const ejercicioService = { selectedChanges: of({ ejercicio: currentYear }) } as EjercicioService;

    new AsociadosService(censo, adminAccess, ejercicioService).getAdultos().subscribe(result => {
      expect(result[0].cargo).toBe('');
      expect(censo.getAsociadosByAsociacion).toHaveBeenCalledWith(25, currentYear);
      expect(censo.getHistoricoByAsociado).not.toHaveBeenCalled();
      done();
    });
  });
});

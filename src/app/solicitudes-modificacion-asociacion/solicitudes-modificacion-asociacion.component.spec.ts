import { of } from 'rxjs';

import { SolicitudModificacionAsociacion } from '../core/models';
import { CensoService } from '../core/censo.service';
import { SecretariaService } from '../core/secretaria.service';
import { SolicitudesModificacionAsociacionComponent } from './solicitudes-modificacion-asociacion.component';

describe('SolicitudesModificacionAsociacionComponent', () => {
  const pendiente: SolicitudModificacionAsociacion = {
    id: 81,
    asociacionId: 34,
    solicitante: { id: 'usuario-9', nombre: 'Usuario de prueba', email: null },
    fechaSolicitud: '2026-09-15T10:00:00Z',
    datosActuales: { nombre: 'Colla actual' },
    datosPropuestos: { nombre: 'Colla propuesta' },
    estado: 'pendiente',
    resueltoPor: null,
    fechaResolucion: null
  };

  for (const decision of ['aprobada', 'rechazada'] as const) {
    it(`cierra el detalle y recarga pendientes tras ${decision}`, () => {
      const secretaria = jasmine.createSpyObj<SecretariaService>('SecretariaService', ['resolverSolicitudModificacionAsociacion']);
      const censo = jasmine.createSpyObj<CensoService>('CensoService', ['getAsociacion']);
      const component = new SolicitudesModificacionAsociacionComponent(secretaria, censo);
      const resuelta: SolicitudModificacionAsociacion = {
        ...pendiente,
        estado: decision,
        resueltoPor: { id: 'admin-7', nombre: 'Administradora' },
        fechaResolucion: '2026-09-15T10:05:00Z'
      };
      secretaria.resolverSolicitudModificacionAsociacion.and.returnValue(of(resuelta));
      component.solicitudes = [pendiente];
      component.seleccionada = pendiente;
      const cargar = spyOn(component, 'cargar');

      component.resolver(decision);

      expect(secretaria.resolverSolicitudModificacionAsociacion).toHaveBeenCalledWith(pendiente.id, decision);
      expect(component.seleccionada).toBeNull();
      expect(component.solicitudes).toEqual([]);
      expect(component.resolving).toBeFalse();
      expect(cargar).toHaveBeenCalled();
    });
  }
});

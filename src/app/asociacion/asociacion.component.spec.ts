import { FormBuilder } from '@angular/forms';

import { AsociacionComponent } from './asociacion.component';
import { CensoService } from '../core/censo.service';
import { ErrorService } from '../core/error.service';
import { PermissionsService } from '../core/permissions.service';

describe('AsociacionComponent', () => {
  let component: AsociacionComponent;

  beforeEach(() => {
    component = new AsociacionComponent(
      new FormBuilder(),
      jasmine.createSpyObj<CensoService>('CensoService', ['getAsociacion', 'updateAsociacion']),
      jasmine.createSpyObj<ErrorService>('ErrorService', ['show']),
      jasmine.createSpyObj<PermissionsService>('PermissionsService', ['hasPermission'])
    );
  });

  it('separa localidad, codigo postal y direccion cuando censo devuelve direccion compuesta', () => {
    const result = (component as any).mapAssociation({
      id: 25,
      nombre: 'Doctor Bergez - Carolinas',
      cif: 'G03628971',
      direccion: 'Alicante, 03110, C/ Del Gust n 5-B',
      tipo_asociacion: 2
    });

    expect(result.basic.city).toBe('Alicante');
    expect(result.basic.postalCode).toBe('03110');
    expect(result.basic.address).toBe('C/ Del Gust n 5-B');
  });

  it('envia direccion, localidad y codigo postal separados a la API de censo', () => {
    (component as any).rawAssociation = {
      id: 25,
      nombre: 'Doctor Bergez - Carolinas',
      cif: 'G03628971',
      direccion: 'Alicante, 03110, C/ Del Gust n 5-B',
      tipo_asociacion: 2,
      active: 1
    };

    const payload = (component as any).mapFormToPayload({
      basic: {
        name: 'Doctor Bergez - Carolinas',
        cif: 'G03628971',
        tag: '2',
        address: 'C/ Del Gust n 5-B',
        postalCode: '03110',
        city: 'Alicante',
        province: ''
      },
      publicInfo: {
        foundationYear: '',
        hymn: '',
        motto: '',
        monumentLocation: '',
        gateLocation: ''
      },
      headquarters: {
        address: '',
        postalCode: '',
        city: '',
        province: ''
      },
      contact: {
        email: '',
        phone: ''
      }
    });

    expect(payload.direccion).toBe('C/ Del Gust n 5-B');
    expect(payload.localidad).toBe('Alicante');
    expect(payload.codigo_postal).toBe('03110');
    expect(payload.tipo_asociacion).toBe(2);
    expect(payload.active).toBeTrue();
  });

  it('muestra la etiqueta del tipo de asociacion a partir del codigo numerico', () => {
    expect(component.getTipoLabel('2')).toBe('Foguera');
    expect(component.getTipoLabel('1')).toBe('Barraca');
    expect(component.getTipoLabel(null)).toBe('');
  });
});

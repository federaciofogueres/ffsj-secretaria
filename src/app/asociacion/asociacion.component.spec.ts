import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { AsociacionComponent } from './asociacion.component';
import { CensoService } from '../core/censo.service';
import { ErrorService } from '../core/error.service';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

describe('AsociacionComponent', () => {
  let component: AsociacionComponent;

  beforeEach(() => {
    component = new AsociacionComponent(
      new FormBuilder(),
      jasmine.createSpyObj<CensoService>('CensoService', ['getAsociacion', 'updateAsociacion', 'cambiarPasswordAsociacion']),
      jasmine.createSpyObj<SecretariaService>('SecretariaService', ['crearSolicitudModificacionAsociacion', 'crearRegistroPendiente', 'crearSolicitud']),
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
    expect(payload.active).toBeUndefined();
    expect(payload.img).toBeUndefined();
  });

  it('muestra la etiqueta del tipo de asociacion a partir del codigo numerico', () => {
    expect(component.getTipoLabel('2')).toBe('Foguera');
    expect(component.getTipoLabel('1')).toBe('Barraca');
    expect(component.getTipoLabel(null)).toBe('');
  });

  it('conserva el mensaje funcional seguro devuelto por Censo API al guardar', () => {
    expect((component as any).saveErrorMessage({ error: { status: { message: 'El campo nombre de la asociación es obligatorio.' } } }))
      .toBe('El campo nombre de la asociación es obligatorio.');
  });

  it('envia una solicitud independiente y mantiene intactos los datos oficiales', () => {
    const censo = (component as any).censoService as jasmine.SpyObj<CensoService>;
    const secretaria = (component as any).secretariaService as jasmine.SpyObj<SecretariaService>;
    const permisos = (component as any).permissions as jasmine.SpyObj<PermissionsService>;
    const oficial = { id: 25, nombre: 'Asociación oficial', cif: 'G03628971', telefono: '960000001', email: 'oficial@example.test', tipo_asociacion: 2 };

    (component as any).rawAssociation = oficial;
    (component as any).association = (component as any).mapAssociation(oficial);
    component.form = (component as any).buildForm((component as any).association);
    component.form.patchValue({ basic: { name: 'Asociación propuesta' }, contact: { phone: '960000002', email: 'propuesta@example.test' } });
    permisos.hasPermission.and.returnValue(true);
    secretaria.crearSolicitudModificacionAsociacion.and.returnValue(of({} as any));

    component.save();

    expect(secretaria.crearSolicitudModificacionAsociacion).toHaveBeenCalledWith(jasmine.objectContaining({
      datosActuales: jasmine.objectContaining({ nombre: 'Asociación oficial', telefono: '960000001' }),
      datosPropuestos: jasmine.objectContaining({ nombre: 'Asociación propuesta', telefono: '960000002', email: 'propuesta@example.test' })
    }));
    expect(censo.updateAsociacion).not.toHaveBeenCalled();
    expect(secretaria.crearRegistroPendiente).not.toHaveBeenCalled();
    expect(secretaria.crearSolicitud).not.toHaveBeenCalled();
    expect((component as any).rawAssociation).toEqual(oficial);
  });

  it('no envia el cambio de contraseña si la confirmación no coincide', () => {
    const censo = (component as any).censoService as jasmine.SpyObj<CensoService>;
    const permisos = (component as any).permissions as jasmine.SpyObj<PermissionsService>;
    permisos.hasPermission.and.returnValue(true);
    component.passwordForm.setValue({ actual: 'actual-segura', nueva: 'nueva-segura', confirmacion: 'otra-segura' });

    component.cambiarPassword();

    expect(censo.cambiarPasswordAsociacion).not.toHaveBeenCalled();
    expect(component.passwordError).toBe('La nueva contraseña y su confirmación no coinciden.');
  });

  it('envia al endpoint las contraseñas validadas y no conserva los valores tras actualizar', () => {
    const censo = (component as any).censoService as jasmine.SpyObj<CensoService>;
    const permisos = (component as any).permissions as jasmine.SpyObj<PermissionsService>;
    permisos.hasPermission.and.returnValue(true);
    censo.cambiarPasswordAsociacion.and.returnValue(of(void 0));
    component.passwordForm.setValue({ actual: 'actual-segura', nueva: 'nueva-segura', confirmacion: 'nueva-segura' });

    component.cambiarPassword();

    expect(censo.cambiarPasswordAsociacion).toHaveBeenCalledWith('actual-segura', 'nueva-segura');
    expect(component.passwordForm.getRawValue()).toEqual({ actual: null, nueva: null, confirmacion: null });
    expect(component.passwordSuccess).toBe('Contraseña actualizada correctamente.');
  });
});

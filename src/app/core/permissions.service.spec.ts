import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ffsj-web-components';

import { ApiUrlService } from './api-url.service';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getIdAsociacion', 'getToken', 'getCargos']);
    auth.getIdAsociacion.and.returnValue(25);
    auth.getToken.and.returnValue('token-asociacion');
    auth.getCargos.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        PermissionsService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ApiUrlService,
          useValue: {
            secretariaBasePath: 'http://secretaria-api.test',
            censoBasePath: 'http://censo-api.test',
            filesBasePath: 'http://files.test'
          }
        },
        { provide: AuthService, useValue: auth }
      ]
    });

    service = TestBed.inject(PermissionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('carga el contexto con el id de asociacion del token y cabecera bearer', () => {
    service.loadContext().subscribe(context => {
      expect(context?.asociacionId).toBe(25);
      expect(service.hasPermission('asociados:read')).toBeTrue();
      expect(service.hasPermission('admin:read')).toBeFalse();
    });

    const req = httpMock.expectOne(request =>
      request.method === 'GET' &&
      request.url === 'http://secretaria-api.test/contexto' &&
      request.params.get('asociacionId') === '25'
    );

    expect(req.request.headers.get('Authorization')).toBe('Bearer token-asociacion');

    req.flush({
      asociacionId: 25,
      usuario: 'G03628971',
      nombre: 'Asociacion de prueba',
      asociacionNombre: 'Asociacion de prueba',
      permisos: ['asociacion:read', 'asociados:read']
    });
  });

  it('deja la sesion sin permisos si no hay asociacion autenticada', () => {
    auth.getIdAsociacion.and.returnValue(-1);
    auth.getCargos.and.returnValue([]);

    service.loadContext().subscribe(context => {
      expect(context).toBeNull();
      expect(service.permisosSnapshot).toEqual([]);
    });
  });

  it('carga contexto de administracion sin enviar id de asociado como asociacion', () => {
    auth.getIdAsociacion.and.returnValue(8976);
    auth.getCargos.and.returnValue([{ idCargo: 16, idAsociado: 8976 }]);

    service.loadContext(8976).subscribe(context => {
      expect(context?.permisos).toEqual(['admin:read', 'asociados:read']);
      expect(service.hasPermission('admin:read')).toBeTrue();
      expect(service.hasPermission('asociados:read')).toBeTrue();
    });

    const req = httpMock.expectOne(request =>
      request.method === 'GET' &&
      request.url === 'http://secretaria-api.test/contexto' &&
      !request.params.has('asociacionId')
    );

    expect(req.request.headers.get('Authorization')).toBe('Bearer token-asociacion');

    req.flush({
      asociacionId: 1,
      usuario: 'admin',
      nombre: 'Admin',
      asociacionNombre: 'Federacio',
      permisos: ['admin:read', 'asociados:read']
    });
  });
});

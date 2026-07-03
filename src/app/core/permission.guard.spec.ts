import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { of } from 'rxjs';

import { permissionGuard } from './permission.guard';
import { PermissionsService } from './permissions.service';

describe('permissionGuard', () => {
  function runGuard(permission: string | undefined, canAccess: boolean) {
    const router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    const urlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(urlTree);

    const permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['can']);
    permissions.can.and.returnValue(of(canAccess));

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: PermissionsService, useValue: permissions }
      ]
    });

    const route = { data: permission ? { permission } : {} } as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => permissionGuard(route, state));
    return { result, router, permissions, urlTree };
  }

  it('permite la ruta si no declara permiso', () => {
    const { result } = runGuard(undefined, false);
    expect(result).toBeTrue();
  });

  it('permite la ruta cuando el servicio concede permiso', done => {
    const { result } = runGuard('asociados:read', true);
    (result as any).subscribe((value: boolean) => {
      expect(value).toBeTrue();
      done();
    });
  });

  it('redirige a inicio cuando falta permiso', done => {
    const { result, urlTree } = runGuard('asociados:read', false);
    (result as any).subscribe((value: UrlTree) => {
      expect(value).toBe(urlTree);
      done();
    });
  });
});

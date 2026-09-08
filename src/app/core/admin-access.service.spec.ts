import { PermissionsService } from './permissions.service';
import { AdminAccessService } from './admin-access.service';

describe('AdminAccessService', () => {
  it('reconoce el permiso de acceso administrativo', () => {
    const permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['hasPermission']);
    permissions.hasPermission.and.returnValue(true);

    const service = new AdminAccessService(permissions);

    expect(service.isAdmin()).toBeTrue();
  });

  it('rechaza usuarios sin acceso administrativo', () => {
    const permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['hasPermission']);
    permissions.hasPermission.and.returnValue(false);

    const service = new AdminAccessService(permissions);

    expect(service.isAdmin()).toBeFalse();
  });
});

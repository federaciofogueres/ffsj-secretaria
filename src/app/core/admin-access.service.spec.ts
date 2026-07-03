import { AuthService } from 'ffsj-web-components';

import { ADMIN_CARGO_ID, AdminAccessService } from './admin-access.service';

describe('AdminAccessService', () => {
  it('detecta cargo admin por idCargo', () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCargos']);
    auth.getCargos.and.returnValue([{ idCargo: ADMIN_CARGO_ID }]);

    const service = new AdminAccessService(auth);

    expect(service.isAdmin()).toBeTrue();
  });

  it('rechaza usuarios sin cargo admin', () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCargos']);
    auth.getCargos.and.returnValue([{ idCargo: 1 }]);

    const service = new AdminAccessService(auth);

    expect(service.isAdmin()).toBeFalse();
  });
});

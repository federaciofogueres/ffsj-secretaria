import { Router } from '@angular/router';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('redirige al inicio cuando el login de asociacion es correcto', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const component = new LoginComponent(router);

    component.onLogStatus(true);

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });

  it('no redirige cuando el login de asociacion falla', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const component = new LoginComponent(router);

    component.onLogStatus(false);

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});

import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'ffsj-web-components';
import { Subject } from 'rxjs';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('redirige al inicio cuando el login de asociacion es correcto', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', [], {
      loginStatusObservable: new Subject<boolean>().asObservable()
    });
    const zone = { run: (work: () => void) => work() } as NgZone;
    const component = new LoginComponent(router, auth, zone);

    component.onLogStatus(true);

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });

  it('no redirige cuando el login de asociacion falla', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', [], {
      loginStatusObservable: new Subject<boolean>().asObservable()
    });
    const zone = { run: (work: () => void) => work() } as NgZone;
    const component = new LoginComponent(router, auth, zone);

    component.onLogStatus(false);

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('redirige si AuthService emite sesion iniciada', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const loginStatus = new Subject<boolean>();
    const auth = jasmine.createSpyObj<AuthService>('AuthService', [], {
      loginStatusObservable: loginStatus.asObservable()
    });
    const zone = { run: (work: () => void) => work() } as NgZone;
    const component = new LoginComponent(router, auth, zone);

    component.ngOnInit();
    loginStatus.next(true);
    component.ngOnDestroy();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });

  it('no redirige dos veces si llegan evento y emision global de login', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const loginStatus = new Subject<boolean>();
    const auth = jasmine.createSpyObj<AuthService>('AuthService', [], {
      loginStatusObservable: loginStatus.asObservable()
    });
    const zone = { run: (work: () => void) => work() } as NgZone;
    const component = new LoginComponent(router, auth, zone);

    component.ngOnInit();
    component.onLogStatus(true);
    loginStatus.next(true);
    component.ngOnDestroy();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/');
  });
});

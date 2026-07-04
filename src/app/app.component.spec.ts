import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from 'ffsj-web-components';

import { AppComponent } from './app.component';
import { AdminAccessService } from './core/admin-access.service';
import { PermissionsService } from './core/permissions.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => false, logout: () => undefined, loginStatusObservable: of(false) } },
        { provide: AdminAccessService, useValue: { isAdmin: () => false } },
        { provide: PermissionsService, useValue: { loadContext: () => of(null), hasPermission: () => true, clear: () => undefined } }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the title 'ffsj-secretaria'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('ffsj-secretaria');
  });
});

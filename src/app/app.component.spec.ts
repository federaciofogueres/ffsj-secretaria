import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from 'ffsj-web-components';

import { AppComponent } from './app.component';
import { AdminAccessService } from './core/admin-access.service';
import { EjercicioService } from './core/ejercicio.service';
import { DashboardSummaryService } from './core/dashboard-summary.service';
import { PermissionsService } from './core/permissions.service';
import { SecretariaService } from './core/secretaria.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => false, logout: () => undefined, loginStatusObservable: of(false) } },
        { provide: AdminAccessService, useValue: { isAdmin: () => false } },
        { provide: EjercicioService, useValue: { ejerciciosChanges: of([]), selectedChanges: of(null), select: () => undefined, load: () => undefined, isSelectedActive: false, selectedSnapshot: null } },
        { provide: PermissionsService, useValue: { loadContext: () => of(null), hasPermission: () => true, clear: () => undefined } },
        { provide: SecretariaService, useValue: { iniciarEjercicio: () => of(null) } },
        { provide: DashboardSummaryService, useValue: { clear: () => undefined, associationChanges: of({}), adminChanges: of({}), loadingChanges: of(false), errorChanges: of(false) } }
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

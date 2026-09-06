import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { HomeComponent } from './home.component';
import { PermissionsService } from '../core/permissions.service';
import { AdminAccessService } from '../core/admin-access.service';
import { DashboardSummaryService } from '../core/dashboard-summary.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HomeComponent],
      providers: [
        { provide: PermissionsService, useValue: { hasPermission: () => true, contextSnapshot: { asociacionId: 25 } } },
        { provide: AdminAccessService, useValue: { isAdmin: () => false } },
        {
          provide: DashboardSummaryService,
          useValue: {
            associationChanges: of({ solicitudesConIncidencia: 0, inscripcionesAbiertas: 0, comunicacionesNuevas: 0, autorizacionesAltaPendientes: 0 }),
            adminChanges: of({ solicitudesPendientes: 0, incidenciasRespondidas: 0, comunicacionesPendientes: 0, documentacionRecibida: 0 }),
            loadingChanges: of(false),
            errorChanges: of(false),
            loadAssociation: () => undefined,
            loadAdmin: () => undefined
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose five modules on the home screen', () => {
    expect(component.modules.length).toBe(5);
  });
});

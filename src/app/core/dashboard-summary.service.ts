import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { DashboardAdminResumen, DashboardAsociacionResumen } from './models';
import { SecretariaService } from './secretaria.service';

const EMPTY_ASSOCIATION_SUMMARY: DashboardAsociacionResumen = {
  solicitudesConIncidencia: 0,
  inscripcionesAbiertas: 0,
  comunicacionesNuevas: 0,
  autorizacionesAltaPendientes: 0
};

const EMPTY_ADMIN_SUMMARY: DashboardAdminResumen = {
  solicitudesPendientes: 0,
  incidenciasRespondidas: 0,
  comunicacionesPendientes: 0,
  documentacionRecibida: 0
};

@Injectable({ providedIn: 'root' })
export class DashboardSummaryService {
  private readonly associationSummary$ = new BehaviorSubject<DashboardAsociacionResumen>(EMPTY_ASSOCIATION_SUMMARY);
  private readonly adminSummary$ = new BehaviorSubject<DashboardAdminResumen>(EMPTY_ADMIN_SUMMARY);
  private readonly loading$ = new BehaviorSubject(false);
  private readonly error$ = new BehaviorSubject(false);
  private loadedKey: string | null = null;

  constructor(private readonly secretaria: SecretariaService) {}

  get associationChanges() {
    return this.associationSummary$.asObservable();
  }

  get adminChanges() {
    return this.adminSummary$.asObservable();
  }

  get loadingChanges() {
    return this.loading$.asObservable();
  }

  get errorChanges() {
    return this.error$.asObservable();
  }

  get associationSnapshot(): DashboardAsociacionResumen {
    return this.associationSummary$.value;
  }

  get adminSnapshot(): DashboardAdminResumen {
    return this.adminSummary$.value;
  }

  loadAssociation(asociacionId: number): void {
    const key = `association:${asociacionId}`;
    if (this.loadedKey === key) {
      return;
    }

    this.loadedKey = key;
    this.loading$.next(true);
    this.error$.next(false);
    this.secretaria.getDashboardAsociacion(asociacionId).subscribe({
      next: summary => {
        this.associationSummary$.next(summary);
        this.loading$.next(false);
      },
      error: () => {
        this.associationSummary$.next(EMPTY_ASSOCIATION_SUMMARY);
        this.error$.next(true);
        this.loading$.next(false);
      }
    });
  }

  loadAdmin(): void {
    const key = 'admin';
    if (this.loadedKey === key) {
      return;
    }

    this.loadedKey = key;
    this.loading$.next(true);
    this.error$.next(false);
    this.secretaria.getDashboardAdmin().subscribe({
      next: summary => {
        this.adminSummary$.next(summary);
        this.loading$.next(false);
      },
      error: () => {
        this.adminSummary$.next(EMPTY_ADMIN_SUMMARY);
        this.error$.next(true);
        this.loading$.next(false);
      }
    });
  }

  clear(): void {
    this.loadedKey = null;
    this.associationSummary$.next(EMPTY_ASSOCIATION_SUMMARY);
    this.adminSummary$.next(EMPTY_ADMIN_SUMMARY);
    this.loading$.next(false);
    this.error$.next(false);
  }
}

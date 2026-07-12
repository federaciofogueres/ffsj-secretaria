import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, FfsjLoginComponent } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged, forkJoin } from 'rxjs';

import { AdminAccessService } from '../core/admin-access.service';
import { CensoService } from '../core/censo.service';
import { CargoPermisosSecretaria, CargoResumen, EjercicioInicioResultado, EjercicioSecretaria, PermisoSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FfsjLoginComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {
  permisos: PermisoSecretaria[] = [];
  cargos: CargoResumen[] = [];
  cargoPermisos: CargoPermisosSecretaria[] = [];
  asociacionBasePermisos: PermisoSecretaria[] = [];
  ejercicios: EjercicioSecretaria[] = [];
  ejercicioForm: Partial<EjercicioSecretaria> = {};
  ejercicioInicioResultado?: EjercicioInicioResultado;
  expandedCargoIds = new Set<number>();
  asociacionesPanelExpanded = true;
  administracionPanelExpanded = true;
  loading = false;
  error = '';
  isLoggedIn = false;
  isAdmin = false;
  private loginSubscription?: Subscription;

  constructor(
    readonly auth: AuthService,
    readonly adminAccess: AdminAccessService,
    private readonly permissions: PermissionsService,
    private readonly censoService: CensoService,
    private readonly secretariaService: SecretariaService
  ) {}

  ngOnInit(): void {
    this.refreshAuthState();
    if (this.isAdmin) {
      this.load();
    }
    this.loginSubscription = this.auth.loginStatusObservable.pipe(distinctUntilChanged()).subscribe(isLogged => {
      this.isLoggedIn = isLogged;
      this.isAdmin = isLogged && this.adminAccess.isAdmin();
    });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
  }

  onLoginStatus(isLogged: boolean): void {
    this.isLoggedIn = isLogged;
    this.isAdmin = isLogged && this.adminAccess.isAdmin();

    if (this.isAdmin) {
      this.permissions.loadContext().subscribe(() => this.load());
      return;
    }
    if (isLogged) {
      this.error = 'El usuario autenticado no tiene cargo de administracion.';
    }
  }

  canShowAdmin(): boolean {
    return this.isLoggedIn && this.isAdmin;
  }

  get ejercicioActivoLabel(): string {
    const activo = this.ejercicios.find(ejercicio => ejercicio.activo);
    return activo ? String(activo.ejercicio) : '-';
  }

  private refreshAuthState(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.isAdmin = this.isLoggedIn && this.adminAccess.isAdmin();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      permisos: this.permissions.getPermisos(),
      cargos: this.censoService.getCargos(),
      cargoPermisos: this.permissions.getCargoPermisos(),
      asociacionBasePermisos: this.permissions.getAsociacionBasePermisos(),
      ejercicios: this.secretariaService.getEjercicios()
    }).subscribe({
      next: response => {
        this.permisos = response.permisos.permisos;
        this.cargos = response.cargos;
        this.cargoPermisos = response.cargoPermisos.cargos;
        this.asociacionBasePermisos = response.asociacionBasePermisos.permisos;
        this.ejercicios = response.ejercicios.ejercicios;
        this.resetEjercicioForm();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se han podido cargar cargos y permisos.';
        this.loading = false;
      }
    });
  }

  editarEjercicio(ejercicio: EjercicioSecretaria): void {
    this.ejercicioForm = { ...ejercicio };
  }

  resetEjercicioForm(): void {
    const activo = this.ejercicios.find(item => item.activo);
    const nextYear = activo ? activo.ejercicio + 1 : new Date().getFullYear() + 1;
    this.ejercicioForm = {
      ejercicio: nextYear,
      fechaInicio: `${nextYear - 1}-07-01`,
      fechaFin: `${nextYear}-06-30`,
      activo: false
    };
  }

  guardarEjercicio(): void {
    if (!this.ejercicioForm.ejercicio || !this.ejercicioForm.fechaInicio || !this.ejercicioForm.fechaFin) {
      this.error = 'Indica ejercicio, fecha de inicio y fecha de fin.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.secretariaService.crearOActualizarEjercicio(this.ejercicioForm).subscribe({
      next: ejercicio => {
        const exists = this.ejercicios.some(item => item.id === ejercicio.id);
        this.ejercicios = (exists
          ? this.ejercicios.map(item => item.id === ejercicio.id ? ejercicio : item)
          : [...this.ejercicios, ejercicio]
        ).sort((a, b) => b.ejercicio - a.ejercicio);
        this.resetEjercicioForm();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido guardar el ejercicio.';
        this.loading = false;
      }
    });
  }

  activarEjercicio(ejercicio: EjercicioSecretaria): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.activarEjercicio(ejercicio.id).subscribe({
      next: updated => {
        this.ejercicios = this.ejercicios.map(item => ({ ...item, activo: item.id === updated.id }));
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido activar el ejercicio.';
        this.loading = false;
      }
    });
  }

  iniciarEjercicio(ejercicio: EjercicioSecretaria): void {
    const confirmed = window.confirm(
      `Se importaran al ejercicio ${ejercicio.ejercicio} los asociados activos del ejercicio anterior. Esta accion no duplicara registros existentes.`
    );
    if (!confirmed) return;

    this.loading = true;
    this.error = '';
    this.ejercicioInicioResultado = undefined;
    this.secretariaService.iniciarEjercicio(ejercicio.id).subscribe({
      next: resultado => {
        this.ejercicioInicioResultado = resultado;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido iniciar el ejercicio.';
        this.loading = false;
      }
    });
  }

  toggleAsociacionBasePermiso(permiso: PermisoSecretaria, checked: boolean): void {
    const actuales = new Set(this.asociacionBasePermisos.map(item => item.codigo));
    if (checked) {
      actuales.add(permiso.codigo);
    } else {
      actuales.delete(permiso.codigo);
    }

    this.permissions.actualizarAsociacionBasePermisos(Array.from(actuales)).subscribe({
      next: updated => {
        this.asociacionBasePermisos = updated.permisos;
      },
      error: () => {
        this.error = 'No se han podido actualizar los permisos base de asociaciones.';
      }
    });
  }

  asociacionBaseTienePermiso(permiso: PermisoSecretaria): boolean {
    return this.asociacionBasePermisos.some(item => item.codigo === permiso.codigo);
  }

  togglePermiso(cargo: CargoResumen, permiso: PermisoSecretaria, checked: boolean): void {
    const actuales = new Set(this.permisosCargo(cargo.id).map(item => item.codigo));
    if (checked) {
      actuales.add(permiso.codigo);
    } else {
      actuales.delete(permiso.codigo);
    }

    this.permissions.actualizarPermisosCargo(cargo.id, Array.from(actuales)).subscribe({
      next: updated => {
        const exists = this.cargoPermisos.some(item => item.cargoId === updated.cargoId);
        this.cargoPermisos = exists
          ? this.cargoPermisos.map(item => (item.cargoId === updated.cargoId ? updated : item))
          : [...this.cargoPermisos, updated];
      },
      error: () => {
        this.error = 'No se han podido actualizar los permisos del cargo.';
      }
    });
  }

  cargoTienePermiso(cargo: CargoResumen, permiso: PermisoSecretaria): boolean {
    return this.permisosCargo(cargo.id).some(item => item.codigo === permiso.codigo);
  }

  toggleCargo(cargoId: number): void {
    if (this.expandedCargoIds.has(cargoId)) {
      this.expandedCargoIds.delete(cargoId);
      return;
    }
    this.expandedCargoIds.add(cargoId);
  }

  isCargoExpanded(cargoId: number): boolean {
    return this.expandedCargoIds.has(cargoId);
  }

  permisosCargo(cargoId: number): PermisoSecretaria[] {
    return this.cargoPermisos.find(item => item.cargoId === cargoId)?.permisos ?? [];
  }

  permisosPorModulo(): { modulo: string; permisos: PermisoSecretaria[] }[] {
    const grouped = this.permisos.reduce<Record<string, PermisoSecretaria[]>>((acc, permiso) => {
      acc[permiso.modulo] = acc[permiso.modulo] || [];
      acc[permiso.modulo].push(permiso);
      return acc;
    }, {});
    return Object.entries(grouped).map(([modulo, permisos]) => ({ modulo, permisos }));
  }
}

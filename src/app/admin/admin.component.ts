import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, FfsjLoginComponent } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged, forkJoin } from 'rxjs';

import { AdminAccessService } from '../core/admin-access.service';
import { CensoService } from '../core/censo.service';
import { CargoPermisosSecretaria, CargoResumen, PermisoSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, FfsjLoginComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {
  permisos: PermisoSecretaria[] = [];
  cargos: CargoResumen[] = [];
  cargoPermisos: CargoPermisosSecretaria[] = [];
  asociacionBasePermisos: PermisoSecretaria[] = [];
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
    private readonly censoService: CensoService
  ) {}

  ngOnInit(): void {
    this.refreshAuthState();
    if (this.isLoggedIn) {
      this.resolveAdministrativeAccess();
    }
    this.loginSubscription = this.auth.loginStatusObservable.pipe(distinctUntilChanged()).subscribe(isLogged => {
      this.isLoggedIn = isLogged;
      if (isLogged) {
        this.resolveAdministrativeAccess();
      } else {
        this.isAdmin = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
  }

  onLoginStatus(isLogged: boolean): void {
    this.isLoggedIn = isLogged;
    if (!isLogged) {
      this.isAdmin = false;
      return;
    }
    this.resolveAdministrativeAccess();
  }

  canShowAdmin(): boolean {
    return this.isLoggedIn && this.isAdmin;
  }

  private refreshAuthState(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.isAdmin = this.isLoggedIn && this.adminAccess.isAdmin();
  }

  private resolveAdministrativeAccess(): void {
    this.error = '';
    this.permissions.loadContext().subscribe(() => {
      this.isAdmin = this.isLoggedIn && this.adminAccess.isAdmin();
      if (this.isAdmin) {
        this.load();
        return;
      }
      this.error = 'El usuario autenticado no tiene acceso a la administracion.';
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      permisos: this.permissions.getPermisos(),
      cargos: this.censoService.getCargos(),
      cargoPermisos: this.permissions.getCargoPermisos(),
      asociacionBasePermisos: this.permissions.getAsociacionBasePermisos()
    }).subscribe({
      next: response => {
        this.permisos = response.permisos.permisos;
        this.cargos = response.cargos;
        this.cargoPermisos = response.cargoPermisos.cargos;
        this.asociacionBasePermisos = response.asociacionBasePermisos.permisos;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se han podido cargar cargos y permisos.';
        this.loading = false;
      }
    });
  }

  onAsociacionBasePermisoClick(event: MouseEvent, permiso: PermisoSecretaria): void {
    event.preventDefault();
    this.toggleAsociacionBasePermiso(permiso, !this.asociacionBaseTienePermiso(permiso));
  }

  private toggleAsociacionBasePermiso(permiso: PermisoSecretaria, checked: boolean): void {
    const actuales = new Set(this.asociacionBasePermisos.map(item => item.codigo));
    if (checked) {
      actuales.add(permiso.codigo);
    } else {
      actuales.delete(permiso.codigo);
    }
    const previous = this.asociacionBasePermisos;
    this.asociacionBasePermisos = this.permisosFromCodes(actuales);

    this.permissions.actualizarAsociacionBasePermisos(Array.from(actuales)).subscribe({
      next: updated => {
        this.asociacionBasePermisos = updated.permisos;
      },
      error: () => {
        this.asociacionBasePermisos = previous;
        this.error = 'No se han podido actualizar los permisos base de asociaciones.';
      }
    });
  }

  asociacionBaseTienePermiso(permiso: PermisoSecretaria): boolean {
    return this.asociacionBasePermisos.some(item => item.codigo === permiso.codigo);
  }

  onCargoPermisoClick(event: MouseEvent, cargo: CargoResumen, permiso: PermisoSecretaria): void {
    event.preventDefault();
    this.togglePermiso(cargo, permiso, !this.cargoTienePermiso(cargo, permiso));
  }

  private togglePermiso(cargo: CargoResumen, permiso: PermisoSecretaria, checked: boolean): void {
    const actuales = new Set(this.permisosCargo(cargo.id).map(item => item.codigo));
    if (checked) {
      actuales.add(permiso.codigo);
    } else {
      actuales.delete(permiso.codigo);
    }
    const previous = this.cargoPermisos;
    const next = { cargoId: cargo.id, permisos: this.permisosFromCodes(actuales) };
    const exists = this.cargoPermisos.some(item => item.cargoId === cargo.id);
    this.cargoPermisos = exists
      ? this.cargoPermisos.map(item => (item.cargoId === cargo.id ? next : item))
      : [...this.cargoPermisos, next];

    this.permissions.actualizarPermisosCargo(cargo.id, Array.from(actuales)).subscribe({
      next: updated => {
        const exists = this.cargoPermisos.some(item => item.cargoId === updated.cargoId);
        this.cargoPermisos = exists
          ? this.cargoPermisos.map(item => (item.cargoId === updated.cargoId ? updated : item))
          : [...this.cargoPermisos, updated];
      },
      error: () => {
        this.cargoPermisos = previous;
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

  private permisosFromCodes(codigos: Set<string>): PermisoSecretaria[] {
    return this.permisos.filter(permiso => codigos.has(permiso.codigo));
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

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService, FfsjLoginComponent } from 'ffsj-web-components';
import { forkJoin } from 'rxjs';

import { AdminAccessService } from '../core/admin-access.service';
import { CensoService } from '../core/censo.service';
import { CargoPermisosSecretaria, CargoResumen, PermisoSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FfsjLoginComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  permisos: PermisoSecretaria[] = [];
  cargos: CargoResumen[] = [];
  cargoPermisos: CargoPermisosSecretaria[] = [];
  asociacionBasePermisos: PermisoSecretaria[] = [];
  expandedCargoIds = new Set<number>();
  asociacionesPanelExpanded = true;
  administracionPanelExpanded = true;
  loading = false;
  error = '';

  constructor(
    readonly auth: AuthService,
    readonly adminAccess: AdminAccessService,
    private readonly permissions: PermissionsService,
    private readonly censoService: CensoService
  ) {}

  ngOnInit(): void {
    if (this.canShowAdmin()) {
      this.load();
    }
  }

  onLoginStatus(isLogged: boolean): void {
    if (isLogged && this.canShowAdmin()) {
      this.permissions.loadContext().subscribe(() => this.load());
      return;
    }
    if (isLogged) {
      this.error = 'El usuario autenticado no tiene cargo de administracion.';
    }
  }

  canShowAdmin(): boolean {
    return this.auth.isLoggedIn() && this.adminAccess.isAdmin();
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

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { ApiUrlService } from './api-url.service';
import { AuthContext, CargoPermisosSecretaria, PermisoSecretaria, RolSecretaria } from './models';

const DEFAULT_PERMISSIONS = [
  'asociacion:read',
  'asociacion:write',
  'asociados:read',
  'solicitudes:read',
  'solicitudes:write',
  'inscripciones:read',
  'inscripciones:write',
  'registro:read',
  'registro:write',
  'incidencias:read'
];

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly permissions$ = new BehaviorSubject<string[]>([]);

  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly auth: AuthService
  ) {}

  loadContext(asociacionId = this.getAuthAsociacionId()): Observable<AuthContext | null> {
    if (!asociacionId || asociacionId < 0) {
      this.permissions$.next([]);
      return of(null);
    }

    return this.http
      .get<AuthContext>(`${this.apiUrl.secretariaBasePath}/contexto`, {
        params: { asociacionId },
        headers: this.adminHeaders()
      })
      .pipe(
        tap(context => this.permissions$.next(context.permisos ?? DEFAULT_PERMISSIONS)),
        catchError(() => {
          this.permissions$.next(DEFAULT_PERMISSIONS);
          return of(null);
        })
      );
  }

  hasPermission(permission: string): boolean {
    return this.permissions$.value.includes(permission);
  }

  can(permission: string): Observable<boolean> {
    if (this.permissions$.value.length) {
      return of(this.hasPermission(permission));
    }
    return this.loadContext().pipe(map(() => this.hasPermission(permission)));
  }

  get permisosSnapshot(): string[] {
    return this.permissions$.value;
  }

  getPermisos(): Observable<{ permisos: PermisoSecretaria[] }> {
    return this.http.get<{ permisos: PermisoSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/admin/permisos`, {
      headers: this.adminHeaders()
    });
  }

  getRoles(): Observable<{ roles: RolSecretaria[] }> {
    return this.http.get<{ roles: RolSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/admin/roles`, {
      headers: this.adminHeaders()
    });
  }

  crearRol(payload: { codigo: string; nombre: string; descripcion?: string | null }): Observable<RolSecretaria> {
    return this.http.post<RolSecretaria>(`${this.apiUrl.secretariaBasePath}/admin/roles`, payload, {
      headers: this.adminHeaders()
    });
  }

  actualizarPermisosRol(rolId: number, permisos: string[]): Observable<RolSecretaria> {
    return this.http.put<RolSecretaria>(
      `${this.apiUrl.secretariaBasePath}/admin/roles/${rolId}/permisos`,
      { permisos },
      { headers: this.adminHeaders() }
    );
  }

  getRolesAsociacion(asociacionId: number): Observable<{ asociacionId: number; roles: RolSecretaria[] }> {
    return this.http.get<{ asociacionId: number; roles: RolSecretaria[] }>(
      `${this.apiUrl.secretariaBasePath}/admin/asociaciones/${asociacionId}/roles`,
      { headers: this.adminHeaders() }
    );
  }

  actualizarRolesAsociacion(asociacionId: number, roles: number[]): Observable<{ asociacionId: number; roles: RolSecretaria[] }> {
    return this.http.put<{ asociacionId: number; roles: RolSecretaria[] }>(
      `${this.apiUrl.secretariaBasePath}/admin/asociaciones/${asociacionId}/roles`,
      { roles },
      { headers: this.adminHeaders() }
    );
  }

  getCargoPermisos(): Observable<{ cargos: CargoPermisosSecretaria[] }> {
    return this.http.get<{ cargos: CargoPermisosSecretaria[] }>(
      `${this.apiUrl.secretariaBasePath}/admin/cargos/permisos`,
      { headers: this.adminHeaders() }
    );
  }

  actualizarPermisosCargo(cargoId: number, permisos: string[]): Observable<CargoPermisosSecretaria> {
    return this.http.put<CargoPermisosSecretaria>(
      `${this.apiUrl.secretariaBasePath}/admin/cargos/${cargoId}/permisos`,
      { permisos },
      { headers: this.adminHeaders() }
    );
  }

  getAsociacionBasePermisos(): Observable<{ permisos: PermisoSecretaria[] }> {
    return this.http.get<{ permisos: PermisoSecretaria[] }>(
      `${this.apiUrl.secretariaBasePath}/admin/asociaciones/base/permisos`,
      { headers: this.adminHeaders() }
    );
  }

  actualizarAsociacionBasePermisos(permisos: string[]): Observable<{ permisos: PermisoSecretaria[] }> {
    return this.http.put<{ permisos: PermisoSecretaria[] }>(
      `${this.apiUrl.secretariaBasePath}/admin/asociaciones/base/permisos`,
      { permisos },
      { headers: this.adminHeaders() }
    );
  }

  private adminHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  private getAuthAsociacionId(): number {
    const auth = this.auth as any;
    return typeof auth.getIdAsociacion === 'function' ? auth.getIdAsociacion() : auth.getIdUsuario();
  }
}

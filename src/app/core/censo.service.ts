import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable, map } from 'rxjs';

import { ApiUrlService } from './api-url.service';
import { Asociacion, Asociado, CargoResumen } from './models';

@Injectable({ providedIn: 'root' })
export class CensoService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly authService: AuthService
  ) {}

  get asociacionId(): number {
    return this.authService.getIdAsociacion();
  }

  getAsociacion(id: number): Observable<Asociacion> {
    return this.http
      .get<{ asociaciones?: Asociacion[] }>(`${this.apiUrl.censoBasePath}/asociaciones/${id}`, this.authOptions())
      .pipe(map(response => response.asociaciones?.[0] ?? (response as unknown as Asociacion)));
  }

  getAsociadosByAsociacion(asociacionId: number): Observable<Asociado[]> {
    return this.http
      .get<{ asociados?: unknown[] }>(
        `${this.apiUrl.censoBasePath}/asociaciones/${asociacionId}/asociados`,
        this.authOptions()
      )
      .pipe(map(response => (response.asociados ?? []).map(item => this.mapAsociado(item))));
  }

  getCargos(): Observable<CargoResumen[]> {
    return this.http
      .get<{ cargos?: CargoResumen[] }>(`${this.apiUrl.censoBasePath}/cargos`, this.authOptions())
      .pipe(map(response => response.cargos ?? []));
  }

  private authOptions(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.authService.getToken()}`
      })
    };
  }

  private mapAsociado(raw: unknown): Asociado {
    const item = raw as Record<string, any>;
    return {
      id: Number(item.id),
      nombre: item.nombre ?? item.name ?? '',
      apellidos: item.apellidos ?? item.surnames ?? '',
      cargo: item.cargo ?? item.charge ?? item.cargoNombre ?? item.cargos?.[0]?.nombre ?? '',
      tipo: item.tipo === 'infantil' || item.tipoAsociado === 'infantil' || item.child === true ? 'infantil' : 'adulto',
      dni: item.dni ?? item.nif,
      sip: item.sip,
      estado: item.estado,
      fechaAlta: item.fechaAlta ?? item.date_up,
      email: item.email,
      telefono: item.telefono ?? item.phone
    };
  }
}

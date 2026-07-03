import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable } from 'rxjs';

import { ApiUrlService } from './api-url.service';
import {
  ActividadSecretaria,
  CargoResumen,
  Incidencia,
  InscripcionSecretaria,
  RegistroPendiente,
  RegistroSecretaria,
  SolicitudSecretaria,
  SolicitudTipo
} from './models';

@Injectable({ providedIn: 'root' })
export class SecretariaService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly auth: AuthService
  ) {}

  getRegistroPendiente(asociacionId: number): Observable<{ items: RegistroPendiente[] }> {
    return this.http.get<{ items: RegistroPendiente[] }>(`${this.apiUrl.secretariaBasePath}/registro-pendiente`, {
      params: new HttpParams().set('asociacionId', asociacionId).set('estado', 'pendiente'),
      headers: this.authHeaders()
    });
  }

  crearRegistroPendiente(payload: {
    asociacionId: number;
    tipo: SolicitudTipo;
    asociadoId?: number | null;
    datos: Record<string, any>;
    datosOriginales?: Record<string, any> | null;
    observaciones?: string | null;
  }): Observable<RegistroPendiente> {
    return this.http.post<RegistroPendiente>(`${this.apiUrl.secretariaBasePath}/registro-pendiente`, payload, {
      headers: this.authHeaders()
    });
  }

  descartarRegistroPendiente(id: number, asociacionId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl.secretariaBasePath}/registro-pendiente/${id}`, {
      params: new HttpParams().set('asociacionId', asociacionId),
      headers: this.authHeaders()
    });
  }

  getSolicitudes(asociacionId: number): Observable<{ solicitudes: SolicitudSecretaria[] }> {
    return this.http.get<{ solicitudes: SolicitudSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/solicitudes`, {
      params: new HttpParams().set('asociacionId', asociacionId),
      headers: this.authHeaders()
    });
  }

  getSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.get<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}`, {
      headers: this.authHeaders()
    });
  }

  crearSolicitud(payload: {
    asociacionId: number;
    tipo: SolicitudTipo;
    registroPendienteIds: number[];
    observaciones?: string | null;
  }): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes`, payload, {
      headers: this.authHeaders()
    });
  }

  getRegistros(asociacionId: number): Observable<{ registros: RegistroSecretaria[] }> {
    return this.http.get<{ registros: RegistroSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/registros`, {
      params: new HttpParams().set('asociacionId', asociacionId),
      headers: this.authHeaders()
    });
  }

  crearRegistro(payload: unknown): Observable<RegistroSecretaria> {
    return this.http.post<RegistroSecretaria>(`${this.apiUrl.secretariaBasePath}/registros`, payload, {
      headers: this.authHeaders()
    });
  }

  getInscripciones(asociacionId: number): Observable<{ inscripciones: InscripcionSecretaria[] }> {
    return this.http.get<{ inscripciones: InscripcionSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/inscripciones`, {
      params: new HttpParams().set('asociacionId', asociacionId),
      headers: this.authHeaders()
    });
  }

  enviarInscripcion(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas`, payload, {
      headers: this.authHeaders()
    });
  }

  getIncidencias(scope: string, scopeId: string): Observable<{ incidencias: Incidencia[] }> {
    return this.http.get<{ incidencias: Incidencia[] }>(`${this.apiUrl.secretariaBasePath}/incidencias`, {
      params: new HttpParams().set('scope', scope).set('scopeId', scopeId),
      headers: this.authHeaders()
    });
  }

  getActividades(): Observable<{ actividades: ActividadSecretaria[] }> {
    return this.http.get<{ actividades: ActividadSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/actividades`, {
      headers: this.authHeaders()
    });
  }

  getCargosResumen(): Observable<{ cargos: CargoResumen[] }> {
    return this.http.get<{ cargos: CargoResumen[] }>(`${this.apiUrl.secretariaBasePath}/cargos/resumen`, {
      headers: this.authHeaders()
    });
  }

  generarJustificante(scope: string, scopeId: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl.secretariaBasePath}/justificantes/${scope}/${scopeId}`, {}, {
      headers: this.authHeaders()
    });
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this.auth.getToken()}` };
  }
}

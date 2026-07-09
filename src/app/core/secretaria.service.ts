import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable, map, switchMap } from 'rxjs';

import { ApiUrlService } from './api-url.service';
import {
  ActividadSecretaria,
  AdjuntoSecretaria,
  CargoResumen,
  DashboardAdminResumen,
  DashboardAsociacionResumen,
  Incidencia,
  AutorizacionAlta,
  FormularioInscripcion,
  InscripcionEntradaSecretaria,
  InscripcionSecretaria,
  JustificanteSecretaria,
  RegistroMensajeSecretaria,
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

  getDashboardAsociacion(asociacionId: number): Observable<DashboardAsociacionResumen> {
    return this.http.get<DashboardAsociacionResumen>(`${this.apiUrl.secretariaBasePath}/dashboard/asociacion`, {
      params: new HttpParams().set('asociacionId', asociacionId),
      headers: this.authHeaders()
    });
  }

  getDashboardAdmin(): Observable<DashboardAdminResumen> {
    return this.http.get<DashboardAdminResumen>(`${this.apiUrl.secretariaBasePath}/dashboard/admin`, {
      headers: this.authHeaders()
    });
  }

  getSolicitudesGlobal(): Observable<{ solicitudes: SolicitudSecretaria[] }> {
    return this.http.get<{ solicitudes: SolicitudSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/solicitudes/global`, {
      headers: this.authHeaders()
    });
  }

  getSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.get<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}`, {
      headers: this.authHeaders()
    });
  }

  enviarSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}/enviar`, {}, {
      headers: this.authHeaders()
    });
  }

  cancelarEnvioSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}/cancelar-envio`, {}, {
      headers: this.authHeaders()
    });
  }

  cancelarSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}/cancelar`, {}, {
      headers: this.authHeaders()
    });
  }

  validarSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}/validar`, {}, {
      headers: this.authHeaders()
    });
  }

  rechazarSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}/rechazar`, {}, {
      headers: this.authHeaders()
    });
  }

  finalizarSolicitud(id: number): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/${id}/finalizar`, {}, {
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

  crearAltaConAutorizacion(payload: {
    asociacionId: number;
    asociadoId: number;
    datos: Record<string, any>;
    datosOriginales?: Record<string, any> | null;
    asociacionesAnteriores: Array<{ id: number; nombre?: string | null }>;
  }): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/alta-autorizacion`, payload, {
      headers: this.authHeaders()
    });
  }

  getAutorizacionesAlta(filters: {
    asociacionId?: number;
    scope?: 'anterior' | 'nueva';
    estado?: AutorizacionAlta['estado'];
  } = {}): Observable<{ autorizaciones: AutorizacionAlta[] }> {
    let params = new HttpParams();
    if (filters.asociacionId) params = params.set('asociacionId', filters.asociacionId);
    if (filters.scope) params = params.set('scope', filters.scope);
    if (filters.estado) params = params.set('estado', filters.estado);
    return this.http.get<{ autorizaciones: AutorizacionAlta[] }>(`${this.apiUrl.secretariaBasePath}/autorizaciones-alta`, {
      params,
      headers: this.authHeaders()
    });
  }

  firmarAutorizacionAlta(id: number, payload: { firmante?: string | null; observaciones?: string | null } = {}): Observable<{ autorizacion: AutorizacionAlta; solicitud: SolicitudSecretaria }> {
    return this.http.post<{ autorizacion: AutorizacionAlta; solicitud: SolicitudSecretaria }>(
      `${this.apiUrl.secretariaBasePath}/autorizaciones-alta/${id}/firmar`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  getRegistros(filters: { asociacionId?: number; tipo?: string; origen?: 'asociacion' | 'administracion' } = {}): Observable<{ registros: RegistroSecretaria[] }> {
    let params = new HttpParams();
    if (filters.asociacionId) params = params.set('asociacionId', filters.asociacionId);
    if (filters.tipo) params = params.set('tipo', filters.tipo);
    if (filters.origen) params = params.set('origen', filters.origen);
    return this.http.get<{ registros: RegistroSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/registros`, {
      params,
      headers: this.authHeaders()
    });
  }

  crearRegistro(payload: unknown): Observable<RegistroSecretaria> {
    return this.http.post<RegistroSecretaria>(`${this.apiUrl.secretariaBasePath}/registros`, payload, {
      headers: this.authHeaders()
    });
  }

  getRegistro(id: number): Observable<RegistroSecretaria> {
    return this.http.get<RegistroSecretaria>(`${this.apiUrl.secretariaBasePath}/registros/${id}`, {
      headers: this.authHeaders()
    });
  }

  actualizarEstadoRegistro(id: number, estado: RegistroSecretaria['estado']): Observable<RegistroSecretaria> {
    return this.http.post<RegistroSecretaria>(`${this.apiUrl.secretariaBasePath}/registros/${id}/estado`, { estado }, {
      headers: this.authHeaders()
    });
  }

  finalizarRegistro(id: number): Observable<RegistroSecretaria> {
    return this.http.post<RegistroSecretaria>(`${this.apiUrl.secretariaBasePath}/registros/${id}/finalizar`, {}, {
      headers: this.authHeaders()
    });
  }

  crearMensajeRegistro(id: number, mensaje: string): Observable<RegistroMensajeSecretaria> {
    return this.http.post<RegistroMensajeSecretaria>(`${this.apiUrl.secretariaBasePath}/registros/${id}/mensajes`, { mensaje }, {
      headers: this.authHeaders()
    });
  }

  getInscripciones(asociacionId: number, includeInactive = false): Observable<{ inscripciones: InscripcionSecretaria[] }> {
    let params = new HttpParams().set('asociacionId', asociacionId);
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<{ inscripciones: InscripcionSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/inscripciones`, {
      params,
      headers: this.authHeaders()
    });
  }

  enviarInscripcion(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas`, payload, {
      headers: this.authHeaders()
    });
  }

  getInscripcionEntradas(formularioId: string): Observable<{ entradas: InscripcionEntradaSecretaria[] }> {
    return this.http.get<{ entradas: InscripcionEntradaSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas`, {
      params: new HttpParams().set('formularioId', formularioId),
      headers: this.authHeaders()
    });
  }

  getMiEntradaInscripcion(formularioId: string): Observable<InscripcionEntradaSecretaria> {
    return this.http.get<InscripcionEntradaSecretaria>(`${this.apiUrl.secretariaBasePath}/inscripciones/${formularioId}/mi-entrada`, {
      headers: this.authHeaders()
    });
  }

  crearInscripcion(payload: unknown): Observable<InscripcionSecretaria> {
    return this.http.post<InscripcionSecretaria>(`${this.apiUrl.secretariaBasePath}/inscripciones`, payload, {
      headers: this.authHeaders()
    });
  }

  actualizarInscripcion(id: string, payload: unknown): Observable<InscripcionSecretaria> {
    return this.http.put<InscripcionSecretaria>(`${this.apiUrl.secretariaBasePath}/inscripciones/${id}`, payload, {
      headers: this.authHeaders()
    });
  }

  borrarInscripcion(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl.secretariaBasePath}/inscripciones/${id}`, {
      headers: this.authHeaders()
    });
  }

  getFormularios(includeInactive = false): Observable<{ formularios: FormularioInscripcion[] }> {
    const params = includeInactive ? new HttpParams().set('includeInactive', 'true') : undefined;
    return this.http.get<{ formularios: FormularioInscripcion[] }>(`${this.apiUrl.secretariaBasePath}/formularios`, {
      params,
      headers: this.authHeaders()
    });
  }

  crearFormulario(payload: unknown): Observable<FormularioInscripcion> {
    return this.http.post<FormularioInscripcion>(`${this.apiUrl.secretariaBasePath}/formularios`, payload, {
      headers: this.authHeaders()
    });
  }

  actualizarFormulario(id: string, payload: unknown): Observable<FormularioInscripcion> {
    return this.http.put<FormularioInscripcion>(`${this.apiUrl.secretariaBasePath}/formularios/${id}`, payload, {
      headers: this.authHeaders()
    });
  }

  borrarFormulario(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl.secretariaBasePath}/formularios/${id}`, {
      headers: this.authHeaders()
    });
  }

  getIncidencias(scope: string, scopeId: string): Observable<{ incidencias: Incidencia[] }> {
    return this.http.get<{ incidencias: Incidencia[] }>(`${this.apiUrl.secretariaBasePath}/incidencias`, {
      params: new HttpParams().set('scope', scope).set('scopeId', scopeId),
      headers: this.authHeaders()
    });
  }

  crearIncidencia(payload: { scope: string; scopeId: string | number; mensaje: string }): Observable<Incidencia> {
    return this.http.post<Incidencia>(`${this.apiUrl.secretariaBasePath}/incidencias`, payload, {
      headers: this.authHeaders()
    });
  }

  responderIncidencia(id: string | number, respuesta: string): Observable<Incidencia> {
    return this.http.post<Incidencia>(`${this.apiUrl.secretariaBasePath}/incidencias/${id}/responder`, { respuesta }, {
      headers: this.authHeaders()
    });
  }

  cerrarIncidencia(id: string | number, respuesta?: string, estado: 'subsanada' | 'cerrada' = 'cerrada'): Observable<Incidencia> {
    return this.http.post<Incidencia>(`${this.apiUrl.secretariaBasePath}/incidencias/${id}/cerrar`, { respuesta, estado }, {
      headers: this.authHeaders()
    });
  }

  reabrirIncidencia(id: string | number, motivo: string): Observable<Incidencia> {
    return this.http.post<Incidencia>(`${this.apiUrl.secretariaBasePath}/incidencias/${id}/reabrir`, { motivo }, {
      headers: this.authHeaders()
    });
  }

  getAdjuntos(scope: string, scopeId: string | number): Observable<{ adjuntos: AdjuntoSecretaria[] }> {
    return this.http.get<{ adjuntos: AdjuntoSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/adjuntos/${scope}/${scopeId}`, {
      headers: this.authHeaders()
    });
  }

  subirAdjunto(scope: string, scopeId: string | number, file: File): Observable<AdjuntoSecretaria> {
    return this.http.post<AdjuntoSecretaria>(`${this.apiUrl.secretariaBasePath}/adjuntos/${scope}/${scopeId}`, file, {
      params: new HttpParams().set('fileName', file.name).set('mimeType', file.type || 'application/octet-stream'),
      headers: {
        ...this.authHeaders(),
        'Content-Type': file.type || 'application/octet-stream'
      }
    });
  }

  borrarAdjunto(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl.secretariaBasePath}/adjuntos/${id}`, {
      headers: this.authHeaders()
    });
  }

  adjuntoDownloadUrl(id: number): string {
    return this.toAbsoluteSecretariaUrl(`${this.apiUrl.secretariaBasePath}/adjuntos/${id}/download`);
  }

  getActividades(includeInactive = false): Observable<{ actividades: ActividadSecretaria[] }> {
    const params = includeInactive ? new HttpParams().set('includeInactive', 'true') : undefined;
    return this.http.get<{ actividades: ActividadSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/actividades`, {
      params,
      headers: this.authHeaders()
    });
  }

  crearActividad(payload: unknown): Observable<ActividadSecretaria> {
    return this.http.post<ActividadSecretaria>(`${this.apiUrl.secretariaBasePath}/actividades`, payload, {
      headers: this.authHeaders()
    });
  }

  actualizarActividad(id: string, payload: unknown): Observable<ActividadSecretaria> {
    return this.http.put<ActividadSecretaria>(`${this.apiUrl.secretariaBasePath}/actividades/${id}`, payload, {
      headers: this.authHeaders()
    });
  }

  borrarActividad(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl.secretariaBasePath}/actividades/${id}`, {
      headers: this.authHeaders()
    });
  }

  getCargosResumen(): Observable<{ cargos: CargoResumen[] }> {
    return this.http.get<{ cargos: CargoResumen[] }>(`${this.apiUrl.secretariaBasePath}/cargos/resumen`, {
      headers: this.authHeaders()
    });
  }

  generarJustificante(scope: string, scopeId: string | number): Observable<JustificanteSecretaria> {
    return this.http.post<JustificanteSecretaria>(`${this.apiUrl.secretariaBasePath}/justificantes/${scope}/${scopeId}`, {}, {
      headers: this.authHeaders()
    }).pipe(
      map(justificante => ({
        ...justificante,
        url: this.toAbsoluteSecretariaUrl(justificante.url || this.justificanteUrl(scope, scopeId))
      }))
    );
  }

  descargarJustificantePdf(scope: string, scopeId: string | number): Observable<{ justificante: JustificanteSecretaria; blob: Blob }> {
    return this.generarJustificante(scope, scopeId).pipe(
      switchMap(justificante =>
        this.http.get(justificante.url, {
          headers: this.authHeaders(),
          responseType: 'blob'
        }).pipe(map(blob => ({ justificante, blob })))
      )
    );
  }

  justificanteUrl(scope: string, scopeId: string | number): string {
    return this.toAbsoluteSecretariaUrl(`${this.apiUrl.secretariaBasePath}/justificantes/${scope}/${scopeId}/download`);
  }

  private authHeaders() {
    return { Authorization: `Bearer ${this.auth.getToken()}` };
  }

  private toAbsoluteSecretariaUrl(url: string): string {
    if (!url || /^https?:\/\//i.test(url)) {
      return url;
    }

    const apiOrigin = this.secretariaApiOrigin();
    return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private secretariaApiOrigin(): string {
    const marker = '/emjf1/Secretaria/1.0.0';
    const basePath = this.apiUrl.secretariaBasePath;
    const markerIndex = basePath.indexOf(marker);
    if (markerIndex >= 0) {
      return basePath.slice(0, markerIndex);
    }
    return basePath.replace(/\/$/, '');
  }
}

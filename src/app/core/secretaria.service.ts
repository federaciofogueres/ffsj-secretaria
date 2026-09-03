import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable, map, switchMap } from 'rxjs';

import { ApiUrlService } from './api-url.service';
import {
  ActividadSecretaria,
  AdjuntoSecretaria,
  CargoResumen,
  CargoCupoSecretaria,
  DashboardAdminResumen,
  DashboardAsociacionResumen,
  EjercicioInicioResultado,
  EjercicioSecretaria,
  Incidencia,
  AutorizacionAlta,
  FormularioInscripcion,
  InscripcionEntradaSecretaria,
  InscripcionSecretaria,
  JustificanteSecretaria,
  RegistroMensajeSecretaria,
  RegistroDestinatario,
  RegistroPendiente,
  RegistroSecretaria,
  PaginacionSecretaria,
  SolicitudSecretaria,
  SolicitudTipo,
  SoporteCategoria,
  SoporteEstado,
  SoporteIncidencia
} from './models';

@Injectable({ providedIn: 'root' })
export class SecretariaService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly auth: AuthService
  ) {}

  getSoporteCategorias(): Observable<{ categorias: SoporteCategoria[]; estados: SoporteEstado[] }> {
    return this.http.get<{ categorias: SoporteCategoria[]; estados: SoporteEstado[] }>(`${this.apiUrl.secretariaBasePath}/soporte/categorias`, { headers: this.authHeaders() });
  }

  getSoporteIncidencias(): Observable<{ incidencias: SoporteIncidencia[] }> {
    return this.http.get<{ incidencias: SoporteIncidencia[] }>(`${this.apiUrl.secretariaBasePath}/soporte/incidencias`, { headers: this.authHeaders() });
  }

  getSoporteIncidencia(id: number): Observable<{ incidencia: SoporteIncidencia }> {
    return this.http.get<{ incidencia: SoporteIncidencia }>(`${this.apiUrl.secretariaBasePath}/soporte/incidencias/${id}`, { headers: this.authHeaders() });
  }

  crearSoporteIncidencia(payload: { categoria: string; asunto: string; descripcion: string; ejercicio?: number | null; ruta?: string; userAgent?: string }): Observable<{ incidencia: SoporteIncidencia }> {
    return this.http.post<{ incidencia: SoporteIncidencia }>(`${this.apiUrl.secretariaBasePath}/soporte/incidencias`, payload, { headers: this.authHeaders() });
  }

  getAdminSoporteIncidencias(filters: { estado?: string; categoria?: string; page?: number; pageSize?: number; orden?: 'actualizacion_desc' | 'actualizacion_asc' | 'creacion_desc' | 'creacion_asc' | 'estado' } = {}): Observable<{ incidencias: SoporteIncidencia[]; paginacion?: PaginacionSecretaria }> {
    let params = new HttpParams();
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.categoria) params = params.set('categoria', filters.categoria);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    if (filters.orden) params = params.set('orden', filters.orden);
    return this.http.get<{ incidencias: SoporteIncidencia[]; paginacion?: PaginacionSecretaria }>(`${this.apiUrl.secretariaBasePath}/admin/soporte/incidencias`, { params, headers: this.authHeaders() });
  }

  getAdminSoporteIncidencia(id: number): Observable<{ incidencia: SoporteIncidencia }> {
    return this.http.get<{ incidencia: SoporteIncidencia }>(`${this.apiUrl.secretariaBasePath}/admin/soporte/incidencias/${id}`, { headers: this.authHeaders() });
  }

  actualizarAdminSoporteIncidencia(id: number, payload: { estado?: SoporteEstado; mensaje?: string; solicitarInformacion?: boolean }): Observable<{ incidencia: SoporteIncidencia }> {
    return this.http.put<{ incidencia: SoporteIncidencia }>(`${this.apiUrl.secretariaBasePath}/admin/soporte/incidencias/${id}`, payload, { headers: this.authHeaders() });
  }

  responderSoporteIncidencia(id: number, payload: { mensaje: string }): Observable<{ incidencia: SoporteIncidencia }> {
    return this.http.post<{ incidencia: SoporteIncidencia }>(`${this.apiUrl.secretariaBasePath}/soporte/incidencias/${id}/mensajes`, payload, { headers: this.authHeaders() });
  }

  responderAdminSoporteIncidencia(id: number, payload: { mensaje: string; solicitarInformacion?: boolean }): Observable<{ incidencia: SoporteIncidencia }> {
    return this.http.post<{ incidencia: SoporteIncidencia }>(`${this.apiUrl.secretariaBasePath}/admin/soporte/incidencias/${id}/mensajes`, payload, { headers: this.authHeaders() });
  }

  marcarSoporteLeido(id: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.apiUrl.secretariaBasePath}/soporte/incidencias/${id}/leido`, {}, { headers: this.authHeaders() });
  }

  getSoporteNovedades(): Observable<{ incidenciasConNovedades: number; mensajesSinLeer: number }> {
    return this.http.get<{ incidenciasConNovedades: number; mensajesSinLeer: number }>(`${this.apiUrl.secretariaBasePath}/soporte/novedades`, { headers: this.authHeaders() });
  }

  subirAdjuntoSoporte(ticketId: number, messageId: number, file: File, admin = false): Observable<AdjuntoSecretaria> {
    const prefix = admin ? '/admin' : '';
    return this.http.post<AdjuntoSecretaria>(`${this.apiUrl.secretariaBasePath}${prefix}/soporte/incidencias/${ticketId}/mensajes/${messageId}/adjuntos`, file, { params: new HttpParams().set('fileName', file.name).set('mimeType', file.type || 'application/octet-stream'), headers: { ...this.authHeaders(), 'Content-Type': file.type || 'application/octet-stream' } });
  }

  descargarAdjuntoSoporte(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl.secretariaBasePath}/soporte/adjuntos/${id}/download`, { headers: this.authHeaders(), responseType: 'blob' });
  }

  getRegistroPendiente(asociacionId: number): Observable<{ items: RegistroPendiente[] }> {
    let params = new HttpParams().set('asociacionId', asociacionId).set('estado', 'pendiente');
    const ejercicio = this.ejercicioSeleccionado();
    if (ejercicio) params = params.set('ejercicio', ejercicio);
    return this.http.get<{ items: RegistroPendiente[] }>(`${this.apiUrl.secretariaBasePath}/registro-pendiente`, {
      params,
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
    return this.http.post<RegistroPendiente>(`${this.apiUrl.secretariaBasePath}/registro-pendiente`, this.withEjercicio(payload), {
      headers: this.authHeaders()
    });
  }

  descartarRegistroPendiente(id: number, asociacionId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl.secretariaBasePath}/registro-pendiente/${id}`, {
      params: new HttpParams().set('asociacionId', asociacionId),
      headers: this.authHeaders()
    });
  }

  getSolicitudes(asociacionId: number): Observable<{ solicitudes: SolicitudSecretaria[]; paginacion?: PaginacionSecretaria }> {
    let params = new HttpParams().set('asociacionId', asociacionId);
    const ejercicio = this.ejercicioSeleccionado();
    if (ejercicio) params = params.set('ejercicio', ejercicio);
    return this.http.get<{ solicitudes: SolicitudSecretaria[]; paginacion?: PaginacionSecretaria }>(`${this.apiUrl.secretariaBasePath}/solicitudes`, {
      params,
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

  getSolicitudesGlobal(filters: {
    page?: number;
    pageSize?: number;
    tipo?: string;
    estado?: string;
    busqueda?: string;
    orden?: 'fecha_desc' | 'fecha_asc' | 'estado';
    soloProblematicas?: boolean;
  } = {}): Observable<{ solicitudes: SolicitudSecretaria[]; paginacion?: PaginacionSecretaria }> {
    let params = new HttpParams();
    const ejercicio = this.ejercicioSeleccionado();
    if (ejercicio) params = params.set('ejercicio', ejercicio);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.pageSize) params = params.set('pageSize', filters.pageSize);
    if (filters.tipo) params = params.set('tipo', filters.tipo);
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters.orden) params = params.set('orden', filters.orden);
    if (filters.soloProblematicas) params = params.set('soloProblematicas', 'true');
    return this.http.get<{ solicitudes: SolicitudSecretaria[]; paginacion?: PaginacionSecretaria }>(`${this.apiUrl.secretariaBasePath}/solicitudes/global`, {
      params,
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
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes`, this.withEjercicio(payload), {
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
    return this.http.post<SolicitudSecretaria>(`${this.apiUrl.secretariaBasePath}/solicitudes/alta-autorizacion`, this.withEjercicio(payload), {
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

  rechazarAutorizacionAlta(id: number, payload: { firmante?: string | null; motivo?: string | null } = {}): Observable<{ autorizacion: AutorizacionAlta; solicitud: SolicitudSecretaria }> {
    return this.http.post<{ autorizacion: AutorizacionAlta; solicitud: SolicitudSecretaria }>(
      `${this.apiUrl.secretariaBasePath}/autorizaciones-alta/${id}/rechazar`,
      payload,
      { headers: this.authHeaders() }
    );
  }

  reenviarAutorizacionesAlta(solicitudId: number): Observable<SolicitudSecretaria> {
    return this.http.post<SolicitudSecretaria>(
      `${this.apiUrl.secretariaBasePath}/solicitudes/${solicitudId}/reenviar-autorizaciones`,
      {},
      { headers: this.authHeaders() }
    );
  }

  getRegistros(filters: { asociacionId?: number; tipo?: string; origen?: 'asociacion' | 'administracion'; anio?: number | string; busqueda?: string; estado?: string } = {}): Observable<{ registros: RegistroSecretaria[] }> {
    let params = new HttpParams();
    if (filters.asociacionId) params = params.set('asociacionId', filters.asociacionId);
    if (filters.tipo) params = params.set('tipo', filters.tipo);
    if (filters.origen) params = params.set('origen', filters.origen);
    if (filters.anio) params = params.set('anio', filters.anio);
    if (filters.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters.estado) params = params.set('estado', filters.estado);
    return this.http.get<{ registros: RegistroSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/registros`, {
      params,
      headers: this.authHeaders()
    });
  }

  getRegistroDestinatarios(): Observable<{ destinatarios: RegistroDestinatario[] }> {
    return this.http.get<{ destinatarios: RegistroDestinatario[] }>(`${this.apiUrl.secretariaBasePath}/registros/destinatarios`, {
      headers: this.authHeaders()
    });
  }

  crearRegistroDestinatario(payload: { departamento: string; nombre: string; email: string }): Observable<RegistroDestinatario> {
    return this.http.post<RegistroDestinatario>(`${this.apiUrl.secretariaBasePath}/registros/destinatarios`, payload, {
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

  archivarRegistro(id: number): Observable<RegistroSecretaria> {
    return this.http.post<RegistroSecretaria>(`${this.apiUrl.secretariaBasePath}/registros/${id}/archivar`, {}, {
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
    const ejercicio = this.ejercicioSeleccionado();
    if (ejercicio) params = params.set('ejercicio', ejercicio);
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
    let params = new HttpParams().set('formularioId', formularioId);
    const ejercicio = this.ejercicioSeleccionado();
    if (ejercicio) params = params.set('ejercicio', ejercicio);
    return this.http.get<{ entradas: InscripcionEntradaSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas`, {
      params,
      headers: this.authHeaders()
    });
  }

  actualizarEstadoInscripcionEntrada(id: number, estado: InscripcionEntradaSecretaria['estado'], detalle = ''): Observable<InscripcionEntradaSecretaria> {
    return this.http.post<InscripcionEntradaSecretaria>(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas/${id}/estado`, { estado, detalle }, {
      headers: this.authHeaders()
    });
  }

  solicitarRetiradaInscripcion(id: number, detalle = ''): Observable<InscripcionEntradaSecretaria> {
    return this.http.post<InscripcionEntradaSecretaria>(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas/${id}/retirada`, { detalle }, { headers: this.authHeaders() });
  }

  resolverRetiradaInscripcion(id: number, aprobar: boolean, detalle = ''): Observable<InscripcionEntradaSecretaria> {
    return this.http.post<InscripcionEntradaSecretaria>(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas/${id}/retirada/decision`, { aprobar, detalle }, { headers: this.authHeaders() });
  }

  getMiEntradaInscripcion(formularioId: string): Observable<InscripcionEntradaSecretaria> {
    return this.http.get<InscripcionEntradaSecretaria>(`${this.apiUrl.secretariaBasePath}/inscripciones/${formularioId}/mi-entrada`, {
      headers: this.authHeaders()
    });
  }

  borrarMiEntradaInscripcion(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.secretariaBasePath}/inscripciones/entradas/${id}`, {
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

  descargarAdjunto(id: number): Observable<Blob> {
    return this.http.get(this.adjuntoDownloadUrl(id), {
      headers: this.authHeaders(),
      responseType: 'blob'
    });
  }

  getActividades(includeInactive = false, filters: { includeArchived?: boolean; estado?: string; visibilidad?: string } = {}): Observable<{ actividades: ActividadSecretaria[] }> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    if (filters.includeArchived) params = params.set('includeArchived', 'true');
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.visibilidad) params = params.set('visibilidad', filters.visibilidad);
    const ejercicio = this.ejercicioSeleccionado();
    if (ejercicio) params = params.set('ejercicio', ejercicio);
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

  getCargosCupos(asociacionId: number, ejercicio: number): Observable<{ cargos: CargoCupoSecretaria[] }> {
    const params = new HttpParams().set('asociacionId', asociacionId).set('ejercicio', ejercicio);
    return this.http.get<{ cargos: CargoCupoSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/cargos/cupos`, {
      params,
      headers: this.authHeaders()
    });
  }

  getEjercicios(): Observable<{ ejercicios: EjercicioSecretaria[] }> {
    return this.http.get<{ ejercicios: EjercicioSecretaria[] }>(`${this.apiUrl.secretariaBasePath}/ejercicios`, {
      headers: this.authHeaders()
    });
  }

  crearOActualizarEjercicio(payload: Partial<EjercicioSecretaria>): Observable<EjercicioSecretaria> {
    return this.http.post<EjercicioSecretaria>(`${this.apiUrl.secretariaBasePath}/admin/ejercicios`, payload, {
      headers: this.authHeaders()
    });
  }

  activarEjercicio(id: number): Observable<EjercicioSecretaria> {
    return this.http.post<EjercicioSecretaria>(`${this.apiUrl.secretariaBasePath}/admin/ejercicios/${id}/activo`, {}, {
      headers: this.authHeaders()
    });
  }

  iniciarEjercicio(id: number): Observable<EjercicioInicioResultado> {
    return this.http.post<EjercicioInicioResultado>(`${this.apiUrl.secretariaBasePath}/ejercicios/${id}/iniciar`, {}, {
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

  private ejercicioSeleccionado(): string | null {
    try {
      return localStorage.getItem('ffsj-secretaria-ejercicio') || null;
    } catch {
      return null;
    }
  }

  private withEjercicio<T extends Record<string, any>>(payload: T): T {
    const ejercicio = this.ejercicioSeleccionado();
    return ejercicio ? { ...payload, ejercicio } : payload;
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

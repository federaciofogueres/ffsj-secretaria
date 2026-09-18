import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable, timeout } from 'rxjs';

import { ApiUrlService } from '../core/api-url.service';
import { AppLanguage } from '../core/i18n.service';

export type RubiRouteKey = 'home' | 'personas' | 'alta' | 'registro' | 'inscripciones' | 'soporte' | 'calendario' | 'solicitudes';
export type RubiModule = 'home' | 'asociados' | 'registro' | 'inscripciones' | 'soporte' | 'calendario' | 'solicitudes';
export interface RubiHistoryEntry {
  role: 'user' | 'assistant'; text: string; intent?: string; tool?: string;
  destination?: string; topic?: string; module?: RubiModule; activityId?: string; inscriptionId?: string;
}
export interface RubiScreenContext {
  version: 1; module: RubiModule; view?: string; tab?: string;
  state?: { canCreate?: boolean; hasOpenRegistration?: boolean; hasOpenModification?: boolean; hasOpenBaja?: boolean; hasOpenDocumentacion?: boolean; hasOpenComunicacion?: boolean; missingRequiredFields?: string[]; selectedActivityId?: string; selectedInscriptionId?: string };
}
export interface RubiConversationState {
  intent: string; tool: string; destination?: string; topic?: string; module?: RubiModule;
  sensitiveFlow?: 'alta' | 'modificacion' | 'baja' | 'documentacion' | 'comunicacion';
  activityId?: string; inscriptionId?: string;
}
export type RubiAction =
  | { type: 'navigate'; destination: string; route?: string }
  | { type: 'start_flow'; flow: 'alta' | 'modificacion' | 'baja' | 'documentacion' | 'comunicacion' | 'inscripcion' | 'soporte'; destination?: string; route?: string; inscriptionId?: string; label?: string };

export interface RubiResponse {
  message: string;
  intent: string | null;
  actions: RubiAction[];
  errors: Array<{ code: string; message: string }>;
  metadata: { success: boolean };
  tool?: { name: string; status: string } | null;
  conversation?: RubiConversationState | null;
}

export type RubiPilotEvent =
  | { event: 'session_opened'; stage: 'conversation' }
  | { event: 'flow_started' | 'flow_cancelled'; stage: 'alta' | 'modificacion' | 'baja' | 'documentacion' | 'comunicacion' | 'inscripcion' | 'soporte' }
  | { event: 'navigation'; stage: 'conversation'; destination: string };

export interface AltaPreparacion {
  estado: 'preparada' | 'requiere_flujo_normal';
  asociacionId: number;
  ejercicio: { id: number; ejercicio: number };
  persona: { id: number; nombre: string; apellidos: string } | null;
  datos: Record<string, unknown>;
  cargos: Array<{ id: number; nombre: string }>;
  antecedentes: {
    requiereCertificacion: boolean;
    asociacionesAnteriores: Array<{ id: number; nombre?: string | null }>;
  };
  conflictosComplejos: Array<{ code: string; cargoId?: number; cargoNombre?: string }>;
  siguientePaso: 'confirmar' | 'derivar_flujo_normal';
  efectos: {
    creaSolicitud: boolean;
    escribeEnCenso: false;
    requiereFirma: boolean;
    requiereCertificacion: boolean;
    circuito: 'ordinario' | 'antecedentes';
  };
  confirmacion?: {
    referencia: string;
    expiraAt: string;
    confirmacionHumanaHabilitada: boolean;
  };
}

export interface AltaConfirmacionResultado {
  solicitudId: number;
  numero?: string | null;
  estado?: string | null;
  tipo?: 'alta';
  asociacionId?: number;
  ejercicio?: number;
  requiereCertificacion?: boolean;
  siguientePaso?: 'firma_solicitud' | 'certificaciones';
  idempotentReplay: boolean;
}

export interface ModificacionPreparacion {
  estado: 'preparada' | 'requiere_flujo_normal';
  asociacionId: number;
  ejercicio: { id: number; ejercicio: number };
  persona: { id: number; nombre: string; apellidos: string };
  cambios: Array<{ campo: string; antes: unknown; despues: unknown }>;
  conflictosComplejos: Array<{ code: string; cargoId?: number; cargoNombre?: string }>;
  siguientePaso: 'confirmar' | 'derivar_flujo_normal';
  confirmacion?: { referencia: string; expiraAt: string; confirmacionHumanaHabilitada: boolean };
}

export interface ModificacionConfirmacionResultado {
  solicitudId: number; numero?: string | null; estado?: string | null; tipo?: 'cambio';
  asociacionId?: number; ejercicio?: number; siguientePaso?: 'firma_solicitud'; idempotentReplay: boolean;
}

export interface BajaPreparacion {
  estado: 'preparada' | 'requiere_flujo_normal';
  asociacionId: number;
  ejercicio: { id: number; ejercicio: number };
  persona: { id: number; nombre: string; apellidos: string };
  cargos?: { ids: number[]; nombres: string[]; obligatorios: number[] };
  conflictosComplejos: Array<{ code: string; cargoIds?: number[] }>;
  siguientePaso: 'confirmar' | 'derivar_flujo_normal';
  efectos: { creaSolicitud: boolean; escribeEnCenso: false; requiereFirma: boolean; circuito: string };
  confirmacion?: { referencia: string; expiraAt: string; confirmacionHumanaHabilitada: boolean };
}

export interface BajaConfirmacionResultado {
  solicitudId: number; numero?: string | null; estado?: string | null; tipo?: 'baja';
  asociacionId?: number; ejercicio?: number; siguientePaso?: 'firma_solicitud'; idempotentReplay: boolean;
}

export interface RegistroAsistidoAdjuntoMetadato { fileName: string; mimeType: string; size: number }

export interface RegistroAsistidoPreparacion {
  estado: 'preparada';
  asociacionId: number;
  tipo: 'documentacion' | 'comunicacion';
  destinatario: { id: number; nombre: string; departamentoNombre: string | null };
  titulo: string;
  mensaje: string;
  adjuntos: RegistroAsistidoAdjuntoMetadato[];
  siguientePaso: 'confirmar';
  efectos: { creaRegistro: boolean; escribeEnCenso: false; requiereFirma: boolean; circuito: string };
  confirmacion?: { referencia: string; expiraAt: string; confirmacionHumanaHabilitada: boolean };
}

export interface RegistroAsistidoResultado {
  registroId: number; numero: string; tipo: 'documentacion' | 'comunicacion'; estado: string;
  fechaEntrada: string; adjuntosPendientes?: RegistroAsistidoAdjuntoMetadato[]; idempotentReplay: boolean;
}

@Injectable({ providedIn: 'root' })
export class RubiApiService {
  private sessionId = '';
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly auth: AuthService
  ) {}

  access(): Observable<{ enabled: boolean; authorized: boolean }> {
    return this.http.get<{ enabled: boolean; authorized: boolean }>(`${this.apiUrl.secretariaBasePath}/asistente/acceso`, {
      headers: this.authHeaders(false)
    }).pipe(timeout(10000));
  }

  startSession(): void {
    if (!this.sessionId) this.sessionId = globalThis.crypto?.randomUUID?.() || `rubi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  resetSession(): void { this.sessionId = ''; }

  trackEvent(event: RubiPilotEvent): Observable<{ accepted: boolean }> {
    this.startSession();
    return this.http.post<{ accepted: boolean }>(`${this.apiUrl.secretariaBasePath}/asistente/eventos`, event, {
      headers: this.authHeaders()
    }).pipe(timeout(10000));
  }

  feedback(rating: 'helpful' | 'not_helpful', context: { intent?: string; tool?: string } = {}): Observable<{ accepted: boolean }> {
    this.startSession();
    return this.http.post<{ accepted: boolean }>(`${this.apiUrl.secretariaBasePath}/asistente/feedback`, {
      rating, ...(rating === 'not_helpful' ? { reason: 'not_useful' } : {}), ...context
    }, { headers: this.authHeaders() }).pipe(timeout(10000));
  }

  message(message: string, idioma: AppLanguage, routeKey?: RubiRouteKey, history?: RubiHistoryEntry[], screenContext?: RubiScreenContext): Observable<RubiResponse> {
    this.startSession();
    const payload: { message: string; idioma: AppLanguage; routeKey?: RubiRouteKey; history?: RubiHistoryEntry[]; screenContext?: RubiScreenContext } = { message, idioma };
    if (routeKey) payload.routeKey = routeKey;
    if (history?.length) payload.history = history;
    if (screenContext) payload.screenContext = screenContext;

    return this.http.post<RubiResponse>(`${this.apiUrl.secretariaBasePath}/asistente/mensaje`, payload, {
      headers: this.authHeaders()
    }).pipe(timeout(15000));
  }

  prepararAlta(ejercicioId: number, datos: Record<string, unknown>): Observable<AltaPreparacion> {
    this.startSession();
    return this.http.post<AltaPreparacion>(`${this.apiUrl.secretariaBasePath}/altas/preparar`, { ejercicioId, datos }, {
      headers: this.authHeaders()
    }).pipe(timeout(15000));
  }

  cancelarPreparacionAlta(confirmacion: string): Observable<{ cancelada: boolean }> {
    return this.http.post<{ cancelada: boolean }>(`${this.apiUrl.secretariaBasePath}/altas/preparacion/cancelar`, { confirmacion }, {
      headers: this.authHeaders()
    }).pipe(timeout(10000));
  }

  confirmarAlta(confirmacion: string): Observable<AltaConfirmacionResultado> {
    return this.http.post<AltaConfirmacionResultado>(`${this.apiUrl.secretariaBasePath}/altas/confirmar`, {
      confirmacion,
      confirmar: true
    }, {
      headers: this.authHeaders()
    }).pipe(timeout(20000));
  }

  prepararModificacion(ejercicioId: number, asociadoId: number, cambios: Record<string, unknown>): Observable<ModificacionPreparacion> {
    this.startSession();
    return this.http.post<ModificacionPreparacion>(`${this.apiUrl.secretariaBasePath}/modificaciones/preparar`, {
      ejercicioId, asociadoId, cambios
    }, { headers: this.authHeaders() }).pipe(timeout(15000));
  }

  cancelarPreparacionModificacion(confirmacion: string): Observable<{ cancelada: boolean }> {
    return this.http.post<{ cancelada: boolean }>(`${this.apiUrl.secretariaBasePath}/modificaciones/preparacion/cancelar`, {
      confirmacion
    }, { headers: this.authHeaders() }).pipe(timeout(10000));
  }

  confirmarModificacion(confirmacion: string): Observable<ModificacionConfirmacionResultado> {
    return this.http.post<ModificacionConfirmacionResultado>(`${this.apiUrl.secretariaBasePath}/modificaciones/confirmar`, {
      confirmacion, confirmar: true
    }, { headers: this.authHeaders() }).pipe(timeout(20000));
  }

  prepararBaja(ejercicioId: number, asociadoId: number, motivo?: string): Observable<BajaPreparacion> {
    this.startSession();
    return this.http.post<BajaPreparacion>(`${this.apiUrl.secretariaBasePath}/bajas/preparar`, {
      ejercicioId, asociadoId, ...(motivo ? { motivo } : {})
    }, { headers: this.authHeaders() }).pipe(timeout(15000));
  }

  cancelarPreparacionBaja(confirmacion: string): Observable<{ cancelada: boolean }> {
    return this.http.post<{ cancelada: boolean }>(`${this.apiUrl.secretariaBasePath}/bajas/preparacion/cancelar`, {
      confirmacion
    }, { headers: this.authHeaders() }).pipe(timeout(10000));
  }

  confirmarBaja(confirmacion: string): Observable<BajaConfirmacionResultado> {
    return this.http.post<BajaConfirmacionResultado>(`${this.apiUrl.secretariaBasePath}/bajas/confirmar`, {
      confirmacion, confirmar: true
    }, { headers: this.authHeaders() }).pipe(timeout(20000));
  }

  prepararRegistro(tipo: 'documentacion' | 'comunicacion', destinatarioId: number, titulo: string, mensaje: string, adjuntos: RegistroAsistidoAdjuntoMetadato[] = []): Observable<RegistroAsistidoPreparacion> {
    this.startSession();
    return this.http.post<RegistroAsistidoPreparacion>(`${this.apiUrl.secretariaBasePath}/registro-asistido/preparar`, {
      tipo, destinatarioId, titulo, mensaje, adjuntos
    }, { headers: this.authHeaders() }).pipe(timeout(15000));
  }

  cancelarPreparacionRegistro(confirmacion: string): Observable<{ cancelada: boolean }> {
    return this.http.post<{ cancelada: boolean }>(`${this.apiUrl.secretariaBasePath}/registro-asistido/preparacion/cancelar`, {
      confirmacion
    }, { headers: this.authHeaders() }).pipe(timeout(10000));
  }

  confirmarRegistro(confirmacion: string): Observable<RegistroAsistidoResultado> {
    return this.http.post<RegistroAsistidoResultado>(`${this.apiUrl.secretariaBasePath}/registro-asistido/confirmar`, {
      confirmacion, confirmar: true
    }, { headers: this.authHeaders() }).pipe(timeout(20000));
  }

  private authHeaders(includeSession = true): HttpHeaders {
    let headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
    if (includeSession && this.sessionId) headers = headers.set('X-Rubi-Session-Id', this.sessionId);
    return headers;
  }
}

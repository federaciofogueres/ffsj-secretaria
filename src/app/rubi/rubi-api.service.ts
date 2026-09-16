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
  destination?: string; topic?: string; module?: RubiModule;
}
export interface RubiScreenContext {
  version: 1; module: RubiModule; view?: string; tab?: string;
  state?: { canCreate?: boolean; hasOpenRegistration?: boolean; missingRequiredFields?: string[] };
}
export interface RubiConversationState {
  intent: string; tool: string; destination?: string; topic?: string; module?: RubiModule;
  sensitiveFlow?: 'alta';
}
export type RubiAction =
  | { type: 'navigate'; destination: string; route?: string }
  | { type: 'start_flow'; flow: 'alta'; destination?: string; route?: string };

export interface RubiResponse {
  message: string;
  intent: string | null;
  actions: RubiAction[];
  errors: Array<{ code: string; message: string }>;
  metadata: { success: boolean };
  tool?: { name: string; status: string } | null;
  conversation?: RubiConversationState | null;
}

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

@Injectable({ providedIn: 'root' })
export class RubiApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly auth: AuthService
  ) {}

  message(message: string, idioma: AppLanguage, routeKey?: RubiRouteKey, history?: RubiHistoryEntry[], screenContext?: RubiScreenContext): Observable<RubiResponse> {
    const payload: { message: string; idioma: AppLanguage; routeKey?: RubiRouteKey; history?: RubiHistoryEntry[]; screenContext?: RubiScreenContext } = { message, idioma };
    if (routeKey) payload.routeKey = routeKey;
    if (history?.length) payload.history = history;
    if (screenContext) payload.screenContext = screenContext;

    return this.http.post<RubiResponse>(`${this.apiUrl.secretariaBasePath}/asistente/mensaje`, payload, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` })
    }).pipe(timeout(15000));
  }

  prepararAlta(ejercicioId: number, datos: Record<string, unknown>): Observable<AltaPreparacion> {
    return this.http.post<AltaPreparacion>(`${this.apiUrl.secretariaBasePath}/altas/preparar`, { ejercicioId, datos }, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` })
    }).pipe(timeout(15000));
  }

  cancelarPreparacionAlta(confirmacion: string): Observable<{ cancelada: boolean }> {
    return this.http.post<{ cancelada: boolean }>(`${this.apiUrl.secretariaBasePath}/altas/preparacion/cancelar`, { confirmacion }, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` })
    }).pipe(timeout(10000));
  }

  confirmarAlta(confirmacion: string): Observable<AltaConfirmacionResultado> {
    return this.http.post<AltaConfirmacionResultado>(`${this.apiUrl.secretariaBasePath}/altas/confirmar`, {
      confirmacion,
      confirmar: true
    }, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` })
    }).pipe(timeout(20000));
  }
}

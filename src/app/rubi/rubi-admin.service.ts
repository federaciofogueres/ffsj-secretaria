import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable } from 'rxjs';

import { ApiUrlService } from '../core/api-url.service';

export interface RubiAdminGlobalConfig {
  enabled: boolean;
  realProviderEnabled: boolean;
  transactionalEnabled: boolean;
  federationAuthorized: boolean;
}

export interface RubiAdminProviderStatus {
  killSwitchEnabled: boolean;
  provider: string;
  model: string;
  realProviderRequested: boolean;
  credentialConfigured: boolean;
  transactionalEnabled: boolean;
}

export interface RubiAdminBudgetStatus {
  dailyBudgetUsd: number;
  dailyUsedUsd: number;
  dailyPercent: number | null;
  dailyLimitReached: boolean;
  monthlyBudgetUsd: number;
  monthlyUsedUsd: number;
  monthlyPercent: number | null;
  monthlyLimitReached: boolean;
}

export interface RubiAdminConfigResponse {
  global: RubiAdminGlobalConfig;
  provider: RubiAdminProviderStatus;
  budget: RubiAdminBudgetStatus;
}

export interface RubiAdminAsociacion {
  id: number;
  nombre: string;
  authorized: boolean;
}

export interface RubiAdminAsociacionesResponse {
  total: number;
  items: RubiAdminAsociacion[];
}

export interface RubiAdminToolUsage {
  tool: string;
  llamadas: number;
  fallidas: number;
}

export interface RubiAdminFailureCode {
  codigo: string;
  llamadas: number;
}

export interface RubiAdminAssociationUsage {
  asociacionId: number;
  llamadas: number;
}

// Revision tecnica final (post fix/rubi-post-auditoria): `operacion` mide
// peticiones conversacionales reales a Rubi (deterministicas o via
// provider); `provider` mide exclusivamente coste/tokens del proveedor de
// pago. Nunca se mezclan en la misma cifra: ver docs/rubi/RUBI.md.
export interface RubiAdminOperationalSummary {
  llamadas: number;
  exitosas: number;
  fallidas: number;
  actoresUnicos: number;
  asociacionesUnicas: number;
  latenciaMediaMs: number | null;
  porTool: RubiAdminToolUsage[];
  fallosPorCodigo: RubiAdminFailureCode[];
  porAsociacion: RubiAdminAssociationUsage[];
}

export interface RubiAdminProviderSummary {
  llamadas: number;
  inputTokens: number;
  outputTokens: number;
  costeUsd: number;
}

// 1.9.0#RUBI (Pilot Instrumentation): funnel por workflow, feedback
// persistente y uso de acciones, siempre separados de operacion/provider.
export interface RubiAdminFlowFunnel {
  flow: string;
  iniciados: number;
  preparados: number;
  completados: number;
  // Alias de completados: en estos workflows confirmar completa el tramite
  // en la misma llamada, no existe una fase "confirmado" independiente.
  confirmados: number;
  cancelados: number;
  fallidos: number;
  derivadosFlujoNormal: number;
  expirados: number;
  preparationRate: number | null;
  completionRate: number | null;
  cancellationRate: number | null;
  failureRate: number | null;
  normalFlowRedirectRate: number | null;
}

export interface RubiAdminFeedbackReasonBreakdown {
  motivo: string;
  total: number;
}

export interface RubiAdminFeedbackSummary {
  helpful: number;
  notHelpful: number;
  porMotivo: RubiAdminFeedbackReasonBreakdown[];
  porIntent: Array<{ intent: string; helpful: number; notHelpful: number }>;
  porTool: Array<{ tool: string; helpful: number; notHelpful: number }>;
  // 1.10.0#RUBI (6.5): desglose del motivo del 👎 por dimension.
  motivoPorIntent: Array<{ intent: string; motivo: string; total: number }>;
  motivoPorTool: Array<{ tool: string; motivo: string; total: number }>;
  motivoPorFlow: Array<{ flow: string; motivo: string; total: number }>;
}

export interface RubiAdminReformulations {
  posibles: number;
}

export interface RubiAdminActionUsage {
  navigation: { ofrecidas: number; usadas: number };
  flow: { ofrecidas: number; usadas: number };
}

// 1.10.0#RUBI (Product Analytics): analytics conversacional por intent/
// tool/source (6.4).
export interface RubiAdminConversationalByIntent {
  intent: string;
  llamadas: number;
  latenciaMediaMs: number | null;
  feedbackPositivo: number;
  feedbackNegativo: number;
  posiblesReformulaciones: number;
}

export interface RubiAdminConversationalByTool {
  tool: string;
  llamadas: number;
  fallidas: number;
  feedbackPositivo: number;
  feedbackNegativo: number;
  failureRate: number | null;
  helpfulRate: number | null;
}

export interface RubiAdminConversationalBySource {
  source: string;
  llamadas: number;
  latenciaMediaMs: number | null;
  feedbackPositivo: number;
  feedbackNegativo: number;
}

export interface RubiAdminConversational {
  porIntent: RubiAdminConversationalByIntent[];
  porTool: RubiAdminConversationalByTool[];
  porSource: RubiAdminConversationalBySource[];
}

// 1.10.0#RUBI (6.8): toda tasa se expone como {rate, n} - nunca una tasa sin
// su numero absoluto de casos.
export interface RubiRateWithSample {
  rate: number | null;
  n: number;
}

export interface RubiAdminQuality {
  conversacion: {
    resolutionProxyRate: RubiRateWithSample;
    possibleReformulationRate: RubiRateWithSample;
    unknownIntentRate: RubiRateWithSample;
    helpfulRate: RubiRateWithSample;
    notUnderstoodRate: RubiRateWithSample;
  };
  workflows: {
    flowCompletionRate: RubiRateWithSample;
    flowCancellationRate: RubiRateWithSample;
    flowFailureRate: RubiRateWithSample;
    preparedToConfirmedRate: RubiRateWithSample;
  };
  provider: {
    providerUsageRate: RubiRateWithSample;
    averageCostPerProviderCall: number | null;
    tokensPerCall: number | null;
    providerLatencyMs: { value: number | null; n: number };
  };
}

// 1.10.0#RUBI (6.6): periodo inmediatamente anterior a `from`, misma
// duracion, calculado automaticamente por el backend (nunca un segundo
// nivel de comparacion anidado).
export interface RubiAdminTrendComparison {
  actual: RubiRateWithSample;
  anterior: RubiRateWithSample;
  deltaPuntosPorcentuales: number | null;
}

export interface RubiAdminPeriodComparison {
  periodo: { desde: string; hasta: string };
  unknownIntentRate: RubiAdminTrendComparison;
  cancelacionPorFlow: Array<{ flow: string } & RubiAdminTrendComparison>;
  satisfaccionPorIntent: Array<{ intent: string } & RubiAdminTrendComparison>;
  latenciaProvider: {
    actual: { value: number | null; n: number };
    anterior: { value: number | null; n: number };
    deltaPorcentual: number | null;
  };
}

export interface RubiAdminAnalytics {
  periodo: { desde: string; hasta: string };
  operacion: RubiAdminOperationalSummary;
  provider: RubiAdminProviderSummary;
  flujos: RubiAdminFlowFunnel[];
  feedback: RubiAdminFeedbackSummary;
  reformulaciones: RubiAdminReformulations;
  usoAcciones: RubiAdminActionUsage;
  conversacional: RubiAdminConversational;
  calidad: RubiAdminQuality;
  comparacionPeriodoAnterior: RubiAdminPeriodComparison;
}

export interface RubiAdminTool {
  name: string;
  description: string | null;
  domain: string;
  available: boolean;
  blockedByAdmin: boolean;
  blockedByInfra: boolean;
}

export interface RubiAdminToolsResponse {
  tools: RubiAdminTool[];
}

@Injectable({ providedIn: 'root' })
export class RubiAdminService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly auth: AuthService
  ) {}

  getConfig(): Observable<RubiAdminConfigResponse> {
    return this.http.get<RubiAdminConfigResponse>(`${this.apiUrl.secretariaBasePath}/admin/rubi/config`, {
      headers: this.adminHeaders()
    });
  }

  updateConfig(patch: Partial<RubiAdminGlobalConfig>): Observable<{ global: RubiAdminGlobalConfig }> {
    return this.http.put<{ global: RubiAdminGlobalConfig }>(`${this.apiUrl.secretariaBasePath}/admin/rubi/config`, patch, {
      headers: this.adminHeaders()
    });
  }

  listAssociations(params: { search?: string; filter?: 'all' | 'authorized' | 'unauthorized' } = {}): Observable<RubiAdminAsociacionesResponse> {
    const query: Record<string, string> = {};
    if (params.search) query['search'] = params.search;
    if (params.filter) query['filter'] = params.filter;
    return this.http.get<RubiAdminAsociacionesResponse>(`${this.apiUrl.secretariaBasePath}/admin/rubi/asociaciones`, {
      headers: this.adminHeaders(), params: query
    });
  }

  setAssociationAuthorized(asociacionId: number, authorized: boolean): Observable<RubiAdminAsociacion> {
    return this.http.put<RubiAdminAsociacion>(`${this.apiUrl.secretariaBasePath}/admin/rubi/asociaciones/${asociacionId}`, { authorized }, {
      headers: this.adminHeaders()
    });
  }

  getAnalytics(params: { from?: string; to?: string; asociacionId?: number } = {}): Observable<RubiAdminAnalytics> {
    const query: Record<string, string> = {};
    if (params.from) query['from'] = params.from;
    if (params.to) query['to'] = params.to;
    if (params.asociacionId) query['asociacionId'] = String(params.asociacionId);
    return this.http.get<RubiAdminAnalytics>(`${this.apiUrl.secretariaBasePath}/admin/rubi/analiticas`, {
      headers: this.adminHeaders(), params: query
    });
  }

  getTools(): Observable<RubiAdminToolsResponse> {
    return this.http.get<RubiAdminToolsResponse>(`${this.apiUrl.secretariaBasePath}/admin/rubi/tools`, {
      headers: this.adminHeaders()
    });
  }

  setToolBlocked(toolName: string, blocked: boolean): Observable<{ blockedTools: string[] }> {
    return this.http.put<{ blockedTools: string[] }>(`${this.apiUrl.secretariaBasePath}/admin/rubi/tools/${toolName}`, { blocked }, {
      headers: this.adminHeaders()
    });
  }

  private adminHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }
}

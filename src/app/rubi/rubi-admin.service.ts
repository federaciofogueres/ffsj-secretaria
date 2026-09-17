import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable } from 'rxjs';

import { ApiUrlService } from '../core/api-url.service';

export interface RubiAdminGlobalConfig {
  enabled: boolean;
  realProviderEnabled: boolean;
  transactionalEnabled: boolean;
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
  enabled: boolean;
}

export interface RubiAdminAsociacionesResponse {
  total: number;
  items: RubiAdminAsociacion[];
}

export interface RubiAdminAnalytics {
  periodo: { desde: string; hasta: string };
  llamadas: number;
  inputTokens: number;
  outputTokens: number;
  costeUsd: number;
  fallidas: number;
  actoresUnicos: number;
  asociacionesUnicas: number;
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

  listAssociations(params: { search?: string; filter?: 'all' | 'enabled' | 'disabled' } = {}): Observable<RubiAdminAsociacionesResponse> {
    const query: Record<string, string> = {};
    if (params.search) query['search'] = params.search;
    if (params.filter) query['filter'] = params.filter;
    return this.http.get<RubiAdminAsociacionesResponse>(`${this.apiUrl.secretariaBasePath}/admin/rubi/asociaciones`, {
      headers: this.adminHeaders(), params: query
    });
  }

  setAssociationEnabled(asociacionId: number, enabled: boolean): Observable<RubiAdminAsociacion> {
    return this.http.put<RubiAdminAsociacion>(`${this.apiUrl.secretariaBasePath}/admin/rubi/asociaciones/${asociacionId}`, { enabled }, {
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

  private adminHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }
}

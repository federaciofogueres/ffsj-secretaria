import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'ffsj-web-components';
import { Observable, timeout } from 'rxjs';

import { ApiUrlService } from '../core/api-url.service';
import { AppLanguage } from '../core/i18n.service';

export type RubiRouteKey = 'home' | 'personas' | 'alta' | 'registro' | 'inscripciones' | 'soporte' | 'calendario' | 'solicitudes';
export type RubiAction =
  | { type: 'navigate'; destination: string; route?: string }
  | { type: 'start_flow'; flow: 'alta'; destination?: string; route?: string };

export interface RubiResponse {
  message: string;
  intent: string | null;
  actions: RubiAction[];
  errors: Array<{ code: string; message: string }>;
  metadata: { success: boolean };
}

@Injectable({ providedIn: 'root' })
export class RubiApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrl: ApiUrlService,
    private readonly auth: AuthService
  ) {}

  message(message: string, idioma: AppLanguage, routeKey?: RubiRouteKey): Observable<RubiResponse> {
    const payload: { message: string; idioma: AppLanguage; routeKey?: RubiRouteKey } = { message, idioma };
    if (routeKey) payload.routeKey = routeKey;

    return this.http.post<RubiResponse>(`${this.apiUrl.secretariaBasePath}/asistente/mensaje`, payload, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` })
    }).pipe(timeout(15000));
  }
}

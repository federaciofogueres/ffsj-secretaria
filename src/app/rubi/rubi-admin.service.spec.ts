import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ffsj-web-components';

import { ApiUrlService } from '../core/api-url.service';
import { RubiAdminService } from './rubi-admin.service';

describe('RubiAdminService', () => {
  let service: RubiAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RubiAdminService, provideHttpClient(), provideHttpClientTesting(),
        { provide: ApiUrlService, useValue: { secretariaBasePath: '/emjf1/Secretaria/1.0.0' } },
        { provide: AuthService, useValue: { getToken: () => 'test-token' } }
      ]
    });
    service = TestBed.inject(RubiAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the global configuration, provider status and budget', () => {
    service.getConfig().subscribe();
    const request = http.expectOne('/emjf1/Secretaria/1.0.0/admin/rubi/config');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({
      global: { enabled: true, realProviderEnabled: true, transactionalEnabled: true },
      provider: { killSwitchEnabled: true, provider: 'gemini', model: 'test', realProviderRequested: true, credentialConfigured: true, transactionalEnabled: true },
      budget: { dailyBudgetUsd: 0, dailyUsedUsd: 0, dailyPercent: null, dailyLimitReached: false, monthlyBudgetUsd: 0, monthlyUsedUsd: 0, monthlyPercent: null, monthlyLimitReached: false }
    });
  });

  it('sends only the changed boolean flags when updating the global configuration', () => {
    service.updateConfig({ enabled: false }).subscribe();
    const request = http.expectOne('/emjf1/Secretaria/1.0.0/admin/rubi/config');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ enabled: false });
    request.flush({ global: { enabled: false, realProviderEnabled: true, transactionalEnabled: true } });
  });

  it('lists associations with search and filter query params', () => {
    service.listAssociations({ search: 'Florida', filter: 'authorized' }).subscribe();
    const request = http.expectOne(r => r.url === '/emjf1/Secretaria/1.0.0/admin/rubi/asociaciones');
    expect(request.request.params.get('search')).toBe('Florida');
    expect(request.request.params.get('filter')).toBe('authorized');
    request.flush({ total: 1, items: [{ id: 3, nombre: 'Florida - Plaza de la Vina', authorized: true }] });
  });

  it('toggles a single association authorization', () => {
    service.setAssociationAuthorized(12, false).subscribe();
    const request = http.expectOne('/emjf1/Secretaria/1.0.0/admin/rubi/asociaciones/12');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ authorized: false });
    request.flush({ id: 12, nombre: 'Asociacion', authorized: false } as any);
  });

  it('requests analytics for the given period', () => {
    service.getAnalytics({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-08T00:00:00.000Z' }).subscribe();
    const request = http.expectOne(r => r.url === '/emjf1/Secretaria/1.0.0/admin/rubi/analiticas');
    expect(request.request.params.get('from')).toBe('2026-01-01T00:00:00.000Z');
    expect(request.request.params.get('to')).toBe('2026-01-08T00:00:00.000Z');
    request.flush({
      periodo: { desde: '2026-01-01T00:00:00.000Z', hasta: '2026-01-08T00:00:00.000Z' },
      llamadas: 0, inputTokens: 0, outputTokens: 0, costeUsd: 0, fallidas: 0, actoresUnicos: 0, asociacionesUnicas: 0
    });
  });
});

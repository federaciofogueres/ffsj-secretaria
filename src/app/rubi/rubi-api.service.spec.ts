import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ffsj-web-components';

import { ApiUrlService } from '../core/api-url.service';
import { RubiApiService } from './rubi-api.service';

describe('RubiApiService', () => {
  let service: RubiApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RubiApiService, provideHttpClient(), provideHttpClientTesting(),
        { provide: ApiUrlService, useValue: { secretariaBasePath: '/emjf1/Secretaria/1.0.0' } },
        { provide: AuthService, useValue: { getToken: () => 'test-token' } }
      ]
    });
    service = TestBed.inject(RubiApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only the allowed Rubi payload and current auth token', () => {
    service.message('Necesito ayuda', 'va', 'personas').subscribe();
    const request = http.expectOne('/emjf1/Secretaria/1.0.0/asistente/mensaje');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ message: 'Necesito ayuda', idioma: 'va', routeKey: 'personas' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ message: 'Resposta', intent: 'help', actions: [], errors: [], metadata: { success: true } });
  });
});

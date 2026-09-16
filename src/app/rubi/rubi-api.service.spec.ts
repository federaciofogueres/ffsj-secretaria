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
    service.message('Necesito ayuda', 'va', 'personas', [{ role: 'user', text: 'Una consulta anterior' }], { version: 1, module: 'asociados', view: 'listado' }).subscribe();
    const request = http.expectOne('/emjf1/Secretaria/1.0.0/asistente/mensaje');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ message: 'Necesito ayuda', idioma: 'va', routeKey: 'personas', history: [{ role: 'user', text: 'Una consulta anterior' }], screenContext: { version: 1, module: 'asociados', view: 'listado' } });
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ message: 'Resposta', intent: 'help', actions: [], errors: [], metadata: { success: true } });
  });

  it('uses the existing prepare endpoint and exposes only cancellation, never confirmation', () => {
    service.prepararAlta(7, { nif: 'TEST1234Z' }).subscribe();
    const prepare = http.expectOne('/emjf1/Secretaria/1.0.0/altas/preparar');
    expect(prepare.request.method).toBe('POST');
    expect(prepare.request.body).toEqual({ ejercicioId: 7, datos: { nif: 'TEST1234Z' } });
    prepare.flush({ estado: 'preparada' });

    service.cancelarPreparacionAlta('x'.repeat(43)).subscribe();
    const cancel = http.expectOne('/emjf1/Secretaria/1.0.0/altas/preparacion/cancelar');
    expect(cancel.request.method).toBe('POST');
    expect(cancel.request.body).toEqual({ confirmacion: 'x'.repeat(43) });
    cancel.flush({ cancelada: true });
    expect((service as any).confirmarAlta).toBeUndefined();
  });
});

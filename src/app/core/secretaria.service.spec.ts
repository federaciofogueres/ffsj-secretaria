import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ffsj-web-components';

import { ApiUrlService } from './api-url.service';
import { SecretariaService } from './secretaria.service';

// 0.40.0#ESMERALDA: getRegistros() olvidaba enviar destinatarioId en los
// HttpParams aunque el componente lo calculaba correctamente. El selector de
// buzón de Webmaster parecia funcionar (el <select> cambiaba de valor) pero
// la API nunca recibia el filtro y devolvia el scope global completo. Este
// spec fija el contrato HTTP para que una regresion asi rompa el build.
describe('SecretariaService - getRegistros', () => {
  let service: SecretariaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SecretariaService, provideHttpClient(), provideHttpClientTesting(),
        { provide: ApiUrlService, useValue: { secretariaBasePath: '/emjf1/Secretaria/1.0.0' } },
        { provide: AuthService, useValue: { getToken: () => 'test-token' } }
      ]
    });
    service = TestBed.inject(SecretariaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia destinatarioId como query param cuando Webmaster filtra por un buzon concreto', () => {
    service.getRegistros({ tipo: 'documentacion', destinatarioId: 11, page: 1, pageSize: 20 }).subscribe();
    const request = http.expectOne(req => req.url === '/emjf1/Secretaria/1.0.0/registros');
    expect(request.request.params.get('destinatarioId')).toBe('11');
    expect(request.request.params.get('tipo')).toBe('documentacion');
    request.flush({ registros: [] });
  });

  it('no envia destinatarioId cuando no hay buzon seleccionado ("Todos")', () => {
    service.getRegistros({ tipo: 'documentacion' }).subscribe();
    const request = http.expectOne(req => req.url === '/emjf1/Secretaria/1.0.0/registros');
    expect(request.request.params.has('destinatarioId')).toBeFalse();
    request.flush({ registros: [] });
  });
});

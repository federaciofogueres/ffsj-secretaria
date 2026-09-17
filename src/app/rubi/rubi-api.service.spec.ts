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
    expect(request.request.headers.get('X-Rubi-Session-Id')).toBeTruthy();
    request.flush({ message: 'Resposta', intent: 'help', actions: [], errors: [], metadata: { success: true } });
  });

  it('checks pilot access without starting a tracked session', () => {
    service.access().subscribe();
    const request = http.expectOne('/emjf1/Secretaria/1.0.0/asistente/acceso');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-Rubi-Session-Id')).toBeFalse();
    request.flush({ enabled: true, authorized: true });
  });

  it('sends only closed pilot events and structured feedback', () => {
    service.trackEvent({ event: 'flow_started', stage: 'alta' }).subscribe();
    const event = http.expectOne('/emjf1/Secretaria/1.0.0/asistente/eventos');
    expect(event.request.body).toEqual({ event: 'flow_started', stage: 'alta' });
    expect(event.request.headers.get('X-Rubi-Session-Id')).toBeTruthy();
    event.flush({ accepted: true });

    service.feedback('not_helpful', { intent: 'help', tool: 'search_help' }).subscribe();
    const feedback = http.expectOne('/emjf1/Secretaria/1.0.0/asistente/feedback');
    expect(feedback.request.body).toEqual({ rating: 'not_helpful', reason: 'not_useful', intent: 'help', tool: 'search_help' });
    expect(JSON.stringify(feedback.request.body)).not.toContain('message');
    feedback.flush({ accepted: true });
  });

  it('uses direct deterministic endpoints for preparation, cancellation and human confirmation', () => {
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

    service.confirmarAlta('y'.repeat(43)).subscribe();
    const confirm = http.expectOne('/emjf1/Secretaria/1.0.0/altas/confirmar');
    expect(confirm.request.method).toBe('POST');
    expect(confirm.request.body).toEqual({ confirmacion: 'y'.repeat(43), confirmar: true });
    confirm.flush({ solicitudId: 501, numero: 'SOL-501', idempotentReplay: false });
  });

  it('uses direct deterministic endpoints for assisted modifications', () => {
    service.prepararModificacion(7, 91, { telefono: '611111111' }).subscribe();
    const prepare = http.expectOne('/emjf1/Secretaria/1.0.0/modificaciones/preparar');
    expect(prepare.request.body).toEqual({ ejercicioId: 7, asociadoId: 91, cambios: { telefono: '611111111' } });
    prepare.flush({ estado: 'preparada' });
    service.cancelarPreparacionModificacion('x'.repeat(43)).subscribe();
    const cancel = http.expectOne('/emjf1/Secretaria/1.0.0/modificaciones/preparacion/cancelar');
    expect(cancel.request.body).toEqual({ confirmacion: 'x'.repeat(43) }); cancel.flush({ cancelada: true });
    service.confirmarModificacion('y'.repeat(43)).subscribe();
    const confirm = http.expectOne('/emjf1/Secretaria/1.0.0/modificaciones/confirmar');
    expect(confirm.request.body).toEqual({ confirmacion: 'y'.repeat(43), confirmar: true });
    confirm.flush({ solicitudId: 501, idempotentReplay: false });
  });

  it('uses direct deterministic endpoints for assisted removals', () => {
    service.prepararBaja(7, 91, 'Voluntaria').subscribe();
    const prepare = http.expectOne('/emjf1/Secretaria/1.0.0/bajas/preparar');
    expect(prepare.request.body).toEqual({ ejercicioId: 7, asociadoId: 91, motivo: 'Voluntaria' });
    prepare.flush({ estado: 'preparada' });
    service.cancelarPreparacionBaja('x'.repeat(43)).subscribe();
    const cancel = http.expectOne('/emjf1/Secretaria/1.0.0/bajas/preparacion/cancelar');
    expect(cancel.request.body).toEqual({ confirmacion: 'x'.repeat(43) }); cancel.flush({ cancelada: true });
    service.confirmarBaja('y'.repeat(43)).subscribe();
    const confirm = http.expectOne('/emjf1/Secretaria/1.0.0/bajas/confirmar');
    expect(confirm.request.body).toEqual({ confirmacion: 'y'.repeat(43), confirmar: true });
    confirm.flush({ solicitudId: 501, idempotentReplay: false });
  });
});

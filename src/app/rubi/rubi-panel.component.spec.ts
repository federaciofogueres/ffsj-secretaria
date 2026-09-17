import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { RubiApiService, RubiResponse } from './rubi-api.service';
import { RubiConversationService } from './rubi-conversation.service';
import { RubiPanelComponent } from './rubi-panel.component';

describe('RubiPanelComponent', () => {
  let fixture: ComponentFixture<RubiPanelComponent>;
  let component: RubiPanelComponent;
  let api: jasmine.SpyObj<RubiApiService>;
  let router: Router;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RubiApiService>('RubiApiService', ['access', 'message', 'startSession', 'resetSession', 'trackEvent', 'feedback']);
    api.access.and.returnValue(of({ enabled: true, authorized: true }));
    api.trackEvent.and.returnValue(of({ accepted: true }));
    api.feedback.and.returnValue(of({ accepted: true }));
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, RubiPanelComponent],
      providers: [
        I18nService, RubiConversationService,
        { provide: RubiApiService, useValue: api }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RubiPanelComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    TestBed.inject(I18nService).setLanguage('es');
    fixture.detectChanges();
  });

  it('opens and closes without clearing the session conversation', () => {
    component.show();
    expect(component.open).toBeTrue();
    expect(component.messages.length).toBe(1);
    component.close();
    expect(component.open).toBeFalse();
    expect(component.messages.length).toBe(1);
  });

  it('keeps the launcher unavailable for a user outside the pilot', () => {
    api.access.and.returnValue(of({ enabled: true, authorized: false }));
    const deniedFixture = TestBed.createComponent(RubiPanelComponent);
    deniedFixture.detectChanges();
    expect(deniedFixture.componentInstance.accessGranted).toBeFalse();
    deniedFixture.componentInstance.show();
    expect(deniedFixture.componentInstance.open).toBeFalse();
  });

  it('sends a quick action and renders a safe response action', () => {
    const response: RubiResponse = { message: 'Puedes abrir el registro.', intent: 'navigate', actions: [{ type: 'navigate', destination: 'registro', route: '/registro' }], conversation: { intent: 'navigate', tool: 'navigate_to', destination: 'registro', topic: 'registro', module: 'registro' }, errors: [], metadata: { success: true } };
    api.message.and.returnValue(of(response));
    component.show();
    component.sendQuickAction('rubi.quick.documents');
    expect(api.message).toHaveBeenCalledWith('Enviar documentacion', 'es', 'home', [], { version: 1, module: 'home', view: 'inicio' });
    expect(component.messages[component.messages.length - 1].actions).toEqual(response.actions);
    expect(component.messages[component.messages.length - 1].topic).toBe('registro');
  });

  it('prevents duplicate sends while a request is in progress', () => {
    api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
    component.loading = true;
    component.draft = 'Hola';
    component.send();
    expect(api.message).not.toHaveBeenCalled();
  });

  it('keeps the draft and explains a rate limit response', () => {
    api.message.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.draft = 'Ayuda';
    component.send();
    expect(component.draft).toBe('Ayuda');
    expect(component.messages[component.messages.length - 1].text).toContain('limite temporal');
  });

  it('marks Rubi unavailable when the Gateway is disabled', () => {
    api.message.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503, error: { errors: [{ code: 'RUBI_DISABLED' }] } })));
    component.draft = 'Ayuda';
    component.send();
    expect(component.unavailable).toBeTrue();
  });

  it('opens the structured alta inside Rubi and does not navigate to an untrusted route', () => {
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'alta', route: 'https://invalid.example' });
    expect(component.altaActive).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('opens the structured modification flow without executing it through chat', () => {
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'modificacion', route: 'https://invalid.example' });
    expect(component.modificationActive).toBeTrue();
    expect(api.trackEvent).toHaveBeenCalledWith({ event: 'flow_started', stage: 'modificacion' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('opens the structured baja flow without executing it through chat', () => {
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'baja', route: 'https://invalid.example' });
    expect(component.bajaActive).toBeTrue();
    expect(api.trackEvent).toHaveBeenCalledWith({ event: 'flow_started', stage: 'baja' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('sends only abstract preparation state when chat is used during human confirmation', () => {
    api.message.and.returnValue(of({ message: 'Usa el control del formulario', intent: 'help', actions: [], errors: [], metadata: { success: true } }));
    component.executeAction({ type: 'start_flow', flow: 'alta' });
    component.onAltaPreparationStateChanged(true);
    component.draft = 'Confírmala';
    component.send();
    const args = api.message.calls.mostRecent().args;
    expect(args[4]?.state).toEqual({ hasOpenRegistration: true });
    expect(JSON.stringify(args[4])).not.toContain('Persona');
  });

  it('sends only abstract baja preparation state to the screen context', () => {
    api.message.and.returnValue(of({ message: 'Usa el control del formulario', intent: 'help', actions: [], errors: [], metadata: { success: true } }));
    component.executeAction({ type: 'start_flow', flow: 'baja' });
    component.onBajaPreparationStateChanged(true);
    component.draft = 'Confirma la baja';
    component.send();
    const args = api.message.calls.mostRecent().args;
    expect(args[4]?.state).toEqual({ hasOpenBaja: true });
    expect(JSON.stringify(args[4])).not.toContain('Persona');
  });

  it('excludes the message that starts a sensitive alta flow from later provider history', () => {
    api.message.and.returnValue(of({
      message: 'Formulario seguro', intent: 'start_alta',
      actions: [{ type: 'start_flow', flow: 'alta', destination: 'alta' }],
      conversation: { intent: 'start_alta', tool: 'start_alta', sensitiveFlow: 'alta' },
      errors: [], metadata: { success: true }
    }));
    component.send('Quiero dar de alta a Persona Privada TEST1234Z');
    expect(TestBed.inject(RubiConversationService).recentHistory().some(item => item.text.includes('Persona Privada'))).toBeFalse();
  });

  it('uses the current language for subsequent Gateway calls', () => {
    api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
    TestBed.inject(I18nService).setLanguage('en');
    component.draft = 'Help';
    component.send();
    expect(api.message).toHaveBeenCalledWith('Help', 'en', 'home', [], { version: 1, module: 'home', view: 'inicio' });
  });

  it('provides the new pilot and feedback labels in ES, VA and EN', () => {
    const i18n = TestBed.inject(I18nService);
    for (const language of ['es', 'va', 'en'] as const) {
      i18n.setLanguage(language);
      expect(i18n.t('rubi.pilot')).not.toBe('rubi.pilot');
      expect(i18n.t('rubi.feedback.question')).not.toBe('rubi.feedback.question');
      expect(i18n.t('rubi.feedback.helpful')).not.toBe('rubi.feedback.helpful');
      expect(i18n.t('rubi.feedback.notHelpful')).not.toBe('rubi.feedback.notHelpful');
      expect(i18n.t('rubi.feedback.thanks')).not.toBe('rubi.feedback.thanks');
    }
  });

  it('renders Gateway text as text rather than HTML', () => {
    api.message.and.returnValue(of({ message: '<img src=x onerror=alert(1)>', intent: null, actions: [], errors: [], metadata: { success: true } }));
    component.show();
    component.draft = 'Ayuda';
    component.send();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rubi-message img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('records structured feedback without conversation text', () => {
    api.message.and.returnValue(of({ message: 'Respuesta segura', intent: 'help', actions: [], tool: { name: 'search_help', status: 'completed' }, errors: [], metadata: { success: true } }));
    component.send('Pregunta con datos que no deben ir en feedback');
    const answer = component.messages[component.messages.length - 1];
    component.sendFeedback(answer, 'helpful');
    expect(api.feedback).toHaveBeenCalledWith('helpful', { intent: 'help', tool: 'search_help' });
    expect(JSON.stringify(api.feedback.calls.mostRecent().args)).not.toContain('Pregunta con datos');
    expect(answer.text).toBe('Respuesta segura');
  });
});

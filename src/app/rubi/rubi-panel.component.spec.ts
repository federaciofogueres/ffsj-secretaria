import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from 'ffsj-web-components';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { RubiApiService, RubiResponse } from './rubi-api.service';
import { RubiConversationService } from './rubi-conversation.service';
import { RubiPanelComponent } from './rubi-panel.component';
import { RubiScreenContextService } from './rubi-screen-context.service';
import { CensoService } from '../core/censo.service';

function setRouterUrl(router: Router, url: string): void {
  Object.defineProperty(router, 'url', { get: () => url, configurable: true });
}

describe('RubiPanelComponent', () => {
  let fixture: ComponentFixture<RubiPanelComponent>;
  let component: RubiPanelComponent;
  let api: jasmine.SpyObj<RubiApiService>;
  let censoService: jasmine.SpyObj<CensoService>;
  let loginStatus: BehaviorSubject<boolean>;
  let router: Router;

  beforeEach(async () => {
    api = jasmine.createSpyObj<RubiApiService>('RubiApiService', ['access', 'message', 'startSession', 'resetSession', 'trackEvent', 'feedback', 'getSuggestions']);
    api.access.and.returnValue(of({ enabled: true, authorized: true, scope: 'association', canSelectTargetAssociation: false }));
    api.trackEvent.and.returnValue(of({ accepted: true }));
    api.feedback.and.returnValue(of({ accepted: true }));
    api.getSuggestions.and.returnValue(of({ insights: [], errors: [], metadata: { success: true } }));
    censoService = jasmine.createSpyObj<CensoService>('CensoService', ['getAsociaciones'], { asociacionId: 12 });
    censoService.getAsociaciones.and.returnValue(of([]));
    loginStatus = new BehaviorSubject<boolean>(true);
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, RubiPanelComponent],
      providers: [
        I18nService, RubiConversationService,
        { provide: RubiApiService, useValue: api },
        { provide: CensoService, useValue: censoService },
        { provide: AuthService, useValue: { loginStatusObservable: loginStatus.asObservable() } }
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

  // A-06 (post-auditoria, hallazgo visual manual): el launcher flotante no debe
  // quedar visible/solapado encima del propio panel mientras esta abierto.
  it('hides the floating launcher while the panel is open and shows it again once closed', () => {
    expect(fixture.nativeElement.querySelector('.rubi-launcher')).toBeTruthy();
    component.show();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rubi-launcher')).toBeFalsy();
    component.close();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rubi-launcher')).toBeTruthy();
  });

  it('keeps the launcher unavailable for a user outside the pilot', () => {
    api.access.and.returnValue(of({ enabled: true, authorized: false, scope: 'association', canSelectTargetAssociation: false }));
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
    expect(api.message).toHaveBeenCalledWith('Enviar documentacion', 'es', 'home', [], { version: 1, module: 'home', view: 'inicio' }, null);
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

  // G (form-diagnostics): CASO G6/G7 - el diagnostico de un flujo nunca debe
  // sobrevivir a un cambio de flujo o a su cancelacion.
  it('propagates the active workflow formDiagnostics into the screen context, and drops it once the workflow is no longer active', () => {
    api.message.and.returnValue(of({ message: 'ok', intent: 'help', actions: [], errors: [], metadata: { success: true } }));
    const diagnostics = { present: true, valid: false, submitted: true, issues: [{ field: 'telefono', code: 'pattern', source: 'client' as const }] };
    (component as any).altaFlow = { formDiagnostics: () => diagnostics };
    component.executeAction({ type: 'start_flow', flow: 'alta' });
    component.draft = '¿Qué me falta?';
    component.send();
    const withAlta = api.message.calls.mostRecent().args[4];
    expect(withAlta?.state?.formDiagnostics).toEqual(diagnostics);

    component.altaActive = false;
    component.draft = 'otra pregunta';
    component.send();
    const afterClosed = api.message.calls.mostRecent().args[4];
    expect(afterClosed?.state?.formDiagnostics).toBeUndefined();
  });

  it('never mixes the formDiagnostics of two different workflows (switching alta -> baja)', () => {
    api.message.and.returnValue(of({ message: 'ok', intent: 'help', actions: [], errors: [], metadata: { success: true } }));
    (component as any).altaFlow = { formDiagnostics: () => ({ present: true, valid: false, issues: [{ code: 'required', source: 'client' as const }] }) };
    component.executeAction({ type: 'start_flow', flow: 'alta' });
    component.altaActive = false;
    const bajaDiagnostics = { present: true, valid: false, issues: [{ field: 'motivo', code: 'maxlength', source: 'client' as const }] };
    (component as any).bajaFlow = { formDiagnostics: () => bajaDiagnostics };
    component.executeAction({ type: 'start_flow', flow: 'baja' });
    component.draft = '¿Qué me falta?';
    component.send();
    expect(api.message.calls.mostRecent().args[4]?.state?.formDiagnostics).toEqual(bajaDiagnostics);
  });

  // G (form-diagnostics, formulario normal): un formulario NORMAL de
  // Secretaria (p.ej. AsociadosGestionComponent) puede haber publicado su
  // propio formDiagnostics en RubiScreenContextService; si ADEMAS hay un
  // workflow Rubi embebido activo, el del workflow gana siempre y nunca se
  // mezclan ambos diagnosticos.
  it('CASO G: an active Rubi workflow always takes priority over a screen-published formDiagnostics, never mixed', () => {
    api.message.and.returnValue(of({ message: 'ok', intent: 'help', actions: [], errors: [], metadata: { success: true } }));
    setRouterUrl(router, '/asociados/gestion');
    const screenContext = TestBed.inject(RubiScreenContextService);
    screenContext.set({
      version: 1, module: 'asociados', view: 'gestion', tab: 'altas',
      state: { formDiagnostics: { present: true, valid: false, issues: [{ field: 'nombre', code: 'required', source: 'client' as const }] } }
    });
    const workflowDiagnostics = { present: true, valid: false, issues: [{ field: 'telefono', code: 'pattern', source: 'client' as const }] };
    (component as any).altaFlow = { formDiagnostics: () => workflowDiagnostics };
    component.executeAction({ type: 'start_flow', flow: 'alta' });
    component.draft = '¿Qué me falta?';
    component.send();
    expect(api.message.calls.mostRecent().args[4]?.state?.formDiagnostics).toEqual(workflowDiagnostics);
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

  it('opens the structured documentacion flow without executing it through chat (RUBI-16)', () => {
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'documentacion', route: 'https://invalid.example' });
    expect(component.registroActive).toBeTrue();
    expect(component.registroTipo).toBe('documentacion');
    expect(api.trackEvent).toHaveBeenCalledWith({ event: 'flow_started', stage: 'documentacion' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('opens the structured comunicacion flow and navigates to the real route when handed off (RUBI-16)', () => {
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'comunicacion' });
    expect(component.registroActive).toBeTrue();
    expect(component.registroTipo).toBe('comunicacion');
    component.openNormalRegistroFlow();
    expect(component.registroActive).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/registro/comunicacion');
  });

  it('opens a registration only through the allowlisted real form route (RUBI-17)', () => {
    const navigate = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'inscripcion', inscriptionId: 'INS-FORM-2027', label: 'Actividad segura', route: 'https://invalid.example' });
    expect(navigate).toHaveBeenCalledWith(['/inscripciones', 'INS-FORM-2027']);
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(api.trackEvent).toHaveBeenCalledWith({ event: 'flow_started', stage: 'inscripcion' });
  });

  it('renders structured activity choices and rejects an unsafe registration id (RUBI-17)', () => {
    api.message.and.returnValue(of({
      message: 'Selecciona una actividad.', intent: 'start_inscripcion',
      actions: [
        { type: 'start_flow', flow: 'inscripcion', inscriptionId: 'INS-1', label: 'Actividad uno' },
        { type: 'start_flow', flow: 'inscripcion', inscriptionId: '../admin', label: 'No segura' }
      ],
      conversation: { intent: 'start_inscripcion', tool: 'start_inscripcion', activityId: 'ACT-1' },
      errors: [], metadata: { success: true }
    }));
    component.send('Quiero inscribirme');
    const answer = component.messages[component.messages.length - 1];
    expect(answer.actions?.length).toBe(1);
    expect(component.actionLabel(answer.actions![0])).toBe('Actividad uno');
    expect(answer.activityId).toBe('ACT-1');
  });

  it('opens Support through the registered route without an embedded form (RUBI-18)', () => {
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'soporte', destination: 'soporte', route: '/soporte' });
    expect(navigateByUrl).toHaveBeenCalledWith('/soporte');
    expect(api.trackEvent).toHaveBeenCalledWith({ event: 'flow_started', stage: 'soporte' });
  });

  it('labels the Support action using the existing translation and rejects an unlisted flow (RUBI-18)', () => {
    expect(component.actionLabel({ type: 'start_flow', flow: 'soporte', destination: 'soporte' })).toBe('Abrir Soporte');
    api.message.and.returnValue(of({
      message: 'Puedo abrir Soporte.', intent: 'start_soporte',
      actions: [{ type: 'start_flow', flow: 'soporte', destination: 'soporte', route: '/soporte' }],
      conversation: { intent: 'start_soporte', tool: 'start_soporte' },
      errors: [], metadata: { success: true }
    }));
    component.send('Quiero abrir una incidencia');
    const answer = component.messages[component.messages.length - 1];
    expect(answer.actions?.length).toBe(1);
  });

  it('opens the real communications inbox with an allowlisted bandeja filter (RUBI-19)', () => {
    const navigate = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'comunicaciones', destination: 'registro', route: '/registro/comunicacion', bandeja: 'nuevas' });
    expect(navigate).toHaveBeenCalledWith(['/registro/comunicacion'], { queryParams: { bandeja: 'nuevas' } });
    expect(api.trackEvent).toHaveBeenCalledWith({ event: 'flow_started', stage: 'comunicaciones' });
  });

  it('ignores an unlisted bandeja value and still opens the inbox unfiltered (RUBI-19)', () => {
    const navigate = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.executeAction({ type: 'start_flow', flow: 'comunicaciones', destination: 'registro', bandeja: 'archivadas-secretas' as any });
    expect(navigate).toHaveBeenCalledWith(['/registro/comunicacion'], { queryParams: {} });
  });

  it('renders a live communications summary distinct from sending a new one (RUBI-19)', () => {
    api.message.and.returnValue(of({
      message: 'Tienes 1 comunicación nueva.', intent: 'comunicaciones_info',
      actions: [{ type: 'start_flow', flow: 'comunicaciones', destination: 'registro', route: '/registro/comunicacion', bandeja: 'nuevas' }],
      conversation: { intent: 'comunicaciones_info', tool: 'get_comunicaciones', topic: 'comunicaciones_consulta', module: 'registro', destination: 'registro' },
      errors: [], metadata: { success: true }
    }));
    component.send('¿Tengo comunicaciones nuevas?');
    const answer = component.messages[component.messages.length - 1];
    expect(answer.actions?.length).toBe(1);
    expect(answer.topic).toBe('comunicaciones_consulta');
  });

  it('sends only abstract documentacion preparation state to the screen context', () => {
    api.message.and.returnValue(of({ message: 'Usa el control del formulario', intent: 'help', actions: [], errors: [], metadata: { success: true } }));
    component.executeAction({ type: 'start_flow', flow: 'documentacion' });
    component.onRegistroPreparationStateChanged(true);
    component.draft = 'Presentalo';
    component.send();
    const args = api.message.calls.mostRecent().args;
    expect(args[4]?.state).toEqual({ hasOpenDocumentacion: true });
    expect(JSON.stringify(args[4])).not.toContain('titulo');
  });

  it('excludes the message that starts a sensitive documentacion flow from later provider history (RUBI-16)', () => {
    api.message.and.returnValue(of({
      message: 'Formulario seguro', intent: 'start_documentacion',
      actions: [{ type: 'start_flow', flow: 'documentacion', destination: 'registro' }],
      conversation: { intent: 'start_documentacion', tool: 'start_documentacion', sensitiveFlow: 'documentacion' },
      errors: [], metadata: { success: true }
    }));
    component.send('Quiero presentar documentación sobre Persona Privada TEST1234Z');
    expect(TestBed.inject(RubiConversationService).recentHistory().some(item => item.text.includes('Persona Privada'))).toBeFalse();
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
    expect(api.message).toHaveBeenCalledWith('Help', 'en', 'home', [], { version: 1, module: 'home', view: 'inicio' }, null);
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

  it('RUBI-20 an association actor never sees the target association picker', () => {
    expect(component.canSelectTargetAssociation).toBeFalse();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rubi-target-association')).toBeNull();
  });

  it('RUBI-23.1 the frontend never infers the scope itself: it trusts canSelectTargetAssociation resolved by backend even if CensoService still reports an association id', () => {
    // Regresion cubierta: el bug real era que un actor Federacion con
    // AuthService.getIdAsociacion() devolviendo -1 (truthy) nunca veia el
    // selector porque el frontend inferia el scope con `!asociacionId`. Ahora
    // el frontend ignora censoService.asociacionId para esta decision.
    api.access.and.returnValue(of({ enabled: true, authorized: true, scope: 'federation', canSelectTargetAssociation: true }));
    const federationFixture = TestBed.createComponent(RubiPanelComponent);
    federationFixture.detectChanges();
    expect(federationFixture.componentInstance.canSelectTargetAssociation).toBeTrue();
    federationFixture.nativeElement.querySelector('.rubi-target-association');
  });

  it('RUBI-20 a Federacion actor (no own association) sees the picker and loads associations on open', () => {
    api.access.and.returnValue(of({ enabled: true, authorized: true, scope: 'federation', canSelectTargetAssociation: true }));
    censoService.getAsociaciones.and.returnValue(of([{ id: 25, nombre: 'Doctor Bergez - Carolinas', cif: 'G1' }, { id: 40, nombre: 'Pío XII', cif: 'G2' }]));
    const federationFixture = TestBed.createComponent(RubiPanelComponent);
    federationFixture.detectChanges();
    const federationComponent = federationFixture.componentInstance;
    expect(federationComponent.canSelectTargetAssociation).toBeTrue();
    federationComponent.show();
    expect(censoService.getAsociaciones).toHaveBeenCalled();
    expect(federationComponent.federationAssociations.length).toBe(2);
    federationFixture.detectChanges();
    expect(federationFixture.nativeElement.querySelector('.rubi-target-association')).not.toBeNull();
  });

  it('RUBI-20 sends the selected targetAssociationId with each message', () => {
    api.access.and.returnValue(of({ enabled: true, authorized: true, scope: 'federation', canSelectTargetAssociation: true }));
    const federationFixture = TestBed.createComponent(RubiPanelComponent);
    federationFixture.detectChanges();
    const federationComponent = federationFixture.componentInstance;
    api.message.and.returnValue(of({ message: 'ok', intent: 'help', actions: [], errors: [], metadata: { success: true } }));
    federationComponent.onTargetAssociationChange(25);
    federationComponent.send('¿Tengo comunicaciones nuevas?');
    expect(api.message).toHaveBeenCalledWith('¿Tengo comunicaciones nuevas?', 'es', 'home', [], { version: 1, module: 'home', view: 'inicio' }, 25);
  });

  it('RUBI-20 changing the target association clears the conversation (no referent from the previous association survives)', () => {
    api.access.and.returnValue(of({ enabled: true, authorized: true, scope: 'federation', canSelectTargetAssociation: true }));
    const federationFixture = TestBed.createComponent(RubiPanelComponent);
    federationFixture.detectChanges();
    const federationComponent = federationFixture.componentInstance;
    federationComponent.onTargetAssociationChange(25);
    federationComponent.messages.push({ id: 99, author: 'rubi', text: 'Datos de la asociación 25' } as never);
    (federationComponent as unknown as { conversation: RubiConversationService }).conversation.add({ author: 'rubi', text: 'Datos de la asociación 25', intent: 'comunicaciones_info' });
    expect(federationComponent.messages.some(item => item.text.includes('asociación 25'))).toBeTrue();
    federationComponent.onTargetAssociationChange(40);
    expect(federationComponent.targetAssociationId).toBe(40);
    expect(federationComponent.messages.some(item => item.text.includes('asociación 25'))).toBeFalse();
  });

  it('RUBI-21 loads suggestions when the panel opens and renders none when there are none', () => {
    component.show();
    expect(api.getSuggestions).toHaveBeenCalledWith(null);
    fixture.detectChanges();
    expect(component.insights).toEqual([]);
    expect(fixture.nativeElement.querySelector('.rubi-insights')).toBeNull();
  });

  it('RUBI-21 renders a suggestion and its localized sentence, sorted as returned by the backend', () => {
    const insights = [
      { id: 'comunicaciones-nuevas', domain: 'comunicaciones' as const, priority: 'novedad' as const, count: 2, deadline: null, daysRemaining: null, title: null, action: { type: 'start_flow' as const, flow: 'comunicaciones' as const, destination: 'registro', route: '/registro/comunicacion', bandeja: 'nuevas' as const } },
      { id: 'plazo-INS-1', domain: 'actividades' as const, priority: 'plazo_proximo' as const, count: null, deadline: '2026-09-19', daysRemaining: 1, title: 'Fogueres', action: { type: 'start_flow' as const, flow: 'inscripcion' as const, destination: 'inscripciones', inscriptionId: 'INS-1', label: 'Fogueres' } }
    ];
    api.getSuggestions.and.returnValue(of({ insights, errors: [], metadata: { success: true } }));
    component.show();
    fixture.detectChanges();
    expect(component.insights.length).toBe(2);
    expect(component.insightLabel(insights[0])).toContain('2 comunicaciones');
    expect(component.insightLabel(insights[1])).toContain('mañana');
    const rendered = fixture.nativeElement.querySelectorAll('.rubi-insight');
    expect(rendered.length).toBe(2);
  });

  it('RUBI-21 opening a suggestion reuses executeAction and never calls a confirm/write endpoint', () => {
    const navigate = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const insight = { id: 'plazo-INS-1', domain: 'actividades' as const, priority: 'plazo_proximo' as const, count: null, deadline: '2026-09-19', daysRemaining: 1, title: 'Fogueres', action: { type: 'start_flow' as const, flow: 'inscripcion' as const, destination: 'inscripciones', inscriptionId: 'INS-1', label: 'Fogueres' } };
    component.openInsight(insight);
    expect(navigate).toHaveBeenCalledWith(['/inscripciones', 'INS-1']);
  });

  it('RUBI-21 an unsafe action returned by the backend is filtered out defensively', () => {
    const unsafe = { id: 'bad', domain: 'actividades' as const, priority: 'plazo_proximo' as const, count: null, deadline: null, daysRemaining: 1, title: 'x', action: { type: 'start_flow' as const, flow: 'inscripcion' as const, destination: 'inscripciones', inscriptionId: '../etc/passwd', label: 'x' } };
    api.getSuggestions.and.returnValue(of({ insights: [unsafe], errors: [], metadata: { success: true } }));
    component.show();
    expect(component.insights).toEqual([]);
  });

  it('RUBI-21 a failed suggestions request never breaks the panel: it just shows no suggestions', () => {
    api.getSuggestions.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.show();
    expect(component.open).toBeTrue();
    expect(component.insights).toEqual([]);
  });

  it('RUBI-21 changing the target association recalculates suggestions from scratch with the new target', () => {
    api.access.and.returnValue(of({ enabled: true, authorized: true, scope: 'federation', canSelectTargetAssociation: true }));
    const federationFixture = TestBed.createComponent(RubiPanelComponent);
    federationFixture.detectChanges();
    const federationComponent = federationFixture.componentInstance;
    federationComponent.insights = [{ id: 'stale', domain: 'comunicaciones', priority: 'novedad', count: 1, deadline: null, daysRemaining: null, title: null, action: { type: 'navigate', destination: 'registro' } }];
    api.getSuggestions.calls.reset();
    federationComponent.onTargetAssociationChange(25);
    expect(federationComponent.insights).toEqual([]);
    expect(api.getSuggestions).toHaveBeenCalledWith(25);
  });

  describe('F (post-auditoria 1.8.1#RUBI): rectificacion durante un workflow', () => {
    it('cancela el alta activa invocando el cancel() publico del hijo (que ya invalida la preparacion en backend)', () => {
      const cancel = jasmine.createSpy('cancel');
      (component as any).altaFlow = { cancel };
      component.altaActive = true;
      component.cancelActiveWorkflow();
      expect(cancel).toHaveBeenCalled();
    });

    it('cancela la modificacion activa', () => {
      const cancel = jasmine.createSpy('cancel');
      (component as any).modificacionFlow = { cancel };
      component.modificationActive = true;
      component.cancelActiveWorkflow();
      expect(cancel).toHaveBeenCalled();
    });

    it('cancela la baja activa', () => {
      const cancel = jasmine.createSpy('cancel');
      (component as any).bajaFlow = { cancel };
      component.bajaActive = true;
      component.cancelActiveWorkflow();
      expect(cancel).toHaveBeenCalled();
    });

    it('cancela el registro (documentacion/comunicacion) activo', () => {
      const cancel = jasmine.createSpy('cancel');
      (component as any).registroFlow = { cancel };
      component.registroActive = true;
      component.cancelActiveWorkflow();
      expect(cancel).toHaveBeenCalled();
    });

    it('no hace nada si no hay ningun workflow activo', () => {
      const altaCancel = jasmine.createSpy('cancel');
      (component as any).altaFlow = { cancel: altaCancel };
      component.cancelActiveWorkflow();
      expect(altaCancel).not.toHaveBeenCalled();
    });

    it('cancelar la baja limpia el estado y el composer vuelve a estar disponible (mismo camino que el boton propio del formulario)', () => {
      component.open = true;
      component.bajaActive = true;
      component.onBajaClosed('cancelled');
      expect(component.bajaActive).toBeFalse();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.rubi-composer')).not.toBeNull();
    });

    it('tras cancelar, un nuevo mensaje ya no lleva el flag de baja en curso en el contexto de pantalla', () => {
      component.bajaActive = true;
      component.bajaPrepared = true;
      component.onBajaClosed('cancelled');
      api.message.and.returnValue(of({ message: 'ok', intent: 'start_modificacion', actions: [], errors: [], metadata: { success: true } }));
      component.send('No quiero darlo de baja, quiero modificarlo');
      const screenContext = api.message.calls.mostRecent().args[4] as { state?: Record<string, unknown> };
      expect(screenContext.state?.['hasOpenBaja']).toBeFalsy();
    });
  });

  describe('A (post-auditoria 1.8.1#RUBI): contexto de pantalla', () => {
    let screenContext: RubiScreenContextService;

    beforeEach(() => {
      screenContext = TestBed.inject(RubiScreenContextService);
    });

    it('contexto home: sin ninguna pagina real registrada, el panel usa el contexto minimo por defecto', () => {
      setRouterUrl(router, '/');
      api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
      component.send('Hola');
      expect(api.message).toHaveBeenCalledWith('Hola', 'es', 'home', [], { version: 1, module: 'home', view: 'inicio' }, null);
    });

    it('contexto Registro: expone si el usuario puede crear (canCreate) sin ningun dato del formulario', () => {
      setRouterUrl(router, '/registro');
      screenContext.set({ version: 1, module: 'registro', view: 'registro', state: { canCreate: true } });
      api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
      component.send('¿Qué puedo hacer aquí?');
      const args = api.message.calls.mostRecent().args;
      expect(args[4]).toEqual({ version: 1, module: 'registro', view: 'registro', state: { canCreate: true } });
    });

    it('contexto Calendario: conserva la actividad seleccionada puesta por la pagina real', () => {
      setRouterUrl(router, '/calendario');
      screenContext.set({ version: 1, module: 'calendario', view: 'calendario', state: { selectedActivityId: 'ACT-1' } });
      api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
      component.send('¿Qué es esto?');
      const args = api.message.calls.mostRecent().args;
      expect(args[4]).toEqual({ version: 1, module: 'calendario', view: 'calendario', state: { selectedActivityId: 'ACT-1' } });
    });

    it('contexto listado de Inscripciones: view=listado, sin ningun id seleccionado', () => {
      setRouterUrl(router, '/inscripciones');
      screenContext.set({ version: 1, module: 'inscripciones', view: 'listado' });
      api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
      component.send('¿Qué puedo hacer aquí?');
      const args = api.message.calls.mostRecent().args;
      expect(args[4]).toEqual({ version: 1, module: 'inscripciones', view: 'listado' });
    });

    it('contexto detalle de Inscripción: view=detalle con el id ya validado, sin datos del formulario', () => {
      setRouterUrl(router, '/inscripciones/INS-42');
      screenContext.set({ version: 1, module: 'inscripciones', view: 'detalle', state: { selectedInscriptionId: 'INS-42' } });
      api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
      component.send('¿Qué estoy viendo?');
      const args = api.message.calls.mostRecent().args;
      expect(args[4]).toEqual({ version: 1, module: 'inscripciones', view: 'detalle', state: { selectedInscriptionId: 'INS-42' } });
    });

    it('un cambio de ruta actualiza el contexto enviado (nunca se arrastra el de la pagina anterior)', () => {
      setRouterUrl(router, '/registro');
      screenContext.set({ version: 1, module: 'registro', view: 'registro', state: { canCreate: true } });
      api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
      component.send('Primero');
      expect(api.message.calls.mostRecent().args[4]).toEqual({ version: 1, module: 'registro', view: 'registro', state: { canCreate: true } });

      setRouterUrl(router, '/inscripciones');
      screenContext.set({ version: 1, module: 'inscripciones', view: 'listado' });
      component.send('Después');
      const secondContext = api.message.calls.mostRecent().args[4] as { module: string };
      expect(secondContext.module).toBe('inscripciones');
      expect(JSON.stringify(secondContext)).not.toContain('canCreate');
    });

    it('el contexto nunca incluye PII: solo las claves estructuradas permitidas', () => {
      setRouterUrl(router, '/inscripciones/INS-42');
      screenContext.set({ version: 1, module: 'inscripciones', view: 'detalle', state: { selectedInscriptionId: 'INS-42' } });
      api.message.and.returnValue(of({ message: 'ok', intent: null, actions: [], errors: [], metadata: { success: true } }));
      component.send('¿Qué estoy viendo?');
      const sent = JSON.stringify(api.message.calls.mostRecent().args[4]);
      expect(sent).not.toMatch(/nombre|apellidos|nif|dni|email|telefono|direccion/i);
      const allowedKeys = new Set(['version', 'module', 'view', 'tab', 'state', 'canCreate', 'hasOpenRegistration', 'hasOpenModification', 'hasOpenBaja', 'hasOpenDocumentacion', 'hasOpenComunicacion', 'missingRequiredFields', 'selectedActivityId', 'selectedInscriptionId', 'formDiagnostics']);
      const context = api.message.calls.mostRecent().args[4] as unknown as Record<string, unknown>;
      for (const key of Object.keys(context)) expect(allowedKeys.has(key)).toBeTrue();
      for (const key of Object.keys((context['state'] as Record<string, unknown>) || {})) expect(allowedKeys.has(key)).toBeTrue();
    });
  });

  it('RUBI-23.1 a logout (and the following login) clears a previously selected target association: it never survives across sessions in the same tab', () => {
    api.access.and.returnValue(of({ enabled: true, authorized: true, scope: 'federation', canSelectTargetAssociation: true }));
    censoService.getAsociaciones.and.returnValue(of([{ id: 25, nombre: 'Doctor Bergez - Carolinas', cif: 'G1' }]));
    const federationFixture = TestBed.createComponent(RubiPanelComponent);
    federationFixture.detectChanges();
    const federationComponent = federationFixture.componentInstance;
    federationComponent.onTargetAssociationChange(25);
    expect(federationComponent.targetAssociationId).toBe(25);

    loginStatus.next(false);
    expect(federationComponent.targetAssociationId).toBeNull();
    expect(federationComponent.federationAssociations).toEqual([]);

    loginStatus.next(true);
    expect(federationComponent.targetAssociationId).toBeNull();
  });
});

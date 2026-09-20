import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'ffsj-web-components';
import { Subscription, distinctUntilChanged, skip } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { TranslatePipe } from '../shared/translate.pipe';
import { RubiAction, RubiApiService, RubiInsight, RubiModule, RubiRouteKey, RubiResponse, RubiScreenContext } from './rubi-api.service';
import { RubiAltaComponent } from './rubi-alta.component';
import { RubiModificacionComponent } from './rubi-modificacion.component';
import { RubiBajaComponent } from './rubi-baja.component';
import { RubiRegistroComponent } from './rubi-registro.component';
import { RubiConversationService, RubiMessage } from './rubi-conversation.service';
import { RubiScreenContextService } from './rubi-screen-context.service';
import { CensoService } from '../core/censo.service';
import { Asociacion } from '../core/models';

const ROUTE_KEYS: Array<[string, RubiRouteKey]> = [
  ['/asociados/gestion', 'alta'], ['/asociados', 'personas'], ['/registro', 'registro'],
  ['/inscripciones', 'inscripciones'], ['/soporte', 'soporte'], ['/calendario', 'calendario'],
  ['/solicitudes', 'solicitudes'], ['/', 'home']
];

const SAFE_DESTINATIONS: Record<string, string> = {
  personas: '/asociados', registro: '/registro', inscripciones: '/inscripciones',
  soporte: '/soporte', calendario: '/calendario', solicitudes: '/solicitudes', alta: '/asociados/gestion'
};
const COMUNICACIONES_BANDEJAS = new Set(['nuevas', 'recibidas', 'enviadas', 'contestadas']);

@Component({
  selector: 'app-rubi-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, RubiAltaComponent, RubiModificacionComponent, RubiBajaComponent, RubiRegistroComponent],
  templateUrl: './rubi-panel.component.html',
  styleUrls: ['./rubi-panel.component.scss']
})
export class RubiPanelComponent implements OnInit, OnDestroy {
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('launcher') private launcher?: ElementRef<HTMLButtonElement>;
  @ViewChild('altaFlow') private altaFlow?: RubiAltaComponent;
  @ViewChild('modificacionFlow') private modificacionFlow?: RubiModificacionComponent;
  @ViewChild('bajaFlow') private bajaFlow?: RubiBajaComponent;
  @ViewChild('registroFlow') private registroFlow?: RubiRegistroComponent;

  open = false;
  loading = false;
  unavailable = false;
  draft = '';
  messages: RubiMessage[] = [];
  altaActive = false;
  altaPrepared = false;
  modificationActive = false;
  modificationPrepared = false;
  bajaActive = false;
  bajaPrepared = false;
  registroActive = false;
  registroTipo: 'documentacion' | 'comunicacion' = 'documentacion';
  registroPrepared = false;
  accessGranted = false;
  canSelectTargetAssociation = false;
  targetAssociationId: number | null = null;
  federationAssociations: Asociacion[] = [];
  federationAssociationsLoading = false;
  insights: RubiInsight[] = [];
  insightsLoading = false;
  readonly welcomeSuggestions = ['rubi.quick.alta', 'rubi.quick.registro', 'rubi.quick.calendario', 'rubi.quick.help'];
  readonly quickActions = ['rubi.quick.alta', 'rubi.quick.documents', 'rubi.quick.inscriptions', 'rubi.quick.support'];
  private opener: HTMLElement | null = null;
  private sessionOpened = false;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly api: RubiApiService,
    private readonly conversation: RubiConversationService,
    readonly i18n: I18nService,
    private readonly router: Router,
    private readonly screenContext: RubiScreenContextService,
    private readonly censoService: CensoService,
    private readonly auth: AuthService
  ) {
    this.subscriptions.add(this.conversation.messagesChanges.subscribe(messages => this.messages = messages));
    // RUBI-23.1: el panel persiste montado entre sesiones (ver `@defer` en
    // app.component.html), asi que un target/asociaciones cargados por un
    // actor no deben sobrevivir a un logout/login posterior en la misma
    // pestana. `skip(1)` ignora el valor inicial: el bootstrap de acceso ya
    // lo gestiona ngOnInit.
    this.subscriptions.add(this.auth.loginStatusObservable.pipe(distinctUntilChanged(), skip(1)).subscribe(() => {
      this.targetAssociationId = null;
      this.federationAssociations = [];
    }));
    this.subscriptions.add(this.conversation.clearedChanges.subscribe(() => {
      this.altaActive = false;
      this.altaPrepared = false;
      this.modificationActive = false;
      this.modificationPrepared = false;
      this.bajaActive = false;
      this.bajaPrepared = false;
      this.registroActive = false;
      this.registroPrepared = false;
      this.sessionOpened = false;
      this.api.resetSession();
    }));
  }

  ngOnInit(): void {
    this.api.access().subscribe({
      next: access => {
        this.accessGranted = access.enabled && access.authorized;
        this.canSelectTargetAssociation = access.canSelectTargetAssociation;
      },
      error: () => {
        this.accessGranted = false;
        this.canSelectTargetAssociation = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  // F (post-auditoria 1.8.1#RUBI): salida siempre visible y accesible desde
  // fuera del propio formulario. Reutiliza el cancel() publico del workflow
  // activo, que ya invalida la preparacion en backend si existia
  // (discardPrepared) antes de limpiar el estado del panel via el evento
  // `closed` -> onXClosed(). Nunca deja un token de confirmacion vivo.
  cancelActiveWorkflow(): void {
    if (this.altaActive) this.altaFlow?.cancel();
    else if (this.modificationActive) this.modificacionFlow?.cancel();
    else if (this.bajaActive) this.bajaFlow?.cancel();
    else if (this.registroActive) this.registroFlow?.cancel();
  }

  show(): void {
    if (!this.accessGranted) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.open = true;
    if (!this.sessionOpened) {
      this.sessionOpened = true;
      this.api.startSession();
      this.api.trackEvent({ event: 'session_opened', stage: 'conversation' }).subscribe({ error: () => {} });
    }
    if (this.canSelectTargetAssociation) {
      if (!this.federationAssociations.length && !this.federationAssociationsLoading) this.loadFederationAssociations();
    } else if (this.targetAssociationId !== null) {
      this.targetAssociationId = null;
    }
    this.addWelcomeIfNeeded();
    this.loadInsights();
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  private loadFederationAssociations(): void {
    this.federationAssociationsLoading = true;
    this.censoService.getAsociaciones().subscribe({
      next: asociaciones => { this.federationAssociations = asociaciones; this.federationAssociationsLoading = false; },
      error: () => { this.federationAssociationsLoading = false; }
    });
  }

  // RUBI-21: nunca bloquea el panel si falla; es una mejora, no una
  // dependencia critica (Fase 23). No usa el chat ni el provider.
  private loadInsights(): void {
    this.insightsLoading = true;
    this.api.getSuggestions(this.targetAssociationId).subscribe({
      next: response => { this.insights = response.insights.filter(item => this.isSafeAction(item.action)); this.insightsLoading = false; },
      error: () => { this.insights = []; this.insightsLoading = false; }
    });
  }

  insightLabel(insight: RubiInsight): string {
    const params = { count: insight.count ?? 0, days: insight.daysRemaining ?? 0, title: insight.title ?? '' };
    if (insight.domain === 'actividades') {
      const key = insight.daysRemaining === 0 ? 'rubi.insight.actividades.hoy' : insight.daysRemaining === 1 ? 'rubi.insight.actividades.manana' : 'rubi.insight.actividades.dias';
      return this.i18n.t(key, params);
    }
    if (insight.domain === 'comunicaciones') {
      return this.i18n.t((insight.count ?? 0) === 1 ? 'rubi.insight.comunicaciones.una' : 'rubi.insight.comunicaciones.varias', params);
    }
    if (insight.id === 'admin-solicitudes-pendientes') return this.i18n.t('rubi.insight.solicitudes.admin', params);
    if (insight.id === 'autorizaciones-alta') return this.i18n.t('rubi.insight.solicitudes.autorizaciones', params);
    return this.i18n.t('rubi.insight.solicitudes.incidencia', params);
  }

  openInsight(insight: RubiInsight): void {
    // executeAction ya emite su propio evento de telemetria segun el tipo de
    // accion (navegacion o flujo estructurado); no se duplica aqui.
    this.executeAction(insight.action);
  }

  // Cambiar de asociacion objetivo limpia la conversacion: ningun referente de la
  // asociacion anterior (actividad, inscripcion, comunicacion) debe sobrevivir al
  // cambio de contexto (RUBI-20, aislamiento A/B). Las sugerencias tambien se
  // recalculan por completo, nunca se conservan las de la asociacion anterior.
  onTargetAssociationChange(value: number | null): void {
    const id = Number(value);
    this.targetAssociationId = Number.isInteger(id) && id > 0 ? id : null;
    this.conversation.clear();
    this.insights = [];
    this.addWelcomeIfNeeded();
    this.loadInsights();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    setTimeout(() => (this.opener || this.launcher?.nativeElement)?.focus());
  }

  minimize(): void {
    this.close();
  }

  get isInitialState(): boolean {
    return this.messages.length === 1 && this.messages[0]?.author === 'rubi';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  send(message = this.draft): void {
    const trimmed = message.trim();
    if (!trimmed || this.loading || this.unavailable) return;

    this.loading = true;
    const history = this.conversation.recentHistory();
    this.conversation.add({ author: 'user', text: trimmed });
    const routeKey = this.currentRouteKey();
    this.api.message(trimmed, this.i18n.language, routeKey, history, this.currentScreenContext(routeKey), this.targetAssociationId).subscribe({
      next: response => this.handleResponse(response),
      error: error => this.handleError(error)
    });
  }

  sendQuickAction(key: string): void {
    this.send(this.i18n.t(key));
  }

  onMessageKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    this.send();
  }

  executeAction(action: RubiAction): void {
    if (action.type === 'start_flow' && action.flow === 'inscripcion' && action.inscriptionId) {
      this.api.trackEvent({ event: 'flow_started', stage: 'inscripcion' }).subscribe({ error: () => {} });
      this.router.navigate(['/inscripciones', action.inscriptionId]).then(() => this.close());
      return;
    }
    if (action.type === 'start_flow' && action.flow === 'alta') {
      this.conversation.excludeLastUserFromHistory();
      this.altaActive = true;
      this.altaPrepared = false;
      this.api.trackEvent({ event: 'flow_started', stage: 'alta' }).subscribe({ error: () => {} });
      return;
    }
    if (action.type === 'start_flow' && action.flow === 'modificacion') {
      this.conversation.excludeLastUserFromHistory();
      this.modificationActive = true;
      this.modificationPrepared = false;
      this.api.trackEvent({ event: 'flow_started', stage: 'modificacion' }).subscribe({ error: () => {} });
      return;
    }
    if (action.type === 'start_flow' && action.flow === 'baja') {
      this.conversation.excludeLastUserFromHistory();
      this.bajaActive = true;
      this.bajaPrepared = false;
      this.api.trackEvent({ event: 'flow_started', stage: 'baja' }).subscribe({ error: () => {} });
      return;
    }
    if (action.type === 'start_flow' && (action.flow === 'documentacion' || action.flow === 'comunicacion')) {
      this.conversation.excludeLastUserFromHistory();
      this.registroTipo = action.flow;
      this.registroActive = true;
      this.registroPrepared = false;
      this.api.trackEvent({ event: 'flow_started', stage: action.flow }).subscribe({ error: () => {} });
      return;
    }
    if (action.type === 'start_flow' && action.flow === 'soporte') {
      this.api.trackEvent({ event: 'flow_started', stage: 'soporte' }).subscribe({ error: () => {} });
      this.router.navigateByUrl(SAFE_DESTINATIONS.soporte).then(() => this.close());
      return;
    }
    if (action.type === 'start_flow' && action.flow === 'comunicaciones') {
      this.api.trackEvent({ event: 'flow_started', stage: 'comunicaciones' }).subscribe({ error: () => {} });
      const queryParams = action.bandeja && COMUNICACIONES_BANDEJAS.has(action.bandeja) ? { bandeja: action.bandeja } : {};
      this.router.navigate(['/registro/comunicacion'], { queryParams }).then(() => this.close());
      return;
    }
    if (action.type !== 'navigate') return;
    const destination = action.destination;
    const route = SAFE_DESTINATIONS[destination];
    if (!route) return;
    this.api.trackEvent({ event: 'navigation', stage: 'conversation', destination }).subscribe({ error: () => {} });
    this.router.navigateByUrl(route).then(() => this.close());
  }

  actionLabel(action: RubiAction): string {
    if (action.type === 'start_flow' && action.flow === 'inscripcion' && action.label) return action.label;
    return this.i18n.t(`rubi.action.${action.destination || (action.type === 'start_flow' ? action.flow : '')}`);
  }

  onAltaClosed(reason: 'cancelled' | 'expired'): void {
    this.altaActive = false;
    this.altaPrepared = false;
    this.api.trackEvent({ event: 'flow_cancelled', stage: 'alta' }).subscribe({ error: () => {} });
    this.conversation.add({
      author: 'rubi',
      text: this.i18n.t(reason === 'expired' ? 'rubi.alta.expired' : 'rubi.alta.cancelled')
    });
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  openNormalAltaFlow(): void {
    this.altaActive = false;
    this.altaPrepared = false;
    this.router.navigateByUrl(SAFE_DESTINATIONS.alta).then(() => this.close());
  }

  onAltaPreparationStateChanged(prepared: boolean): void {
    this.altaPrepared = prepared;
  }

  onModificationClosed(reason: 'cancelled' | 'expired'): void {
    this.modificationActive = false;
    this.modificationPrepared = false;
    this.api.trackEvent({ event: 'flow_cancelled', stage: 'modificacion' }).subscribe({ error: () => {} });
    this.conversation.add({ author: 'rubi', text: this.i18n.t(reason === 'expired' ? 'rubi.mod.expired' : 'rubi.mod.cancelled') });
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  openNormalModificationFlow(): void {
    this.modificationActive = false;
    this.modificationPrepared = false;
    this.router.navigateByUrl('/asociados/gestion?tab=modificaciones').then(() => this.close());
  }

  onModificationPreparationStateChanged(prepared: boolean): void { this.modificationPrepared = prepared; }

  onBajaClosed(reason: 'cancelled' | 'expired'): void {
    this.bajaActive = false;
    this.bajaPrepared = false;
    this.api.trackEvent({ event: 'flow_cancelled', stage: 'baja' }).subscribe({ error: () => {} });
    this.conversation.add({ author: 'rubi', text: this.i18n.t(reason === 'expired' ? 'rubi.baja.expired' : 'rubi.baja.cancelled') });
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  openNormalBajaFlow(): void {
    this.bajaActive = false;
    this.bajaPrepared = false;
    this.router.navigateByUrl('/asociados/gestion?tab=bajas').then(() => this.close());
  }

  onBajaPreparationStateChanged(prepared: boolean): void { this.bajaPrepared = prepared; }

  onRegistroClosed(reason: 'cancelled' | 'expired'): void {
    this.registroActive = false;
    this.registroPrepared = false;
    this.api.trackEvent({ event: 'flow_cancelled', stage: this.registroTipo }).subscribe({ error: () => {} });
    const key = this.registroTipo === 'documentacion'
      ? (reason === 'expired' ? 'rubi.registro.doc.expired' : 'rubi.registro.doc.cancelled')
      : (reason === 'expired' ? 'rubi.registro.comm.expired' : 'rubi.registro.comm.cancelled');
    this.conversation.add({ author: 'rubi', text: this.i18n.t(key) });
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  openNormalRegistroFlow(): void {
    this.registroActive = false;
    this.registroPrepared = false;
    this.router.navigateByUrl(`/registro/${this.registroTipo}`).then(() => this.close());
  }

  onRegistroPreparationStateChanged(prepared: boolean): void { this.registroPrepared = prepared; }

  sendFeedback(message: RubiMessage, rating: 'helpful' | 'not_helpful'): void {
    if (message.feedbackPending || message.feedback) return;
    this.conversation.setFeedback(message.id, undefined, true);
    this.api.feedback(rating, {
      ...(message.intent ? { intent: message.intent } : {}), ...(message.tool ? { tool: message.tool } : {})
    }).subscribe({
      next: () => this.conversation.setFeedback(message.id, rating),
      error: () => this.conversation.setFeedback(message.id, undefined)
    });
  }

  private handleResponse(response: RubiResponse): void {
    this.loading = false;
    if (!this.isValidResponse(response)) {
      this.conversation.add({ author: 'system', text: this.i18n.t('rubi.error.invalid') });
      return;
    }
    this.draft = '';
    const sensitiveFlows = new Set(['alta', 'modificacion', 'baja', 'documentacion', 'comunicacion']);
    if (response.conversation?.sensitiveFlow && sensitiveFlows.has(response.conversation.sensitiveFlow)) this.conversation.excludeLastUserFromHistory();
    this.conversation.add({
      author: 'rubi', text: response.message, intent: response.intent,
      actions: response.actions.filter(action => this.isSafeAction(action)), tool: response.tool?.name,
      destination: response.conversation?.destination,
      topic: response.conversation?.topic,
      module: response.conversation?.module,
      activityId: response.conversation?.activityId,
      inscriptionId: response.conversation?.inscriptionId
    });
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  private handleError(error: unknown): void {
    this.loading = false;
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    const code = error instanceof HttpErrorResponse ? (error.error?.errors?.[0]?.code || error.error?.code) : undefined;
    if (code === 'RUBI_DISABLED' || code === 'RUBI_ADMIN_DISABLED') this.unavailable = true;
    if (code === 'RUBI_PILOT_ACCESS_DENIED' || code === 'RUBI_ASOCIACION_NO_AUTORIZADA') {
      this.accessGranted = false;
      this.close();
    }
    const key = status === 401 || status === 403 ? 'rubi.error.auth'
      : status === 429 ? 'rubi.error.limit'
      : code === 'RUBI_DISABLED' ? 'rubi.error.disabled'
      : status >= 500 ? 'rubi.error.unavailable'
      : status === 0 ? 'rubi.error.timeout'
      : 'rubi.error.invalid';
    this.conversation.add({ author: 'system', text: this.i18n.t(key) });
  }

  private addWelcomeIfNeeded(): void {
    if (!this.messages.length) this.conversation.add({ author: 'rubi', text: this.i18n.t('rubi.welcome') });
  }

  private currentRouteKey(): RubiRouteKey | undefined {
    const path = this.router.url.split(/[?#]/, 1)[0];
    return ROUTE_KEYS.find(([prefix]) => prefix === '/' ? path === '/' : path.startsWith(prefix))?.[1];
  }

  private currentScreenContext(routeKey?: RubiRouteKey): RubiScreenContext | undefined {
    if (!routeKey) return undefined;
    const moduleByRoute: Record<RubiRouteKey, RubiModule> = {
      home: 'home', personas: 'asociados', alta: 'asociados', registro: 'registro',
      inscripciones: 'inscripciones', soporte: 'soporte', calendario: 'calendario', solicitudes: 'solicitudes'
    };
    const module = moduleByRoute[routeKey];
    const current = this.screenContext.current;
    const workflowState = this.altaActive ? { hasOpenRegistration: this.altaPrepared }
      : this.modificationActive ? { hasOpenModification: this.modificationPrepared }
      : this.bajaActive ? { hasOpenBaja: this.bajaPrepared }
      : this.registroActive && this.registroTipo === 'documentacion' ? { hasOpenDocumentacion: this.registroPrepared }
      : this.registroActive && this.registroTipo === 'comunicacion' ? { hasOpenComunicacion: this.registroPrepared } : undefined;
    // G (form-diagnostics): solo el flujo Rubi realmente activo aporta su
    // diagnostico. En cuanto el usuario cambia de flujo o lo cierra, el
    // ViewChild correspondiente deja de estar activo y el diagnostico
    // anterior no puede filtrarse al siguiente turno.
    const workflowDiagnostics = this.altaActive ? this.altaFlow?.formDiagnostics()
      : this.modificationActive ? this.modificacionFlow?.formDiagnostics()
      : this.bajaActive ? this.bajaFlow?.formDiagnostics()
      : this.registroActive ? this.registroFlow?.formDiagnostics()
      : undefined;
    const state = (workflowState || workflowDiagnostics?.present)
      ? { ...(workflowState || {}), ...(workflowDiagnostics?.present ? { formDiagnostics: workflowDiagnostics } : {}) }
      : undefined;
    const path = this.router.url.split(/[?#]/, 1)[0];
    const inscriptionMatch = routeKey === 'inscripciones' ? path.match(/^\/inscripciones\/([A-Za-z0-9._:-]{1,128})$/) : null;
    const routeState = inscriptionMatch ? { selectedInscriptionId: inscriptionMatch[1] } : undefined;
    if (current?.module === module) return { ...current, ...((state || routeState) ? { state: { ...(current.state || {}), ...(routeState || {}), ...(state || {}) } } : {}) };
    return { version: 1, module, view: routeKey === 'alta' ? 'gestion' : routeKey === 'home' ? 'inicio' : routeKey,
      ...((state || routeState) ? { state: { ...(routeState || {}), ...(state || {}) } } : {}) };
  }

  private isValidResponse(response: RubiResponse): boolean {
    return !!response && typeof response.message === 'string' && Array.isArray(response.actions) && !!response.metadata;
  }

  private isSafeAction(action: RubiAction): boolean {
    return (action.type === 'navigate' && typeof action.destination === 'string' && !!SAFE_DESTINATIONS[action.destination])
      || (action.type === 'start_flow' && (action.flow === 'alta' || action.flow === 'modificacion' || action.flow === 'baja'
        || action.flow === 'documentacion' || action.flow === 'comunicacion' || action.flow === 'soporte'
        || (action.flow === 'comunicaciones' && (action.bandeja === undefined || COMUNICACIONES_BANDEJAS.has(action.bandeja)))
        || (action.flow === 'inscripcion' && typeof action.inscriptionId === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(action.inscriptionId))));
  }
}

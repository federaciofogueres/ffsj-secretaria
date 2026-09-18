import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { TranslatePipe } from '../shared/translate.pipe';
import { RubiAction, RubiApiService, RubiModule, RubiRouteKey, RubiResponse, RubiScreenContext } from './rubi-api.service';
import { RubiAltaComponent } from './rubi-alta.component';
import { RubiModificacionComponent } from './rubi-modificacion.component';
import { RubiBajaComponent } from './rubi-baja.component';
import { RubiRegistroComponent } from './rubi-registro.component';
import { RubiConversationService, RubiMessage } from './rubi-conversation.service';
import { RubiScreenContextService } from './rubi-screen-context.service';

const ROUTE_KEYS: Array<[string, RubiRouteKey]> = [
  ['/asociados/gestion', 'alta'], ['/asociados', 'personas'], ['/registro', 'registro'],
  ['/inscripciones', 'inscripciones'], ['/soporte', 'soporte'], ['/calendario', 'calendario'],
  ['/solicitudes', 'solicitudes'], ['/', 'home']
];

const SAFE_DESTINATIONS: Record<string, string> = {
  personas: '/asociados', registro: '/registro', inscripciones: '/inscripciones',
  soporte: '/soporte', calendario: '/calendario', solicitudes: '/solicitudes', alta: '/asociados/gestion'
};

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
    private readonly screenContext: RubiScreenContextService
  ) {
    this.subscriptions.add(this.conversation.messagesChanges.subscribe(messages => this.messages = messages));
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
      next: access => this.accessGranted = access.enabled && access.authorized,
      error: () => this.accessGranted = false
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggle(): void {
    this.open ? this.close() : this.show();
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
    this.addWelcomeIfNeeded();
    setTimeout(() => this.messageInput?.nativeElement.focus());
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
    this.api.message(trimmed, this.i18n.language, routeKey, history, this.currentScreenContext(routeKey)).subscribe({
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
    const state = this.altaActive ? { hasOpenRegistration: this.altaPrepared }
      : this.modificationActive ? { hasOpenModification: this.modificationPrepared }
      : this.bajaActive ? { hasOpenBaja: this.bajaPrepared }
      : this.registroActive && this.registroTipo === 'documentacion' ? { hasOpenDocumentacion: this.registroPrepared }
      : this.registroActive && this.registroTipo === 'comunicacion' ? { hasOpenComunicacion: this.registroPrepared } : undefined;
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
        || action.flow === 'documentacion' || action.flow === 'comunicacion'
        || (action.flow === 'inscripcion' && typeof action.inscriptionId === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(action.inscriptionId))));
  }
}

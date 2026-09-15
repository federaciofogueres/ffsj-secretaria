import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { I18nService } from '../core/i18n.service';
import { TranslatePipe } from '../shared/translate.pipe';
import { RubiAction, RubiApiService, RubiRouteKey, RubiResponse } from './rubi-api.service';
import { RubiConversationService, RubiMessage } from './rubi-conversation.service';

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
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './rubi-panel.component.html',
  styleUrls: ['./rubi-panel.component.scss']
})
export class RubiPanelComponent implements OnDestroy {
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('launcher') private launcher?: ElementRef<HTMLButtonElement>;

  open = false;
  loading = false;
  unavailable = false;
  draft = '';
  messages: RubiMessage[] = [];
  private opener: HTMLElement | null = null;
  private readonly subscription: Subscription;

  constructor(
    private readonly api: RubiApiService,
    private readonly conversation: RubiConversationService,
    readonly i18n: I18nService,
    private readonly router: Router
  ) {
    this.subscription = this.conversation.messagesChanges.subscribe(messages => this.messages = messages);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  show(): void {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.open = true;
    this.addWelcomeIfNeeded();
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    setTimeout(() => (this.opener || this.launcher?.nativeElement)?.focus());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  send(message = this.draft): void {
    const trimmed = message.trim();
    if (!trimmed || this.loading || this.unavailable) return;

    this.loading = true;
    this.conversation.add({ author: 'user', text: trimmed });
    this.api.message(trimmed, this.i18n.language, this.currentRouteKey()).subscribe({
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
    const route = action.type === 'start_flow' && action.flow === 'alta'
      ? SAFE_DESTINATIONS.alta
      : action.type === 'navigate' ? SAFE_DESTINATIONS[action.destination] : undefined;
    if (!route) return;
    this.router.navigateByUrl(route).then(() => this.close());
  }

  private handleResponse(response: RubiResponse): void {
    this.loading = false;
    if (!this.isValidResponse(response)) {
      this.conversation.add({ author: 'system', text: this.i18n.t('rubi.error.invalid') });
      return;
    }
    this.draft = '';
    this.conversation.add({
      author: 'rubi', text: response.message, intent: response.intent,
      actions: response.actions.filter(action => this.isSafeAction(action))
    });
    setTimeout(() => this.messageInput?.nativeElement.focus());
  }

  private handleError(error: unknown): void {
    this.loading = false;
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    const code = error instanceof HttpErrorResponse ? error.error?.errors?.[0]?.code : undefined;
    if (code === 'RUBI_DISABLED') this.unavailable = true;
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

  private isValidResponse(response: RubiResponse): boolean {
    return !!response && typeof response.message === 'string' && Array.isArray(response.actions) && !!response.metadata;
  }

  private isSafeAction(action: RubiAction): boolean {
    return (action.type === 'navigate' && typeof action.destination === 'string' && !!SAFE_DESTINATIONS[action.destination])
      || (action.type === 'start_flow' && action.flow === 'alta');
  }
}

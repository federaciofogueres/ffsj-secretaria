import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RubiAction, RubiHistoryEntry, RubiModule } from './rubi-api.service';

export interface RubiMessage {
  id: number;
  author: 'user' | 'rubi' | 'system';
  text: string;
  intent?: string | null;
  actions?: RubiAction[];
  tool?: string;
  topic?: string;
  module?: RubiModule;
}

@Injectable({ providedIn: 'root' })
export class RubiConversationService {
  private readonly messagesSubject = new BehaviorSubject<RubiMessage[]>([]);
  readonly messagesChanges = this.messagesSubject.asObservable();
  private nextId = 1;
  private expiresAt = 0;
  private readonly ttlMs = 30 * 60 * 1000;

  get messages(): RubiMessage[] {
    if (this.expiresAt && Date.now() >= this.expiresAt) this.clear();
    return this.messagesSubject.value;
  }

  add(message: Omit<RubiMessage, 'id'>): void {
    this.messagesSubject.next([...this.messages, { ...message, id: this.nextId++ }]);
    this.expiresAt = Date.now() + this.ttlMs;
  }

  recentHistory(maxTurns = 6): RubiHistoryEntry[] {
    return this.messages
      .filter(message => message.author === 'user' || (message.author === 'rubi' && (!!message.intent || !!message.tool)))
      .slice(-maxTurns)
      .map(message => ({
        role: message.author === 'user' ? 'user' : 'assistant', text: message.text,
        ...(message.intent ? { intent: message.intent } : {}), ...(message.tool ? { tool: message.tool } : {}),
        ...(message.actions?.[0]?.destination ? { destination: message.actions[0].destination } : {}),
        ...(message.topic ? { topic: message.topic } : {}), ...(message.module ? { module: message.module } : {})
      }));
  }

  clear(): void {
    this.nextId = 1;
    this.expiresAt = 0;
    this.messagesSubject.next([]);
  }
}

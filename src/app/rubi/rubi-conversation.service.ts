import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

import { RubiAction, RubiHistoryEntry, RubiModule } from './rubi-api.service';

export interface RubiMessage {
  id: number;
  author: 'user' | 'rubi' | 'system';
  text: string;
  intent?: string | null;
  actions?: RubiAction[];
  tool?: string;
  destination?: string;
  topic?: string;
  module?: RubiModule;
  activityId?: string;
  inscriptionId?: string;
  excludeFromHistory?: boolean;
  feedback?: 'helpful' | 'not_helpful';
  feedbackPending?: boolean;
  // 1.9.0#RUBI (Pilot Instrumentation, 5.3): tras pulsar 👎 se muestra el
  // selector de motivo (catalogo cerrado) antes de enviar el feedback.
  feedbackReasonPending?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RubiConversationService {
  private readonly messagesSubject = new BehaviorSubject<RubiMessage[]>([]);
  readonly messagesChanges = this.messagesSubject.asObservable();
  private readonly clearedSubject = new Subject<void>();
  readonly clearedChanges = this.clearedSubject.asObservable();
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
      .filter(message => !message.excludeFromHistory && (message.author === 'user' || (message.author === 'rubi' && (!!message.intent || !!message.tool))))
      .slice(-maxTurns)
      .map(message => ({
        role: message.author === 'user' ? 'user' : 'assistant', text: message.text,
        ...(message.intent ? { intent: message.intent } : {}), ...(message.tool ? { tool: message.tool } : {}),
        ...(message.destination || message.actions?.[0]?.destination ? { destination: message.destination || message.actions?.[0]?.destination } : {}),
        ...(message.topic ? { topic: message.topic } : {}), ...(message.module ? { module: message.module } : {}),
        ...(message.activityId ? { activityId: message.activityId } : {}), ...(message.inscriptionId ? { inscriptionId: message.inscriptionId } : {})
      }));
  }

  clear(): void {
    this.nextId = 1;
    this.expiresAt = 0;
    this.messagesSubject.next([]);
    this.clearedSubject.next();
  }

  excludeLastUserFromHistory(): void {
    const messages = [...this.messages];
    for (let index = messages.length - 1; index >= 0; index--) {
      if (messages[index].author === 'user') {
        messages[index] = { ...messages[index], excludeFromHistory: true };
        this.messagesSubject.next(messages);
        return;
      }
    }
  }

  setFeedback(id: number, feedback: 'helpful' | 'not_helpful' | undefined, pending = false): void {
    this.messagesSubject.next(this.messages.map(message => message.id === id ? { ...message, feedback, feedbackPending: pending, feedbackReasonPending: false } : message));
  }

  setFeedbackReasonPending(id: number, pending: boolean): void {
    this.messagesSubject.next(this.messages.map(message => message.id === id ? { ...message, feedbackReasonPending: pending } : message));
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RubiAction } from './rubi-api.service';

export interface RubiMessage {
  id: number;
  author: 'user' | 'rubi' | 'system';
  text: string;
  intent?: string | null;
  actions?: RubiAction[];
}

@Injectable({ providedIn: 'root' })
export class RubiConversationService {
  private readonly messagesSubject = new BehaviorSubject<RubiMessage[]>([]);
  readonly messagesChanges = this.messagesSubject.asObservable();
  private nextId = 1;

  get messages(): RubiMessage[] {
    return this.messagesSubject.value;
  }

  add(message: Omit<RubiMessage, 'id'>): void {
    this.messagesSubject.next([...this.messages, { ...message, id: this.nextId++ }]);
  }

  clear(): void {
    this.nextId = 1;
    this.messagesSubject.next([]);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RubiScreenContext } from './rubi-api.service';

@Injectable({ providedIn: 'root' })
export class RubiScreenContextService {
  private readonly contextSubject = new BehaviorSubject<RubiScreenContext | null>(null);
  readonly contextChanges = this.contextSubject.asObservable();

  get current(): RubiScreenContext | null { return this.contextSubject.value; }
  set(context: RubiScreenContext): void { this.contextSubject.next(context); }
  clear(module?: RubiScreenContext['module']): void {
    if (!module || this.current?.module === module) this.contextSubject.next(null);
  }
}

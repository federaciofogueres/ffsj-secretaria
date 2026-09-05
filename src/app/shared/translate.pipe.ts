import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { I18nService } from '../core/i18n.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;
  constructor(private readonly i18n: I18nService, cdr: ChangeDetectorRef) { this.subscription = i18n.languageChanges.subscribe(() => cdr.markForCheck()); }
  transform(key: string): string { return this.i18n.t(key); }
  ngOnDestroy(): void { this.subscription.unsubscribe(); }
}

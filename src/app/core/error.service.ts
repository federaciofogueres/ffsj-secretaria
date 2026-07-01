import { Injectable } from '@angular/core';
import { FfsjAlertService } from 'ffsj-web-components';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  constructor(private readonly alertService: FfsjAlertService) {}

  show(message: string): void {
    this.alertService.danger(message, 6000);
  }
}

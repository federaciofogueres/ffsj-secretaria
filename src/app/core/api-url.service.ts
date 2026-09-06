import { Injectable } from '@angular/core';

import { RuntimeConfigService } from './runtime-config.service';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  constructor(private readonly runtimeConfig: RuntimeConfigService) {}

  get censoBasePath(): string { return this.runtimeConfig.censoBasePath; }
  get secretariaBasePath(): string { return this.runtimeConfig.secretariaBasePath; }
  get filesBasePath(): string { return this.runtimeConfig.filesBasePath; }
}

import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

type RuntimeConfig = {
  censoApiBasePath?: string;
  secretariaApiBasePath?: string;
  filesBasePath?: string;
};

function configuredUrl(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().replace(/\/$/, '') : fallback;
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: RuntimeConfig = {};

  async load(): Promise<void> {
    try {
      const response = await fetch('assets/runtime-config.json', { cache: 'no-store' });
      if (response.ok) {
        this.config = await response.json() as RuntimeConfig;
      }
    } catch {
      // En desarrollo local o ante un fallo temporal se usan los valores compilados.
      this.config = {};
    }

    Object.assign(globalThis, { __FFSJ_CENSO_API_BASE_PATH__: this.censoBasePath });
  }

  get censoBasePath(): string {
    return configuredUrl(this.config.censoApiBasePath, environment.CENSO_API_BASE_PATH);
  }

  get secretariaBasePath(): string {
    return configuredUrl(this.config.secretariaApiBasePath, environment.SECRETARIA_API_BASE_PATH);
  }

  get filesBasePath(): string {
    return configuredUrl(this.config.filesBasePath, environment.FILES_BASE_PATH);
  }
}

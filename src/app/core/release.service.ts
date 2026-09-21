import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { APP_VERSION } from './app-version';
import { Release } from './models';
import { SecretariaService } from './secretaria.service';

// 0.39.0#ESMERALDA: fuente de la etiqueta publica de version + novedades,
// leida de la release activa configurada por Webmaster. APP_VERSION
// (derivada de package.json) es el fallback tecnico si no hay release
// publicada o si la carga falla: nunca bloquea la aplicacion ni muestra
// "undefined".
@Injectable({ providedIn: 'root' })
export class ReleaseService {
  private readonly releaseSubject = new BehaviorSubject<Release | null>(null);
  readonly releaseChanges = this.releaseSubject.asObservable();
  private requested = false;

  constructor(private readonly secretaria: SecretariaService) {}

  get versionLabel(): string {
    return this.releaseSubject.value?.version || APP_VERSION;
  }

  get novedades(): string | null {
    return this.releaseSubject.value?.novedades || null;
  }

  get fechaPublicacion(): string | null {
    return this.releaseSubject.value?.fechaPublicacion || null;
  }

  load(): void {
    if (this.requested) return;
    this.requested = true;
    this.secretaria.getReleaseActiva().subscribe({
      next: response => this.releaseSubject.next(response.release),
      error: () => { this.requested = false; }
    });
  }

  clear(): void {
    this.requested = false;
    this.releaseSubject.next(null);
  }
}

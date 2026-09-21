import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FfsjSpinnerComponent } from 'ffsj-web-components';
import { finalize } from 'rxjs';

import { Release } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';
import { MarkdownEditorComponent } from '../shared/markdown-editor.component';
import { MarkdownPipe } from '../shared/markdown.pipe';

@Component({
  selector: 'app-release-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, FfsjSpinnerComponent, MarkdownEditorComponent, MarkdownPipe],
  templateUrl: './release-admin.component.html',
  styleUrls: ['./release-admin.component.scss']
})
export class ReleaseAdminComponent implements OnInit {
  releases: Release[] = [];
  loading = false;
  error = '';

  version = '';
  novedades = '';
  guardando = false;
  activandoId: number | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  constructor(private readonly secretaria: SecretariaService) {}

  get releaseActiva(): Release | undefined {
    return this.releases.find(release => release.activa);
  }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.secretaria.getReleases()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: response => { this.releases = response.releases; },
        error: () => { this.error = 'No se han podido cargar las versiones.'; }
      });
  }

  guardar(publicar: boolean): void {
    if (!this.version.trim() || this.guardando) return;
    this.guardando = true;
    this.error = '';
    this.secretaria.crearRelease({
      version: this.version.trim(),
      novedades: this.novedades.trim() || null,
      publicar
    })
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: response => {
          this.releases = [response.release, ...this.releases.map(release => publicar ? { ...release, activa: false } : release)];
          this.version = '';
          this.novedades = '';
        },
        error: response => { this.error = response?.error?.message || 'No se ha podido guardar la versión.'; }
      });
  }

  activar(release: Release): void {
    if (release.activa || this.activandoId) return;
    this.activandoId = release.id;
    this.error = '';
    this.secretaria.activarRelease(release.id)
      .pipe(finalize(() => this.activandoId = null))
      .subscribe({
        next: activada => {
          this.releases = this.releases.map(item => item.id === activada.release.id ? activada.release : { ...item, activa: false });
        },
        error: response => { this.error = response?.error?.message || 'No se ha podido publicar la versión.'; }
      });
  }
}

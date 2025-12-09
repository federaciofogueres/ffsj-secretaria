import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-module-page',
  standalone: true,
  template: `
    <section class="module-page card border-0 shadow-sm">
      <div class="card-body p-4">
        <p class="overline text-uppercase text-muted fw-bold mb-1">Módulo</p>
        <h1 class="h4 mb-2 text-rojo">{{ moduleName }}</h1>
        <p class="description mb-3">{{ moduleDescription }}</p>
        <div class="alert alert-info mb-0">
          Contenido pendiente de implementación.
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .module-page {
        max-width: 960px;
        margin: 0 auto;
        border-radius: 18px;
      }

      .overline {
        letter-spacing: 0.08em;
      }

      .description {
        color: #405066;
        font-size: 1.05rem;
        line-height: 1.6;
      }
    `
  ]
})
export class ModulePageComponent {
  readonly moduleName = this.route.snapshot.data['moduleName'] as string;
  readonly moduleDescription = this.route.snapshot.data['moduleDescription'] as string;

  constructor(private readonly route: ActivatedRoute) {}
}

import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-module-page',
  standalone: true,
  template: `
    <section class="module-page">
      <header>
        <p class="overline">Módulo</p>
        <h1>{{ moduleName }}</h1>
      </header>
      <p class="description">{{ moduleDescription }}</p>
      <p class="hint">Contenido pendiente de implementación.</p>
    </section>
  `,
  styles: [
    `
      .module-page {
        padding: 2rem;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        max-width: 960px;
        margin: 0 auto;
      }

      header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 0.75rem;
      }

      .overline {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #5c6f82;
        font-weight: 700;
        margin: 0;
      }

      h1 {
        margin: 0;
        font-size: 2rem;
        color: #1b2b3c;
      }

      .description {
        margin: 0 0 1rem;
        color: #405066;
        font-size: 1.05rem;
      }

      .hint {
        margin: 0;
        color: #6d7d90;
        font-style: italic;
      }
    `
  ]
})
export class ModulePageComponent {
  readonly moduleName = this.route.snapshot.data['moduleName'] as string;
  readonly moduleDescription = this.route.snapshot.data['moduleDescription'] as string;

  constructor(private readonly route: ActivatedRoute) {}
}

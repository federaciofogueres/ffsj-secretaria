import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PermissionsService } from '../core/permissions.service';
import { TranslatePipe } from '../shared/translate.pipe';
import {
  RubiAdminAnalytics, RubiAdminAsociacion, RubiAdminBudgetStatus, RubiAdminGlobalConfig,
  RubiAdminProviderStatus, RubiAdminService
} from './rubi-admin.service';

type AsociacionFiltro = 'all' | 'enabled' | 'disabled';

@Component({
  selector: 'app-rubi-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './rubi-admin.component.html',
  styleUrls: ['./rubi-admin.component.scss']
})
export class RubiAdminComponent implements OnInit {
  allowed = false;
  loading = true;
  error = '';
  global: RubiAdminGlobalConfig | null = null;
  provider: RubiAdminProviderStatus | null = null;
  budget: RubiAdminBudgetStatus | null = null;

  asociaciones: RubiAdminAsociacion[] = [];
  asociacionesTotal = 0;
  asociacionesLoading = false;
  asociacionesError = '';
  busqueda = '';
  filtro: AsociacionFiltro = 'all';
  private readonly savingAsociacionIds = new Set<number>();

  analytics: RubiAdminAnalytics | null = null;
  analyticsLoading = false;
  analyticsError = '';
  analyticsDias: 7 | 30 = 7;

  constructor(
    private readonly api: RubiAdminService,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.allowed = this.permissions.hasPermission('admin:rubi');
    if (!this.allowed) { this.loading = false; return; }
    this.load();
    this.loadAsociaciones();
    this.loadAnalytics();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getConfig().subscribe({
      next: response => { this.global = response.global; this.provider = response.provider; this.budget = response.budget; this.loading = false; },
      error: () => { this.error = 'rubi.admin.error.load'; this.loading = false; }
    });
  }

  toggleGlobal(key: keyof RubiAdminGlobalConfig, checked: boolean): void {
    if (!this.global) return;
    const previous = this.global;
    this.global = { ...this.global, [key]: checked };
    this.api.updateConfig({ [key]: checked }).subscribe({
      next: response => { this.global = response.global; },
      error: () => { this.global = previous; this.error = 'rubi.admin.error.save'; }
    });
  }

  loadAsociaciones(): void {
    this.asociacionesLoading = true;
    this.asociacionesError = '';
    this.api.listAssociations({ search: this.busqueda || undefined, filter: this.filtro })
      .pipe(finalize(() => this.asociacionesLoading = false))
      .subscribe({
        next: response => { this.asociaciones = response.items; this.asociacionesTotal = response.total; },
        error: () => { this.asociacionesError = 'rubi.admin.error.associations'; }
      });
  }

  setFiltro(filtro: AsociacionFiltro): void {
    this.filtro = filtro;
    this.loadAsociaciones();
  }

  isSavingAsociacion(id: number): boolean {
    return this.savingAsociacionIds.has(id);
  }

  toggleAsociacion(asociacion: RubiAdminAsociacion, checked: boolean): void {
    const previous = asociacion.enabled;
    asociacion.enabled = checked;
    this.savingAsociacionIds.add(asociacion.id);
    this.api.setAssociationEnabled(asociacion.id, checked)
      .pipe(finalize(() => this.savingAsociacionIds.delete(asociacion.id)))
      .subscribe({
        next: result => { asociacion.enabled = result.enabled; },
        error: () => { asociacion.enabled = previous; this.asociacionesError = 'rubi.admin.error.associationSave'; }
      });
  }

  setAnalyticsDias(dias: 7 | 30): void {
    this.analyticsDias = dias;
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.analyticsLoading = true;
    this.analyticsError = '';
    const to = new Date();
    const from = new Date(to.getTime() - this.analyticsDias * 24 * 60 * 60 * 1000);
    this.api.getAnalytics({ from: from.toISOString(), to: to.toISOString() })
      .pipe(finalize(() => this.analyticsLoading = false))
      .subscribe({
        next: response => { this.analytics = response; },
        error: () => { this.analyticsError = 'rubi.admin.error.analytics'; }
      });
  }
}

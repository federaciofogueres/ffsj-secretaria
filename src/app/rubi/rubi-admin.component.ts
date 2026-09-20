import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PermissionsService } from '../core/permissions.service';
import { TranslatePipe } from '../shared/translate.pipe';
import {
  RubiAdminAnalytics, RubiAdminAsociacion, RubiAdminBudgetStatus, RubiAdminGlobalConfig,
  RubiAdminProviderStatus, RubiAdminService, RubiAdminTool, RubiSuggestion, RubiSuggestionStatus
} from './rubi-admin.service';

type AsociacionFiltro = 'all' | 'authorized' | 'unauthorized';
type SuggestionFiltro = 'abiertas' | RubiSuggestionStatus;

// 1.11.0#RUBI: catalogo cerrado de acciones administrativas (7.7) por
// estado de origen. El componente nunca inventa una transicion: solo
// ofrece las que el backend ya valida como permitidas
// (RubiSuggestionsStore.ALLOWED_TRANSITIONS, reflejadas en
// suggestion.allowedTransitions).
const SUGGESTION_ACTION_LABELS: Record<RubiSuggestionStatus, string> = {
  NUEVA: '', EN_REVISION: 'rubi.admin.suggestions.action.review', ACEPTADA: 'rubi.admin.suggestions.action.accept',
  DESCARTADA: 'rubi.admin.suggestions.action.discard', IMPLEMENTADA: 'rubi.admin.suggestions.action.implement',
  MIDIENDO_RESULTADO: '', CERRADA: 'rubi.admin.suggestions.action.close', RESUELTA_SIN_INTERVENCION: ''
};
const OPEN_SUGGESTION_STATUSES: RubiSuggestionStatus[] = ['NUEVA', 'EN_REVISION', 'ACEPTADA', 'IMPLEMENTADA', 'MIDIENDO_RESULTADO'];

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
  analyticsAsociacionId = '';

  tools: RubiAdminTool[] = [];
  toolsLoading = false;
  toolsError = '';
  private readonly savingToolNames = new Set<string>();

  // 1.11.0#RUBI (Configuracion -> Rubi -> Sugerencias).
  suggestions: RubiSuggestion[] = [];
  suggestionsLoading = false;
  suggestionsError = '';
  suggestionsFiltro: SuggestionFiltro = 'abiertas';
  analyzingSuggestions = false;
  selectedSuggestion: RubiSuggestion | null = null;
  suggestionActionError = '';
  discardReasonDraft = '';
  private readonly savingSuggestionIds = new Set<number>();

  readonly suggestionActionLabels = SUGGESTION_ACTION_LABELS;

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
    this.loadTools();
    this.loadSuggestions();
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
    const previous = asociacion.authorized;
    asociacion.authorized = checked;
    this.savingAsociacionIds.add(asociacion.id);
    this.api.setAssociationAuthorized(asociacion.id, checked)
      .pipe(finalize(() => this.savingAsociacionIds.delete(asociacion.id)))
      .subscribe({
        next: result => { asociacion.authorized = result.authorized; },
        error: () => { asociacion.authorized = previous; this.asociacionesError = 'rubi.admin.error.associationSave'; }
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
    const asociacionId = Number(this.analyticsAsociacionId) > 0 ? Number(this.analyticsAsociacionId) : undefined;
    this.api.getAnalytics({ from: from.toISOString(), to: to.toISOString(), asociacionId })
      .pipe(finalize(() => this.analyticsLoading = false))
      .subscribe({
        next: response => { this.analytics = response; },
        error: () => { this.analyticsError = 'rubi.admin.error.analytics'; }
      });
  }

  loadTools(): void {
    this.toolsLoading = true;
    this.toolsError = '';
    this.api.getTools()
      .pipe(finalize(() => this.toolsLoading = false))
      .subscribe({
        next: response => { this.tools = response.tools; },
        error: () => { this.toolsError = 'rubi.admin.error.tools'; }
      });
  }

  isSavingTool(name: string): boolean {
    return this.savingToolNames.has(name);
  }

  toggleTool(tool: RubiAdminTool, checked: boolean): void {
    if (tool.blockedByInfra) return;
    const previous = tool.blockedByAdmin;
    tool.blockedByAdmin = checked;
    tool.available = !checked && !tool.blockedByInfra;
    this.savingToolNames.add(tool.name);
    this.api.setToolBlocked(tool.name, checked)
      .pipe(finalize(() => this.savingToolNames.delete(tool.name)))
      .subscribe({
        next: () => {},
        error: () => { tool.blockedByAdmin = previous; tool.available = !previous && !tool.blockedByInfra; this.toolsError = 'rubi.admin.error.toolSave'; }
      });
  }

  // 1.11.0#RUBI (Configuracion -> Rubi -> Sugerencias) -------------------

  loadSuggestions(): void {
    this.suggestionsLoading = true;
    this.suggestionsError = '';
    const status = this.suggestionsFiltro === 'abiertas' ? undefined : this.suggestionsFiltro;
    this.api.listSuggestions({ status })
      .pipe(finalize(() => this.suggestionsLoading = false))
      .subscribe({
        next: response => {
          this.suggestions = this.suggestionsFiltro === 'abiertas'
            ? response.sugerencias.filter(item => OPEN_SUGGESTION_STATUSES.includes(item.status))
            : response.sugerencias;
        },
        error: () => { this.suggestionsError = 'rubi.admin.error.suggestions'; }
      });
  }

  setSuggestionsFiltro(filtro: SuggestionFiltro): void {
    this.suggestionsFiltro = filtro;
    this.loadSuggestions();
  }

  // 7.7: ficha completa de una sugerencia (que ha detectado / por que /
  // comparacion / que propone / impacto esperado / acciones).
  selectSuggestion(suggestion: RubiSuggestion): void {
    this.selectedSuggestion = suggestion;
    this.discardReasonDraft = '';
    this.suggestionActionError = '';
  }

  closeSuggestionDetail(): void {
    this.selectedSuggestion = null;
  }

  isSavingSuggestion(id: number): boolean {
    return this.savingSuggestionIds.has(id);
  }

  // Dispara bajo demanda Fase A + Fase B + dedup + caducidad + medicion.
  // Nunca automatico: siempre una accion administrativa explicita.
  runSuggestionAnalysis(): void {
    this.analyzingSuggestions = true;
    this.suggestionsError = '';
    this.api.runSuggestionAnalysis({ days: this.analyticsDias })
      .pipe(finalize(() => this.analyzingSuggestions = false))
      .subscribe({
        next: () => this.loadSuggestions(),
        error: () => { this.suggestionsError = 'rubi.admin.error.suggestionsAnalyze'; }
      });
  }

  // Acciones administrativas (7.7): marcar en revision, aceptar, descartar
  // (exige motivo), marcar implementada, cerrar. Nunca autoaplicadas.
  setSuggestionStatus(suggestion: RubiSuggestion, status: RubiSuggestionStatus, reason?: string): void {
    if (status === 'DESCARTADA' && !reason) return;
    this.suggestionActionError = '';
    this.savingSuggestionIds.add(suggestion.id);
    this.api.setSuggestionStatus(suggestion.id, status, reason)
      .pipe(finalize(() => this.savingSuggestionIds.delete(suggestion.id)))
      .subscribe({
        next: updated => {
          const stillVisible = this.suggestionsFiltro !== 'abiertas' || OPEN_SUGGESTION_STATUSES.includes(updated.status);
          this.suggestions = stillVisible
            ? this.suggestions.map(item => item.id === updated.id ? updated : item)
            : this.suggestions.filter(item => item.id !== updated.id);
          this.selectedSuggestion = stillVisible && this.selectedSuggestion?.id === updated.id ? updated : null;
        },
        error: () => { this.suggestionActionError = 'rubi.admin.error.suggestionAction'; }
      });
  }
}

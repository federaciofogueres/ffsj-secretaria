import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { AdminAccessService } from '../core/admin-access.service';
import { Asociado, HistoricoAsociado } from '../core/models';
import { EjercicioService } from '../core/ejercicio.service';

export { Asociado };
export { HistoricoAsociado };

@Injectable({
  providedIn: 'root'
})
export class AsociadosService {
  private readonly asociados$ = this.ejercicioService.selectedChanges.pipe(
    switchMap(ejercicio =>
      this.censoService
        .getAsociadosByAsociacion(this.censoService.asociacionId)
        .pipe(switchMap(asociados => this.enrichWithCargoActual(asociados, ejercicio?.ejercicio ?? new Date().getFullYear())))
    ),
    shareReplay(1)
  );

  constructor(
    private readonly censoService: CensoService,
    private readonly adminAccess: AdminAccessService,
    private readonly ejercicioService: EjercicioService
  ) {}

  getAdultos(): Observable<Asociado[]> {
    return this.asociados$.pipe(map(asociados => asociados.filter(a => a.tipo === 'adulto')));
  }

  getInfantiles(): Observable<Asociado[]> {
    return this.asociados$.pipe(map(asociados => asociados.filter(a => a.tipo === 'infantil')));
  }

  getTodos(): Observable<Asociado[]> {
    return this.asociados$;
  }

  getHistorico(asociadoId: number): Observable<HistoricoAsociado[]> {
    return this.censoService.getHistoricoByAsociado(asociadoId).pipe(
      map(historico => {
        if (this.adminAccess.isAdmin()) {
          return historico;
        }

        const asociacionId = this.censoService.asociacionId;
        return historico.filter(item => Number(item.idAsociacion) === asociacionId);
      })
    );
  }

  private enrichWithCargoActual(asociados: Asociado[], ejercicio: number): Observable<Asociado[]> {
    if (asociados.length === 0) {
      return of([]);
    }

    return forkJoin(
      asociados.map(asociado =>
        this.getHistorico(asociado.id).pipe(
          map(historico => {
            const relativoAlEjercicio = historico.some(item => Number(item.ejercicio) === Number(ejercicio));
            if (!relativoAlEjercicio) {
              return null;
            }

            return {
              ...asociado,
              cargo: this.getCargoActual(historico, ejercicio) || asociado.cargo,
              estado: this.getEstadoEjercicio(asociado, historico, ejercicio)
            };
          }),
          catchError(() => of(null))
        )
      )
    ).pipe(map(items => items.filter(Boolean) as Asociado[]));
  }

  private getCargoActual(historico: HistoricoAsociado[], ejercicio: number): string {
    const cargos = historico
      .filter(item => Number(item.ejercicio) === Number(ejercicio) && Number(item.active) === 1)
      .map(item => item.cargo)
      .filter(Boolean);

    return Array.from(new Set(cargos)).join(' / ');
  }

  private getEstadoEjercicio(asociado: Asociado, historico: HistoricoAsociado[], ejercicio: number): string {
    const rows = historico.filter(item => Number(item.ejercicio) === Number(ejercicio));
    if (!rows.length) {
      return 'baja';
    }
    return rows.some(item => Number(item.active) === 1) ? asociado.estado || 'activo' : 'baja';
  }
}

import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { AdminAccessService } from '../core/admin-access.service';
import { Asociado, HistoricoAsociado } from '../core/models';

export { Asociado };
export { HistoricoAsociado };

@Injectable({
  providedIn: 'root'
})
export class AsociadosService {
  private readonly asociados$ = this.censoService
    .getAsociadosByAsociacion(this.censoService.asociacionId)
    .pipe(switchMap(asociados => this.enrichWithCargoActual(asociados)))
    .pipe(shareReplay(1));

  constructor(
    private readonly censoService: CensoService,
    private readonly adminAccess: AdminAccessService
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

  private enrichWithCargoActual(asociados: Asociado[]): Observable<Asociado[]> {
    if (asociados.length === 0) {
      return of([]);
    }

    return forkJoin(
      asociados.map(asociado =>
        this.getHistorico(asociado.id).pipe(
          map(historico => ({
            ...asociado,
            cargo: this.getCargoActual(historico) || asociado.cargo
          })),
          catchError(() => of(asociado))
        )
      )
    );
  }

  private getCargoActual(historico: HistoricoAsociado[]): string {
    const currentYear = new Date().getFullYear();
    const cargos = historico
      .filter(item => Number(item.ejercicio) === currentYear)
      .map(item => item.cargo)
      .filter(Boolean);

    return Array.from(new Set(cargos)).join(' / ');
  }
}

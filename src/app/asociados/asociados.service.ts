import { Injectable } from '@angular/core';
import { Observable, map, shareReplay, switchMap } from 'rxjs';

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
        .getAsociadosByAsociacion(this.censoService.asociacionId, ejercicio?.ejercicio)
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

}

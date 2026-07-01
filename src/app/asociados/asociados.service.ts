import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { Asociado } from '../core/models';

export { Asociado };

@Injectable({
  providedIn: 'root'
})
export class AsociadosService {
  private readonly asociados$ = this.censoService
    .getAsociadosByAsociacion(this.censoService.asociacionId)
    .pipe(shareReplay(1));

  constructor(private readonly censoService: CensoService) {}

  getAdultos(): Observable<Asociado[]> {
    return this.asociados$.pipe(map(asociados => asociados.filter(a => a.tipo === 'adulto')));
  }

  getInfantiles(): Observable<Asociado[]> {
    return this.asociados$.pipe(map(asociados => asociados.filter(a => a.tipo === 'infantil')));
  }

  getTodos(): Observable<Asociado[]> {
    return this.asociados$;
  }
}

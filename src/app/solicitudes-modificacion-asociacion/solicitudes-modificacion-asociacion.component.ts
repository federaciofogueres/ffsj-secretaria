import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';

import { SolicitudModificacionAsociacion } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';
import { CensoService } from '../core/censo.service';

@Component({
  selector: 'app-solicitudes-modificacion-asociacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitudes-modificacion-asociacion.component.html',
  styleUrls: ['./solicitudes-modificacion-asociacion.component.scss']
})
export class SolicitudesModificacionAsociacionComponent implements OnInit {
  solicitudes: SolicitudModificacionAsociacion[] = [];
  seleccionada: SolicitudModificacionAsociacion | null = null;
  loading = false;
  resolving = false;
  error = '';
  asociacionNombres: Record<number, string> = {};

  constructor(private readonly secretariaService: SecretariaService, private readonly censoService: CensoService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.getSolicitudesModificacionAsociacionAdmin().subscribe({
      next: response => {
        this.solicitudes = response.solicitudes;
        const ids = [...new Set(response.solicitudes.map(item => item.asociacionId))];
        if (!ids.length) { this.loading = false; return; }
        forkJoin(ids.map(id => this.censoService.getAsociacion(id).pipe(
          map(asociacion => ({ id, nombre: asociacion.nombre || asociacion.name || `Asociación #${id}` })),
          catchError(() => of({ id, nombre: `Asociación #${id}` }))
        ))).subscribe(nombres => {
          this.asociacionNombres = nombres.reduce<Record<number, string>>((result, item) => ({ ...result, [item.id]: item.nombre }), {});
          this.loading = false;
        });
      },
      error: error => { this.error = error?.error?.message || 'No se han podido cargar las solicitudes.'; this.loading = false; }
    });
  }

  seleccionar(solicitud: SolicitudModificacionAsociacion): void { this.seleccionada = solicitud; }

  resolver(decision: 'aprobada' | 'rechazada'): void {
    if (!this.seleccionada || this.resolving) return;
    this.resolving = true;
    this.error = '';
    this.secretariaService.resolverSolicitudModificacionAsociacion(this.seleccionada.id, decision).subscribe({
      next: actualizada => {
        this.solicitudes = this.solicitudes.filter(item => item.id !== actualizada.id);
        this.seleccionada = actualizada;
        this.resolving = false;
      },
      error: error => { this.error = error?.error?.message || 'No se ha podido resolver la solicitud.'; this.resolving = false; }
    });
  }

  cambios(): Array<{ campo: string; actual: string; propuesto: string }> {
    const solicitud = this.seleccionada;
    if (!solicitud) return [];
    const keys = new Set([...Object.keys(solicitud.datosActuales), ...Object.keys(solicitud.datosPropuestos)]);
    return [...keys]
      .filter(key => this.valor(solicitud.datosActuales[key]) !== this.valor(solicitud.datosPropuestos[key]))
      .map(campo => ({ campo, actual: this.valor(solicitud.datosActuales[campo]), propuesto: this.valor(solicitud.datosPropuestos[campo]) }));
  }

  private valor(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';

import { SolicitudItemSecretaria, SolicitudSecretaria } from '../core/models';
import { CensoService } from '../core/censo.service';
import { SecretariaService } from '../core/secretaria.service';
import { IncidenciasPanelComponent } from '../shared/incidencias-panel.component';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, IncidenciasPanelComponent],
  templateUrl: './solicitudes.component.html',
  styleUrls: ['./solicitudes.component.scss']
})
export class SolicitudesComponent implements OnInit {
  readonly estados = [
    { value: 'todos', label: 'Todos' },
    { value: 'registrada', label: 'Registrada' },
    { value: 'pendiente_firma', label: 'Pendiente de firma' },
    { value: 'enviada', label: 'Enviada' },
    { value: 'en_revision', label: 'En revision' },
    { value: 'con_incidencias', label: 'Con incidencias' },
    { value: 'validada', label: 'Validada' },
    { value: 'rechazada', label: 'Rechazada' },
    { value: 'finalizada', label: 'Finalizada' },
    { value: 'cancelada', label: 'Cancelada' }
  ];
  readonly tipos = [
    { value: 'todos', label: 'Todos' },
    { value: 'alta', label: 'Alta' },
    { value: 'cambio', label: 'Cambio' },
    { value: 'baja', label: 'Baja' }
  ];

  solicitudes: SolicitudSecretaria[] = [];
  detalle: SolicitudSecretaria | null = null;
  loading = false;
  error = '';
  filtroTexto = '';
  filtroEstado = 'todos';
  filtroTipo = 'todos';
  asociacionNombres: Record<number, string> = {};
  incidenciasAbiertasBySolicitud: Record<number, number> = {};
  detalleDialogOpen = false;

  constructor(
    private readonly secretariaService: SecretariaService,
    private readonly censoService: CensoService
  ) {}

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.loading = true;
    this.error = '';
    this.secretariaService.getSolicitudesGlobal().subscribe({
      next: response => {
        this.solicitudes = response.solicitudes;
        if (this.detalle && !this.solicitudes.some(item => item.id === this.detalle?.id)) {
          this.detalle = null;
        }
        this.cargarNombresAsociacion();
        this.cargarContadoresIncidencias();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se han podido cargar las solicitudes.';
        this.loading = false;
      }
    });
  }

  verSolicitud(solicitud: SolicitudSecretaria): void {
    this.loading = true;
    this.secretariaService.getSolicitud(solicitud.id).subscribe({
      next: detalle => {
        this.detalle = detalle;
        this.detalleDialogOpen = true;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido cargar la solicitud.';
        this.loading = false;
      }
    });
  }

  cerrarDetalle(): void {
    this.detalleDialogOpen = false;
  }

  validar(): void {
    if (!this.detalle) return;
    this.cambiarEstado(() => this.secretariaService.validarSolicitud(this.detalle!.id));
  }

  rechazar(): void {
    if (!this.detalle) return;
    this.cambiarEstado(() => this.secretariaService.rechazarSolicitud(this.detalle!.id));
  }

  finalizar(): void {
    if (!this.detalle) return;
    this.cambiarEstado(() => this.secretariaService.finalizarSolicitud(this.detalle!.id));
  }

  cancelarEnvio(): void {
    if (!this.detalle) return;
    this.cambiarEstado(() => this.secretariaService.cancelarEnvioSolicitud(this.detalle!.id));
  }

  puedeValidar(): boolean {
    return !!this.detalle &&
      ['enviada', 'en_revision', 'con_incidencias'].includes(this.detalle.estado) &&
      !this.tieneIncidenciasAbiertas(this.detalle.id);
  }

  puedeCancelarEnvio(): boolean {
    return !!this.detalle && ['enviada', 'en_revision', 'con_incidencias'].includes(this.detalle.estado);
  }

  puedeFinalizar(): boolean {
    return !!this.detalle && ['validada', 'rechazada'].includes(this.detalle.estado);
  }

  tieneAccionesDisponibles(): boolean {
    return this.puedeValidar() || this.puedeCancelarEnvio() || this.puedeFinalizar();
  }

  labelTipo(tipo: string): string {
    return tipo === 'alta' ? 'Alta' : tipo === 'cambio' ? 'Cambio' : 'Baja';
  }

  labelEstado(estado: string): string {
    if (estado === 'pendiente_firma') {
      return 'Pendiente de firma';
    }
    return this.estados.find(item => item.value === estado)?.label ?? estado;
  }

  estadoClass(estado: string): string {
    return `estado-${estado.replace('_', '-')}`;
  }

  labelEstadoSolicitud(solicitud: SolicitudSecretaria): string {
    return this.labelEstado(this.estadoVisibleSolicitud(solicitud));
  }

  estadoClassSolicitud(solicitud: SolicitudSecretaria): string {
    return this.estadoClass(this.estadoVisibleSolicitud(solicitud));
  }

  estadoTooltipSolicitud(solicitud: SolicitudSecretaria): string | null {
    const nombres = this.autorizacionesPendientesNombres(solicitud);
    return nombres.length ? `Pendiente de firma por ${nombres.join(', ')}` : null;
  }

  tipoClass(tipo: string): string {
    return `tipo-${tipo}`;
  }

  get solicitudesFiltradas(): SolicitudSecretaria[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    return this.solicitudes.filter(solicitud => {
      const matchesTipo = this.filtroTipo === 'todos' || solicitud.tipo === this.filtroTipo;
      const estadoVisible = this.estadoVisibleSolicitud(solicitud);
      const matchesEstado = this.filtroEstado === 'todos' || solicitud.estado === this.filtroEstado || estadoVisible === this.filtroEstado;
      const searchable = [
        solicitud.numero,
        solicitud.asociacionId,
        this.asociacionLabel(solicitud.asociacionId),
        this.labelTipo(solicitud.tipo),
        this.labelEstado(estadoVisible)
      ]
        .join(' ')
        .toLowerCase();
      return matchesTipo && matchesEstado && (!texto || searchable.includes(texto));
    });
  }

  totalEstado(...estados: string[]): number {
    return this.solicitudes.filter(solicitud => estados.includes(solicitud.estado)).length;
  }

  totalTipo(tipo: string): number {
    return this.solicitudes.filter(solicitud => solicitud.tipo === tipo).length;
  }

  tieneIncidenciasAbiertas(solicitudId: number): boolean {
    return (this.incidenciasAbiertasBySolicitud[solicitudId] || 0) > 0;
  }

  generarJustificante(): void {
    if (!this.detalle) return;
    this.loading = true;
    this.secretariaService.descargarJustificantePdf('solicitud', this.detalle.id).subscribe({
      next: ({ justificante, blob }) => {
        this.downloadBlob(blob, justificante.fileName || `solicitud-${this.detalle?.id}.pdf`);
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido generar el justificante.';
        this.loading = false;
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  asociacionLabel(asociacionId: number): string {
    return this.asociacionNombres[asociacionId] || `Asociacion ${asociacionId}`;
  }

  resumenItem(item: { datos: Record<string, any> }): string {
    const datos = item.datos || {};
    return [datos.nombre, datos.apellidos].filter(Boolean).join(' ') || `Asociado ${datos.asociadoId ?? ''}`.trim();
  }

  tipoItem(item: SolicitudItemSecretaria): string {
    return item.tipo || (item.datos?.['tipoCambio'] === 'cargo' ? 'cambio' : this.detalle?.tipo || '');
  }

  labelTipoItem(item: SolicitudItemSecretaria): string {
    const tipo = this.tipoItem(item);
    if (tipo === 'cambio' && item.datos?.['tipoCambio'] === 'cargo') {
      return 'Cambio de cargo';
    }
    return this.labelTipo(tipo);
  }

  labelEstadoItem(item: SolicitudItemSecretaria): string {
    return item.estado === 'validado' ? 'Aplicado en censo' : 'Pendiente de aplicar';
  }

  estadoItemClass(item: SolicitudItemSecretaria): string {
    return item.estado === 'validado' ? 'estado-validada' : 'estado-registrada';
  }

  private estadoVisibleSolicitud(solicitud: SolicitudSecretaria): string {
    return this.autorizacionesPendientesNombres(solicitud).length > 0 ? 'pendiente_firma' : solicitud.estado;
  }

  private autorizacionesPendientesNombres(solicitud: SolicitudSecretaria): string[] {
    const detalle = solicitud.autorizacionesAlta
      ?.filter(item => item.estado === 'pendiente_firma')
      .map(item => item.asociacionAnteriorNombre || `Asociacion ${item.asociacionAnteriorId}`)
      .filter(Boolean) || [];
    if (detalle.length) {
      return [...new Set(detalle)];
    }
    const resumen = String(solicitud.autorizacionesPendientesNombres || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    return solicitud.autorizacionesPendientes && solicitud.autorizacionesPendientes > 0
      ? resumen.length ? resumen : ['asociacion anterior']
      : [];
  }

  identifierItem(item: { datos: Record<string, any> }): string {
    const datos = item.datos || {};
    return datos.dni || datos.nif || datos.sip || '-';
  }

  cambiosItem(item: { datos: Record<string, any>; datosOriginales?: Record<string, any> | null }): string[] {
    const datos = item.datos || {};
    if (datos['tipoCambio'] === 'cargo') {
      return [
        `Cargo: ${datos['cargoNombre'] || datos['cargoId'] || '-'}`,
        `Ejercicio: ${datos['ejercicio'] || '-'}`,
        `Sustituye a: ${datos['sustituyeANombre'] || datos['sustituyeAId'] || '-'}`
      ];
    }
    const sustituciones = Array.isArray(datos['sustitucionesCargo'])
      ? datos['sustitucionesCargo'].map((sustitucion: any) =>
          `Cambio de cargo asociado: ${sustitucion.cargoNombre || '-'} -> ${sustitucion.sustitutoNombre || '-'}`
        )
      : [];
    const originales = item.datosOriginales || {};
    const cambios = Object.keys(datos)
      .filter(key => !['asociadoId', 'sustitucionesCargo'].includes(key) && String(datos[key] ?? '') !== String(originales[key] ?? ''))
      .slice(0, 5);
    return [...cambios, ...sustituciones];
  }

  private cambiarEstado(action: () => any): void {
    this.loading = true;
    action().subscribe({
      next: (updated: SolicitudSecretaria) => {
        this.detalle = updated;
        this.solicitudes = this.solicitudes.map(item => (item.id === updated.id ? updated : item));
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido cambiar el estado de la solicitud.';
        this.loading = false;
      }
    });
  }

  private cargarNombresAsociacion(): void {
    const ids = [...new Set(this.solicitudes.map(solicitud => solicitud.asociacionId).filter(Boolean))];
    const pendingIds = ids.filter(id => !this.asociacionNombres[id]);
    if (!pendingIds.length) {
      return;
    }

    forkJoin(
      pendingIds.map(id =>
        this.censoService.getAsociacion(id).pipe(
          map(asociacion => ({
            id,
            nombre: asociacion.nombre || asociacion.name || `Asociacion ${id}`
          })),
          catchError(() => of({ id, nombre: `Asociacion ${id}` }))
        )
      )
    ).subscribe(results => {
      this.asociacionNombres = {
        ...this.asociacionNombres,
        ...results.reduce<Record<number, string>>((acc, item) => {
          acc[item.id] = item.nombre;
          return acc;
        }, {})
      };
    });
  }

  private cargarContadoresIncidencias(): void {
    if (!this.solicitudes.length) {
      this.incidenciasAbiertasBySolicitud = {};
      return;
    }
    forkJoin(
      this.solicitudes.map(solicitud =>
        this.secretariaService.getIncidencias('solicitud', String(solicitud.id)).pipe(
          map(response => ({
            id: solicitud.id,
            abiertas: response.incidencias.filter(item => ['abierta', 'respondida'].includes(item.estado)).length
          })),
          catchError(() => of({ id: solicitud.id, abiertas: 0 }))
        )
      )
    ).subscribe(results => {
      this.incidenciasAbiertasBySolicitud = results.reduce<Record<number, number>>((acc, item) => {
        acc[item.id] = item.abiertas;
        return acc;
      }, {});
    });
  }
}

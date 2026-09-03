import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';

import { AdjuntoSecretaria, AutorizacionAlta, SolicitudEventoSecretaria, SolicitudItemSecretaria, SolicitudSecretaria } from '../core/models';
import { CensoService } from '../core/censo.service';
import { SecretariaService } from '../core/secretaria.service';
import { IncidenciasPanelComponent } from '../shared/incidencias-panel.component';

type PestanaDetalleSolicitud = 'resumen' | 'cambios' | 'incidencias' | 'adjuntos' | 'historial';

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
    { value: 'autorizacion_rechazada', label: 'Autorizacion rechazada' },
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
  success = '';
  filtroTexto = '';
  filtroEstado = 'todos';
  filtroTipo = 'todos';
  orden: 'fecha_desc' | 'fecha_asc' | 'estado' = 'fecha_desc';
  soloProblematicas = false;
  paginaActual = 1;
  tamanoPagina = 20;
  totalSolicitudes = 0;
  totalPaginas = 1;
  asociacionNombres: Record<number, string> = {};
  incidenciasAbiertasBySolicitud: Record<number, number> = {};
  detalleDialogOpen = false;
  pestanaDetalle: PestanaDetalleSolicitud = 'resumen';
  readonly pestanasDetalle: Array<{ id: PestanaDetalleSolicitud; label: string }> = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'cambios', label: 'Cambios' },
    { id: 'incidencias', label: 'Incidencias' },
    { id: 'adjuntos', label: 'Adjuntos' },
    { id: 'historial', label: 'Historial' }
  ];

  constructor(
    private readonly secretariaService: SecretariaService,
    private readonly censoService: CensoService
  ) {}

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(resetPage = false): void {
    if (resetPage) this.paginaActual = 1;
    this.loading = true;
    this.error = '';
    this.secretariaService.getSolicitudesGlobal({
      page: this.paginaActual,
      pageSize: this.tamanoPagina,
      tipo: this.filtroTipo === 'todos' ? undefined : this.filtroTipo,
      estado: this.filtroEstado === 'todos' ? undefined : this.filtroEstado,
      busqueda: this.filtroTexto.trim() || undefined,
      orden: this.orden,
      soloProblematicas: this.soloProblematicas
    }).subscribe({
      next: response => {
        this.solicitudes = response.solicitudes;
        this.paginaActual = response.paginacion?.page ?? this.paginaActual;
        this.tamanoPagina = response.paginacion?.pageSize ?? this.tamanoPagina;
        this.totalSolicitudes = response.paginacion?.total ?? response.solicitudes.length;
        this.totalPaginas = response.paginacion?.totalPages ?? 1;
        if (this.detalle && !this.solicitudes.some(item => item.id === this.detalle?.id)) {
          this.detalle = null;
        }
        this.cargarNombresAsociacion();
        this.cargarContadoresIncidencias();
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error?.error?.message || 'No se han podido cargar las solicitudes.';
        this.loading = false;
      }
    });
  }

  verSolicitud(solicitud: SolicitudSecretaria): void {
    this.loading = true;
    this.secretariaService.getSolicitud(solicitud.id).subscribe({
      next: detalle => {
        this.detalle = detalle;
        this.pestanaDetalle = 'resumen';
        this.detalleDialogOpen = true;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error?.error?.message || 'No se ha podido cargar la solicitud.';
        this.loading = false;
      }
    });
  }

  cerrarDetalle(): void {
    this.detalleDialogOpen = false;
  }

  activarPestanaDetalle(pestana: PestanaDetalleSolicitud): void {
    this.pestanaDetalle = pestana;
  }

  navegarPestanasDetalle(event: KeyboardEvent, indiceActual: number): void {
    let siguiente = indiceActual;
    if (event.key === 'ArrowRight') siguiente = (indiceActual + 1) % this.pestanasDetalle.length;
    else if (event.key === 'ArrowLeft') siguiente = (indiceActual - 1 + this.pestanasDetalle.length) % this.pestanasDetalle.length;
    else if (event.key === 'Home') siguiente = 0;
    else if (event.key === 'End') siguiente = this.pestanasDetalle.length - 1;
    else return;

    event.preventDefault();
    const pestana = this.pestanasDetalle[siguiente];
    this.activarPestanaDetalle(pestana.id);
    setTimeout(() => document.getElementById(`solicitud-tab-${pestana.id}`)?.focus());
  }

  validar(): void {
    if (!this.detalle) return;
    const numero = this.detalle.numero;
    this.cambiarEstado(
      () => this.secretariaService.validarSolicitud(this.detalle!.id),
      `Solicitud ${numero} validada correctamente. Los cambios se han aplicado en el censo.`,
      true
    );
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
    return !!this.detalle && ['enviada', 'en_revision', 'con_incidencias'].includes(this.detalle.estado);
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
    if (estado === 'autorizacion_rechazada') {
      return 'Autorizacion rechazada';
    }
    return this.estados.find(item => item.value === estado)?.label ?? estado;
  }

  estadoClass(estado: string): string {
    return `estado-${estado.replace('_', '-')}`;
  }

  autorizacionesAltaRegistradas(solicitud: SolicitudSecretaria): AutorizacionAlta[] {
    return solicitud.autorizacionesAlta || [];
  }

  labelEstadoAutorizacion(estado: AutorizacionAlta['estado']): string {
    const labels: Record<AutorizacionAlta['estado'], string> = {
      pendiente_firma: 'Pendiente de firma',
      firmada: 'Autorizada',
      archivada: 'Autorizada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada'
    };
    return labels[estado] || estado;
  }

  estadoAutorizacionClass(estado: AutorizacionAlta['estado']): string {
    return estado === 'firmada' || estado === 'archivada'
      ? 'estado-validada'
      : this.estadoClass(estado);
  }

  firmaAutorizacion(autorizacion: AutorizacionAlta): { firmante?: string | null; observaciones?: string | null; fecha?: string | null } | null {
    return (autorizacion.documento?.['firma'] as { firmante?: string | null; observaciones?: string | null; fecha?: string | null } | undefined) || null;
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
    return this.solicitudes.filter(solicitud => !this.soloProblematicas || this.esProblematica(solicitud));
  }

  aplicarFiltros(): void {
    this.cargarSolicitudes(true);
  }

  cambiarPagina(delta: number): void {
    const pagina = this.paginaActual + delta;
    if (pagina < 1 || pagina > this.totalPaginas || this.loading) return;
    this.paginaActual = pagina;
    this.cargarSolicitudes();
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

  esProblematica(solicitud: SolicitudSecretaria): boolean {
    return this.tieneIncidenciasAbiertas(solicitud.id)
      || this.autorizacionesPendientesNombres(solicitud).length > 0
      || ['con_incidencias', 'autorizacion_rechazada'].includes(solicitud.estado);
  }

  generarJustificante(): void {
    if (!this.detalle) return;
    this.loading = true;
    this.secretariaService.descargarJustificantePdf('solicitud', this.detalle.id).subscribe({
      next: ({ justificante, blob }) => {
        this.downloadBlob(blob, justificante.fileName || `solicitud-${this.detalle?.id}.pdf`);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error?.error?.message || 'No se ha podido generar el justificante.';
        this.loading = false;
      }
    });
  }

  adjuntosSolicitud(solicitud: SolicitudSecretaria): AdjuntoSecretaria[] {
    return solicitud.adjuntos || [];
  }

  descargarAdjunto(adjunto: AdjuntoSecretaria): void {
    this.secretariaService.descargarAdjunto(adjunto.id).subscribe({
      next: blob => this.downloadBlob(blob, adjunto.originalName || `adjunto-${adjunto.id}`),
      error: (error: HttpErrorResponse) => {
        this.error = error?.error?.message || 'No se ha podido descargar la solicitud firmada.';
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

  resumenItem(item: { datos: Record<string, any>; datosOriginales?: Record<string, any> | null }): string {
    const datos = item.datos || {};
    const originales = item.datosOriginales || {};
    return [datos.nombre || originales.nombre, datos.apellidos || originales.apellidos].filter(Boolean).join(' ')
      || `Asociado ${datos.asociadoId || originales.id || ''}`.trim();
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

  labelEvento(evento: SolicitudEventoSecretaria): string {
    if (evento.tipo === 'CREADA') return 'Solicitud registrada';
    if (evento.tipo === 'APLICADA_EN_CENSO') return 'Cambios aplicados en Censo';
    if (evento.tipo === 'ESTADO') return `Estado: ${this.labelEstado(evento.estadoAnterior || '—')} → ${this.labelEstado(evento.estadoNuevo || '—')}`;
    return evento.tipo;
  }

  diferenciasItem(item: SolicitudItemSecretaria): Array<{ campo: string; anterior: string; nuevo: string }> {
    if (item.datos?.['tipoCambio'] === 'cargo') {
      return this.detallesCambioCargo(item).map(detalle => ({ campo: detalle.campo, anterior: '—', nuevo: detalle.valor }));
    }
    const actual = item.datos || {};
    const anterior = item.datosOriginales || {};
    return Object.keys({ ...anterior, ...actual })
      .filter(campo => !this.camposInternosDiferencia().includes(campo))
      .filter(campo => String(actual[campo] ?? '') !== String(anterior[campo] ?? ''))
      .map(campo => ({ campo: this.labelCampo(campo), anterior: this.valorVisible(anterior[campo]), nuevo: this.valorVisible(actual[campo]) }));
  }

  tieneDiferencias(item: SolicitudItemSecretaria): boolean {
    return this.diferenciasItem(item).length > 0 || ['alta', 'baja'].includes(this.tipoItem(item));
  }

  efectoItem(item: SolicitudItemSecretaria): string {
    const tipo = this.tipoItem(item);
    if (tipo === 'alta') return 'Alta propuesta';
    if (tipo === 'baja') return 'Baja propuesta';
    return item.datos?.['tipoCambio'] === 'cargo' ? 'Cambio de cargo propuesto' : 'Actualización de datos propuesta';
  }

  private estadoVisibleSolicitud(solicitud: SolicitudSecretaria): string {
    return ['finalizada', 'rechazada', 'cancelada', 'validada', 'autorizacion_rechazada'].includes(solicitud.estado)
      ? solicitud.estado
      : this.autorizacionesPendientesNombres(solicitud).length > 0 ? 'pendiente_firma' : solicitud.estado;
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

  identifierItem(item: { datos: Record<string, any>; datosOriginales?: Record<string, any> | null }): string {
    const datos = item.datos || {};
    const originales = item.datosOriginales || {};
    return datos.dni || datos.nif || datos.sip || originales.dni || originales.nif || originales.sip || '-';
  }

  cambiosItem(item: { datos: Record<string, any>; datosOriginales?: Record<string, any> | null }): string[] {
    const datos = item.datos || {};
    if (datos['tipoCambio'] === 'cargo') {
      return this.detallesCambioCargo(item).map(detalle => `${detalle.campo}: ${detalle.valor}`);
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

  private detallesCambioCargo(item: { datos: Record<string, any> }): Array<{ campo: string; valor: string }> {
    const datos = item.datos || {};
    const detalles = [
      { campo: 'Cargo', valor: this.valorVisible(datos['cargoNombres']?.join?.(', ') || datos['cargoNombre'] || datos['cargo'] || datos['cargoId']) },
      { campo: 'Ejercicio', valor: this.valorVisible(datos['ejercicio'] || this.detalle?.ejercicio) }
    ];
    const sustituto = datos['sustituyeANombre'] || datos['sustituyeAId'];
    const cedidoA = datos['cedeCargoANombre'] || datos['cedeCargoAId'];
    if (sustituto) {
      detalles.push({ campo: 'Sustituye a', valor: this.valorVisible(sustituto) });
    } else if (cedidoA) {
      detalles.push({ campo: 'Cede a', valor: this.valorVisible(cedidoA) });
    }
    return detalles;
  }

  private cambiarEstado(action: () => any, successMessage = '', closeDialog = false): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    action().subscribe({
      next: (updated: SolicitudSecretaria) => {
        this.detalle = updated;
        this.solicitudes = this.solicitudes.map(item => (item.id === updated.id ? updated : item));
        if (successMessage) {
          this.success = successMessage;
        }
        if (closeDialog) {
          this.detalleDialogOpen = false;
        }
        this.cargarSolicitudes();
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.success = '';
        this.error = error?.error?.message || 'No se ha podido cambiar el estado de la solicitud.';
        this.loading = false;
      }
    });
  }

  private valorVisible(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    return Array.isArray(valor) ? valor.join(', ') : String(valor);
  }

  private camposInternosDiferencia(): string[] {
    return [
      'asociadoId', 'asociadoExistenteId', 'tipoCambio', 'tipoHoguera', 'tramiteOrigen',
      'cargoId', 'cargoIds', 'cargoNombre', 'cargoNombres', 'sustitucionesCargo',
      'cesionesCargo', 'requiereAutorizacionAsociacionAnterior', 'asociacionesAnteriores'
    ];
  }

  private labelCampo(campo: string): string {
    const labels: Record<string, string> = {
      dni: 'DNI/NIE', nif: 'DNI/NIE', sip: 'SIP', nombre: 'Nombre', apellidos: 'Apellidos',
      nacimiento: 'Fecha de nacimiento', fechaNacimiento: 'Fecha de nacimiento',
      direccion: 'Dirección', cp: 'Código postal', codigoPostal: 'Código postal',
      localidad: 'Localidad', provincia: 'Provincia', telefono: 'Teléfono', email: 'Correo electrónico',
      tipo: 'Tipo de asociado'
    };
    return labels[campo] || campo;
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

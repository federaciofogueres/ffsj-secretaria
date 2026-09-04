import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';

import { AdjuntoSecretaria, PaginacionSecretaria, SoporteCategoria, SoporteEstado, SoporteIncidencia } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';
import { AdjuntosSelectorComponent } from '../shared/adjuntos-selector.component';

type OrdenSoporte = 'actualizacion_desc' | 'actualizacion_asc' | 'creacion_desc' | 'creacion_asc' | 'estado';

@Component({ selector: 'app-soporte-admin', standalone: true, imports: [CommonModule, FormsModule, AdjuntosSelectorComponent], templateUrl: './soporte-admin.component.html', styleUrls: ['./soporte.component.scss'] })
export class SoporteAdminComponent implements OnInit {
  categorias: SoporteCategoria[] = []; estados: SoporteEstado[] = []; incidencias: SoporteIncidencia[] = []; detalle: SoporteIncidencia | null = null;
  estado = ''; categoria = ''; orden: OrdenSoporte = 'actualizacion_desc'; paginaActual = 1; tamanoPagina = 20;
  paginacion: PaginacionSecretaria = { page: 1, pageSize: 20, total: 0, totalPages: 1 };
  loading = true; saving = false; error = ''; success = ''; mensaje = ''; estadoInicial = ''; mostrarContexto = false; adjuntos: File[] = [];
  readonly maxAdjuntoBytes = 10 * 1024 * 1024;
  constructor(private readonly secretaria: SecretariaService) {}
  ngOnInit(): void { this.secretaria.getSoporteCategorias().subscribe({ next: r => { this.categorias = r.categorias; this.estados = r.estados; this.load(); }, error: () => this.fail('No se ha podido cargar la configuracion de soporte.') }); }
  load(resetPage = false): void {
    if (resetPage) this.paginaActual = 1;
    this.loading = true; this.error = '';
    this.secretaria.getAdminSoporteIncidencias({ estado: this.estado || undefined, categoria: this.categoria || undefined, page: this.paginaActual, pageSize: this.tamanoPagina, orden: this.orden }).subscribe({
      next: r => { this.incidencias = r.incidencias; this.paginacion = r.paginacion || { page: this.paginaActual, pageSize: this.tamanoPagina, total: r.incidencias.length, totalPages: 1 }; this.paginaActual = this.paginacion.page; this.tamanoPagina = this.paginacion.pageSize; this.loading = false; },
      error: () => this.fail('No se han podido cargar las incidencias.')
    });
  }
  aplicarFiltros(): void { this.load(true); }
  cambiarPagina(delta: number): void { const page = this.paginaActual + delta; if (!this.loading && page >= 1 && page <= this.paginacion.totalPages) { this.paginaActual = page; this.load(); } }
  verDetalle(id: number): void { this.error = ''; this.secretaria.getAdminSoporteIncidencia(id).subscribe({ next: r => { this.detalle = r.incidencia; this.estadoInicial = r.incidencia.estado; this.mensaje = ''; this.adjuntos = []; this.mostrarContexto = false; }, error: () => this.error = 'No se ha podido cargar el detalle.' }); }
  responder(): void {
    if (!this.detalle || !this.mensaje.trim() || this.saving) return;
    this.saving = true; const id = this.detalle.id;
    this.secretaria.responderAdminSoporteIncidencia(id, { mensaje: this.mensaje.trim() }).pipe(switchMap(r => { const event = r.incidencia.eventos?.at(-1); return event && this.adjuntos.length ? forkJoin(this.adjuntos.map(file => this.secretaria.subirAdjuntoSoporte(id, event.id, file, true))).pipe(switchMap(() => this.secretaria.getAdminSoporteIncidencia(id))) : of(r); })).subscribe({ next: r => { this.apply(r.incidencia); this.mensaje = ''; this.adjuntos = []; this.success = 'Respuesta enviada correctamente.'; }, error: e => { this.saving = false; this.error = e.error?.message || 'No se ha podido enviar la respuesta.'; } });
  }
  guardarEstado(): void { if (!this.detalle || this.saving || this.detalle.estado === this.estadoInicial) return; this.saving = true; this.secretaria.actualizarAdminSoporteIncidencia(this.detalle.id, { estado: this.detalle.estado as SoporteEstado }).subscribe({ next: r => { this.apply(r.incidencia); this.success = 'Estado actualizado correctamente.'; }, error: e => { this.saving = false; this.error = e.error?.message || 'No se ha podido actualizar el estado.'; } }); }
  seleccionarAdjuntos(event: Event): void { const files = Array.from((event.target as HTMLInputElement).files || []); if (files.some(file => file.size > this.maxAdjuntoBytes) || this.adjuntos.length + files.length > 5) { this.error = 'Maximo 5 archivos de 10 MB por respuesta.'; return; } this.adjuntos = [...this.adjuntos, ...files]; }
  quitarAdjunto(index: number): void { this.adjuntos = this.adjuntos.filter((_, current) => current !== index); }
  cerrarDetalle(): void { this.detalle = null; }
  abrirAdjunto(a: AdjuntoSecretaria): void { this.secretaria.descargarAdjuntoSoporte(a.id).subscribe({ next: blob => { const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); }, error: () => this.error = 'No se ha podido abrir el adjunto.' }); }
  estadoLabel(e: string): string { return ({ ABIERTA: 'Abierta', EN_PROCESO: 'En proceso', ESPERANDO_RESPUESTA_USUARIO: 'Esperando respuesta', RESUELTA: 'Resuelta', CERRADA: 'Cerrada' } as Record<string, string>)[e] || e; }
  private apply(i: SoporteIncidencia): void { this.detalle = i; this.estadoInicial = i.estado; this.incidencias = this.incidencias.map(item => item.id === i.id ? { ...item, ...i } : item); this.saving = false; }
  private fail(message: string): void { this.loading = false; this.error = message; }
}

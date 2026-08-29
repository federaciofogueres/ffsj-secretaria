import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SoporteCategoria, SoporteEstado, SoporteIncidencia } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';

@Component({ selector: 'app-soporte-admin', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './soporte-admin.component.html', styleUrls: ['./soporte.component.scss'] })
export class SoporteAdminComponent implements OnInit {
  categorias: SoporteCategoria[] = []; estados: SoporteEstado[] = []; incidencias: SoporteIncidencia[] = []; detalle: SoporteIncidencia | null = null;
  estado = ''; categoria = ''; loading = true; saving = false; error = ''; mensaje = '';
  constructor(private readonly secretaria: SecretariaService) {}
  ngOnInit(): void { this.secretaria.getSoporteCategorias().subscribe({ next: response => { this.categorias = response.categorias; this.estados = response.estados; this.load(); }, error: () => this.fail('No se ha podido cargar la configuración de soporte.') }); }
  load(): void { this.loading = true; this.secretaria.getAdminSoporteIncidencias({ estado: this.estado, categoria: this.categoria }).subscribe({ next: response => { this.incidencias = response.incidencias; this.loading = false; }, error: () => this.fail('No se han podido cargar las incidencias.') }); }
  verDetalle(id: number): void { this.secretaria.getAdminSoporteIncidencia(id).subscribe({ next: response => { this.detalle = response.incidencia; this.mensaje = ''; }, error: () => this.error = 'No se ha podido cargar el detalle.' }); }
  guardar(): void { if (!this.detalle || this.saving) return; this.saving = true; this.secretaria.actualizarAdminSoporteIncidencia(this.detalle.id, { estado: this.detalle.estado, mensaje: this.mensaje }).subscribe({ next: response => { this.detalle = response.incidencia; this.saving = false; this.mensaje = ''; this.load(); }, error: () => { this.saving = false; this.error = 'No se ha podido actualizar la incidencia.'; } }); }
  cerrarDetalle(): void { this.detalle = null; } estadoLabel(estado: string): string { return ({ ABIERTA: 'Abierta', EN_PROCESO: 'En proceso', RESUELTA: 'Resuelta', CERRADA: 'Cerrada' } as Record<string, string>)[estado] || estado; } private fail(message: string): void { this.loading = false; this.error = message; }
}

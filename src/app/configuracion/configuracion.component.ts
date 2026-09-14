import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EjerciciosComponent } from '../ejercicios/ejercicios.component';
import { RegistroDestinatario, RegistroResponsable } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';

@Component({
  selector: 'app-configuracion', standalone: true,
  imports: [CommonModule, FormsModule, EjerciciosComponent],
  templateUrl: './configuracion.component.html', styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
  tab: 'ejercicios' | 'registro' = 'ejercicios';
  destinatarios: RegistroDestinatario[] = [];
  responsables: RegistroResponsable[] = [];
  departamento = '';
  responsableId: number | null = null;
  email = '';
  loading = false;
  error = '';

  constructor(private readonly secretaria: SecretariaService) {}

  ngOnInit(): void { this.cargarRegistro(); }

  cargarRegistro(): void {
    this.loading = true;
    this.secretaria.getRegistroDestinatarios().subscribe({ next: r => { this.destinatarios = r.destinatarios; this.loading = false; }, error: () => { this.error = 'No se han podido cargar los destinatarios.'; this.loading = false; } });
    this.secretaria.getRegistroResponsables().subscribe({ next: r => this.responsables = r.responsables, error: () => this.error = 'No se han podido cargar los responsables habilitados.' });
  }

  guardarDestinatario(): void {
    if (!this.departamento.trim() || !this.responsableId || !this.email.trim()) { this.error = 'Indica departamento, responsable y correo.'; return; }
    this.loading = true; this.error = '';
    this.secretaria.crearRegistroDestinatario({ departamento: this.departamento.trim(), responsableId: this.responsableId, email: this.email.trim() }).subscribe({
      next: item => { this.destinatarios = [...this.destinatarios, item]; this.departamento = ''; this.responsableId = null; this.email = ''; this.loading = false; },
      error: response => { this.error = response?.error?.message || 'No se ha podido guardar el destinatario.'; this.loading = false; }
    });
  }

  actualizarDestinatario(item: RegistroDestinatario): void {
    if (!item.responsableId || !item.email) { this.error = 'Indica responsable y correo.'; return; }
    this.loading = true; this.error = '';
    this.secretaria.actualizarRegistroDestinatario(item.id, { responsableId: item.responsableId, email: item.email }).subscribe({
      next: actualizado => { this.destinatarios = this.destinatarios.map(actual => actual.id === actualizado.id ? actualizado : actual); this.loading = false; },
      error: response => { this.error = response?.error?.message || 'No se ha podido actualizar el destinatario.'; this.loading = false; }
    });
  }
}

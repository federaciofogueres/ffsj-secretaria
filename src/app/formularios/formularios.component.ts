import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoInscripcion, FormularioInscripcion } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

type FieldType = CampoInscripcion['type'];

@Component({
  selector: 'app-formularios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './formularios.component.html',
  styleUrls: ['./formularios.component.scss']
})
export class FormulariosComponent implements OnInit {
  formularios: FormularioInscripcion[] = [];
  selected: FormularioInscripcion | null = null;
  loading = false;
  error = '';
  success = '';
  confirmDelete = false;

  readonly fieldTypes: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Texto corto' },
    { value: 'textarea', label: 'Texto largo' },
    { value: 'tel', label: 'Telefono' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Numero' },
    { value: 'date', label: 'Fecha' },
    { value: 'select', label: 'Seleccionable manual' },
    { value: 'asociado', label: 'Asociados de la asociacion' },
    { value: 'asociado_adulto', label: 'Asociados adultos' },
    { value: 'asociado_infantil', label: 'Asociados infantiles' },
    { value: 'responsable', label: 'Responsable' }
  ];

  form = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    estado: ['activo'],
    campos: this.fb.array<FormGroup>([])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly secretariaService: SecretariaService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get campos(): FormArray<FormGroup> {
    return this.form.get('campos') as FormArray<FormGroup>;
  }

  select(formulario: FormularioInscripcion): void {
    this.selected = formulario;
    this.success = '';
    this.error = '';
    this.form.patchValue({
      nombre: formulario.nombre,
      descripcion: formulario.descripcion || '',
      estado: formulario.estado
    });
    this.campos.clear();
    formulario.campos.forEach(campo => this.campos.push(this.createCampoGroup(campo)));
  }

  nuevo(): void {
    this.selected = null;
    this.success = '';
    this.error = '';
    this.form.reset({ nombre: '', descripcion: '', estado: 'activo' });
    this.campos.clear();
    this.addCampo();
  }

  addCampo(type: FieldType = 'text'): void {
    this.campos.push(this.createCampoGroup({
      key: '',
      label: type === 'responsable' ? 'Responsable' : '',
      type,
      required: false,
      options: []
    }));
  }

  removeCampo(index: number): void {
    if (this.campos.length === 1) {
      this.error = 'El formulario debe tener al menos un campo.';
      return;
    }
    this.campos.removeAt(index);
  }

  moveCampo(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.campos.length) return;
    const control = this.campos.at(index);
    this.campos.removeAt(index);
    this.campos.insert(target, control);
  }

  duplicar(): void {
    if (!this.selected) return;
    const payload = { ...(this.buildPayload() as Record<string, unknown>), nombre: `${this.selected.nombre} (copia)` };
    this.loading = true;
    this.secretariaService.crearFormulario(payload).subscribe({
      next: formulario => { this.formularios = [...this.formularios, formulario].sort((a, b) => a.nombre.localeCompare(b.nombre)); this.select(formulario); this.success = 'Formulario duplicado correctamente.'; this.loading = false; },
      error: response => { this.error = response?.error?.message || 'No se ha podido duplicar el formulario.'; this.loading = false; }
    });
  }

  guardar(): void {
    if (this.form.invalid || !this.campos.length) {
      this.form.markAllAsTouched();
      this.error = 'Revisa el nombre y los campos del formulario.';
      return;
    }
    const payload = this.buildPayload();
    this.loading = true;
    this.error = '';
    this.success = '';
    const request = this.selected
      ? this.secretariaService.actualizarFormulario(this.selected.id, payload)
      : this.secretariaService.crearFormulario(payload);
    request.subscribe({
      next: formulario => {
        this.formularios = [formulario, ...this.formularios.filter(item => item.id !== formulario.id)]
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.select(formulario);
        this.success = 'Formulario guardado correctamente.';
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido guardar el formulario.';
        this.loading = false;
      }
    });
  }

  archivar(): void {
    if (!this.selected) return;
    this.form.patchValue({ estado: 'archivado' });
    this.guardar();
  }

  borrar(): void {
    if (!this.selected) return;
    this.confirmDelete = true;
  }

  confirmarBorrado(): void {
    if (!this.selected) return;
    this.confirmDelete = false;
    this.loading = true;
    this.secretariaService.borrarFormulario(this.selected.id).subscribe({
      next: () => {
        this.formularios = this.formularios.filter(item => item.id !== this.selected?.id);
        this.nuevo();
        this.success = 'Formulario borrado correctamente.';
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido borrar. Si tiene inscripciones vinculadas, archivalo.';
        this.loading = false;
      }
    });
  }

  optionsText(campo: FormGroup): string {
    return ((campo.value.options || []) as string[]).join('\n');
  }

  setOptions(campo: FormGroup, value: string): void {
    campo.patchValue({
      options: value.split('\n').map(item => item.trim()).filter(Boolean)
    });
  }

  private cargar(): void {
    this.loading = true;
    this.secretariaService.getFormularios(true).subscribe({
      next: response => {
        this.formularios = response.formularios;
        this.loading = false;
        if (!this.formularios.length) {
          this.nuevo();
        }
      },
      error: () => {
        this.error = 'No se han podido cargar los formularios.';
        this.loading = false;
      }
    });
  }

  private createCampoGroup(campo: CampoInscripcion): FormGroup {
    return this.fb.group({
      key: [campo.key || ''],
      label: [campo.label || '', Validators.required],
      type: [campo.type || 'text', Validators.required],
      required: [Boolean(campo.required)],
      options: [campo.options || []]
    });
  }

  private buildPayload(): unknown {
    const campos = this.campos.controls.map((control, index) => ({
      key: this.normalizeKey(control.value.key || control.value.label || `campo_${index + 1}`),
      label: control.value.label,
      type: control.value.type,
      required: Boolean(control.value.required),
      options: control.value.type === 'select' ? control.value.options || [] : []
    }));
    return {
      nombre: this.form.value.nombre,
      descripcion: this.form.value.descripcion,
      estado: this.form.value.estado || 'activo',
      campos
    };
  }

  private normalizeKey(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}

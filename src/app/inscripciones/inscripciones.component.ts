import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminAccessService } from '../core/admin-access.service';
import { CensoService } from '../core/censo.service';
import { ActividadSecretaria, InscripcionSecretaria } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';

type ParticipantType = 'adulto' | 'infantil';

interface Participant {
  id: string;
  nombre: string;
  cargo: string;
  tipo: ParticipantType;
}

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './inscripciones.component.html',
  styleUrls: ['./inscripciones.component.scss']
})
export class InscripcionesComponent implements OnInit {
  actividades: ActividadSecretaria[] = [];
  inscripciones: InscripcionSecretaria[] = [];
  selectedInscription: InscripcionSecretaria | null = null;
  form: FormGroup = this.fb.group({});
  selectedParticipants = new Set<string>();
  loading = false;
  error = '';
  success = '';
  editingInscription = false;

  readonly adults: Participant[] = [
    { id: 'a1', nombre: 'Maria Lopez Gadea', cargo: 'Presidencia', tipo: 'adulto' },
    { id: 'a2', nombre: 'Sergio Martinez Ruiz', cargo: 'Secretaria', tipo: 'adulto' },
    { id: 'a3', nombre: 'Lucia Gomez Diaz', cargo: 'Vocal', tipo: 'adulto' }
  ];

  readonly kids: Participant[] = [
    { id: 'k1', nombre: 'Antonio Caceres Moreno', cargo: 'Presidencia Infantil', tipo: 'infantil' },
    { id: 'k2', nombre: 'Abril del Carmen Sanz Blasco', cargo: 'Asociado/a Infantil', tipo: 'infantil' },
    { id: 'k3', nombre: 'Lucia Eugenio Bertomeu', cargo: 'Asociado/a Infantil', tipo: 'infantil' }
  ];

  inscripcionAdminForm = this.fb.group({
    titulo: ['', Validators.required],
    actividadId: [''],
    fechaPublicacion: [new Date().toISOString().slice(0, 10), Validators.required],
    fechaLimite: ['', Validators.required],
    adultos: [true],
    infantiles: [true]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly secretariaService: SecretariaService,
    private readonly censoService: CensoService,
    private readonly adminAccess: AdminAccessService,
    readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  get isAdminMode(): boolean {
    return this.adminAccess.isAdmin();
  }

  get availableParticipants(): Participant[] {
    if (!this.selectedInscription) return [];
    const allowed = this.selectedInscription.tiposPermitidos;
    return [...this.adults, ...this.kids].filter(p => allowed.includes(p.tipo));
  }

  get canSubmit(): boolean {
    return !this.isAdminMode && this.permissions.hasPermission('inscripciones:write') && this.form.valid && this.selectedParticipants.size > 0;
  }

  actividadDe(inscripcion: InscripcionSecretaria): ActividadSecretaria | undefined {
    return this.actividades.find(actividad => actividad.id === inscripcion.actividadId);
  }

  selectInscription(inscription: InscripcionSecretaria): void {
    this.selectedInscription = inscription;
    this.selectedParticipants.clear();
    this.success = '';
    this.error = '';
    const group: Record<string, FormControl> = {};
    inscription.campos.forEach(field => {
      group[field.key] = this.fb.control('', field.required ? Validators.required : undefined);
    });
    this.form = this.fb.group(group);

    if (this.isAdminMode) {
      this.editingInscription = true;
      this.inscripcionAdminForm.patchValue({
        titulo: inscription.titulo,
        actividadId: inscription.actividadId || '',
        fechaPublicacion: this.toDateInput(inscription.fechaPublicacion) || new Date().toISOString().slice(0, 10),
        fechaLimite: this.toDateInput(inscription.fechaLimite) || '',
        adultos: inscription.tiposPermitidos.includes('adulto'),
        infantiles: inscription.tiposPermitidos.includes('infantil')
      });
    }
  }

  nuevaInscripcion(): void {
    this.selectedInscription = null;
    this.editingInscription = false;
    this.success = '';
    this.error = '';
    this.inscripcionAdminForm.reset({
      titulo: '',
      actividadId: '',
      fechaPublicacion: new Date().toISOString().slice(0, 10),
      fechaLimite: '',
      adultos: true,
      infantiles: true
    });
  }

  crearInscripcion(): void {
    if (this.inscripcionAdminForm.invalid) {
      this.inscripcionAdminForm.markAllAsTouched();
      return;
    }
    const tiposPermitidos = [
      this.inscripcionAdminForm.value.adultos ? 'adulto' : null,
      this.inscripcionAdminForm.value.infantiles ? 'infantil' : null
    ].filter((tipo): tipo is ParticipantType => Boolean(tipo));
    if (!tiposPermitidos.length) {
      this.error = 'Selecciona al menos un tipo de participante.';
      return;
    }
    this.loading = true;
    const payload = {
      titulo: this.inscripcionAdminForm.value.titulo,
      actividadId: this.inscripcionAdminForm.value.actividadId || null,
      estado: 'abierta',
      fechaPublicacion: this.inscripcionAdminForm.value.fechaPublicacion,
      fechaLimite: this.inscripcionAdminForm.value.fechaLimite,
      tiposPermitidos
    };
    const request = this.editingInscription && this.selectedInscription
      ? this.secretariaService.actualizarInscripcion(this.selectedInscription.id, payload)
      : this.secretariaService.crearInscripcion(payload);

    request.subscribe({
      next: inscripcion => {
        this.inscripciones = [inscripcion, ...this.inscripciones.filter(item => item.id !== inscripcion.id)];
        this.selectInscription(inscripcion);
        this.success = this.editingInscription ? 'Inscripcion actualizada correctamente.' : 'Inscripcion creada correctamente.';
        this.loading = false;
      },
      error: () => {
        this.error = this.editingInscription ? 'No se ha podido actualizar la inscripcion.' : 'No se ha podido crear la inscripcion.';
        this.loading = false;
      }
    });
  }

  borrarInscripcion(): void {
    if (!this.selectedInscription || !this.isAdminMode) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.secretariaService.borrarInscripcion(this.selectedInscription.id).subscribe({
      next: () => {
        const deletedId = this.selectedInscription?.id;
        this.inscripciones = this.inscripciones.filter(item => item.id !== deletedId);
        this.selectedInscription = null;
        this.nuevaInscripcion();
        if (this.inscripciones[0]) {
          this.selectInscription(this.inscripciones[0]);
        }
        this.success = 'Inscripcion borrada correctamente.';
        this.loading = false;
      },
      error: () => {
        this.error = 'No se ha podido borrar la inscripcion. Comprueba que no tenga entradas presentadas.';
        this.loading = false;
      }
    });
  }

  toggleParticipant(participant: Participant): void {
    this.selectedParticipants.has(participant.id)
      ? this.selectedParticipants.delete(participant.id)
      : this.selectedParticipants.add(participant.id);
  }

  isParticipantSelected(participant: Participant): boolean {
    return this.selectedParticipants.has(participant.id);
  }

  submit(): void {
    if (!this.selectedInscription) return;
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.secretariaService.enviarInscripcion({
      asociacionId: this.censoService.asociacionId,
      formularioId: this.selectedInscription.id,
      datos: this.form.value,
      participantes: [...this.selectedParticipants]
    }).subscribe({
      next: () => {
        this.success = 'Inscripcion enviada correctamente.';
      },
      error: () => {
        this.error = 'No se ha podido enviar la inscripcion.';
      }
    });
  }

  private cargarDatos(): void {
    this.loading = true;
    this.secretariaService.getActividades().subscribe({
      next: actividadesResponse => {
        this.actividades = actividadesResponse.actividades;
        this.secretariaService.getInscripciones(this.censoService.asociacionId).subscribe({
          next: inscripcionesResponse => {
            this.inscripciones = inscripcionesResponse.inscripciones;
            if (this.inscripciones[0]) {
              this.selectInscription(this.inscripciones[0]);
            }
            this.loading = false;
          },
          error: () => {
            this.error = 'No se han podido cargar las inscripciones.';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'No se han podido cargar las actividades.';
        this.loading = false;
      }
    });
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }
}

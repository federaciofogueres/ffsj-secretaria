import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

type ParticipantType = 'adulto' | 'infantil';

interface Participant {
  id: string;
  nombre: string;
  cargo: string;
  tipo: ParticipantType;
}

type FieldType = 'text' | 'textarea' | 'tel' | 'email' | 'number' | 'date' | 'select';

interface InscriptionField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

interface Inscription {
  id: string;
  title: string;
  subtitle: string;
  responsable: string;
  avatar: string;
  publishedAt: string;
  deadlineAt: string;
  signupDate?: string;
  allowedTypes: ParticipantType[];
  fields: InscriptionField[];
}

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inscripciones.component.html',
  styleUrls: ['./inscripciones.component.scss']
})
export class InscripcionesComponent implements OnInit {
  inscriptions: Inscription[] = [
    {
      id: 'cena-jovenes',
      title: 'Cena y fiesta juvenil de Año Nuevo 2026',
      subtitle: 'Delegación de Foguers Infantils y Juventud',
      responsable: 'Agustín Sanz Manzanaro',
      avatar: 'assets/img/logo-intranet.png',
      publishedAt: '2025-12-03',
      deadlineAt: '2025-12-12',
      signupDate: '2025-12-05',
      allowedTypes: ['infantil'],
      fields: [
        { key: 'delegado', label: 'Delegado/a de infantiles', type: 'text', required: true },
        { key: 'telefono', label: 'Teléfono de contacto', type: 'tel', required: true },
        { key: 'observaciones', label: 'Observaciones (intolerancias o alergias)', type: 'textarea' }
      ]
    },
    {
      id: 'inscripcion-cargos',
      title: 'Inscripción cargos / presentaciones 2026',
      subtitle: 'Vicepresidencia de Fiestas y Actividades',
      responsable: 'María Segarra González',
      avatar: 'assets/img/logo-intranet.png',
      publishedAt: '2025-11-21',
      deadlineAt: '2026-01-18',
      allowedTypes: ['adulto', 'infantil'],
      fields: [
        { key: 'representante', label: 'Representante principal', type: 'text', required: true },
        { key: 'telefono', label: 'Teléfono', type: 'tel', required: true },
        { key: 'cargo', label: 'Cargo solicitado', type: 'select', required: true, options: ['Bellea', 'Dama', 'Presidencia'] },
        { key: 'nota', label: 'Notas adicionales', type: 'textarea' }
      ]
    },
    {
      id: 'procesion-san-nicolas',
      title: 'Procesión de San Nicolás 2025',
      subtitle: 'Delegación de Foguers Infantils y Juventud',
      responsable: 'Luis Carrión Martínez',
      avatar: 'assets/img/logo-intranet.png',
      publishedAt: '2025-10-28',
      deadlineAt: '2025-11-26',
      allowedTypes: ['adulto'],
      fields: [
        { key: 'delegado', label: 'Delegado/a', type: 'text', required: true },
        { key: 'telefono', label: 'Teléfono', type: 'tel', required: true },
        { key: 'asistentes', label: 'Número de asistentes', type: 'number', required: true },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
      ]
    }
  ];

  adults: Participant[] = [
    { id: 'a1', nombre: 'María López Gadea', cargo: 'Presidencia', tipo: 'adulto' },
    { id: 'a2', nombre: 'Sergio Martínez Ruiz', cargo: 'Secretaría', tipo: 'adulto' },
    { id: 'a3', nombre: 'Lucía Gómez Díaz', cargo: 'Vocal', tipo: 'adulto' }
  ];

  kids: Participant[] = [
    { id: 'k1', nombre: 'Antonio Cáceres Moreno', cargo: 'Presidencia Infantil', tipo: 'infantil' },
    { id: 'k2', nombre: 'Abril del Carmen Sanz Blasco', cargo: 'Asociado/a Infantil', tipo: 'infantil' },
    { id: 'k3', nombre: 'Lucía Eugenio Bertomeu', cargo: 'Asociado/a Infantil', tipo: 'infantil' }
  ];

  selectedInscription: Inscription | null = null;
  form: FormGroup = this.fb.group({});
  selectedParticipants = new Set<string>();

  constructor(private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.selectInscription(this.inscriptions[0]);
  }

  selectInscription(inscription: Inscription): void {
    this.selectedInscription = inscription;
    this.selectedParticipants.clear();
    this.buildForm(inscription);
  }

  toggleParticipant(participant: Participant): void {
    const exists = this.selectedParticipants.has(participant.id);
    if (exists) {
      this.selectedParticipants.delete(participant.id);
    } else {
      this.selectedParticipants.add(participant.id);
    }
  }

  isParticipantSelected(participant: Participant): boolean {
    return this.selectedParticipants.has(participant.id);
  }

  get availableParticipants(): Participant[] {
    if (!this.selectedInscription) return [];
    const allowed = this.selectedInscription.allowedTypes;
    return [...this.adults, ...this.kids].filter(p => allowed.includes(p.tipo));
  }

  get canSubmit(): boolean {
    return this.form.valid && this.selectedParticipants.size > 0;
  }

  print(): void {
    if (!this.canSubmit) return;
    // Placeholder for print logic
    console.log('Imprimir ficha de inscripción', this.form.value, [...this.selectedParticipants]);
  }

  submit(): void {
    if (!this.selectedInscription) return;
    if (this.form.invalid || this.selectedParticipants.size === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      inscriptionId: this.selectedInscription.id,
      data: this.form.value,
      participants: [...this.selectedParticipants]
    };
    console.log('Inscribirse', payload);
  }

  private buildForm(inscription: Inscription): void {
    const group: Record<string, FormControl> = {};
    inscription.fields.forEach(field => {
      group[field.key] = this.fb.control('', field.required ? Validators.required : undefined);
    });
    this.form = this.fb.group(group);
  }
}

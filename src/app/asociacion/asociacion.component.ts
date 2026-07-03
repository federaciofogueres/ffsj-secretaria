import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CensoService } from '../core/censo.service';
import { ErrorService } from '../core/error.service';
import { Asociacion } from '../core/models';
import { PermissionsService } from '../core/permissions.service';

interface AssociationData {
  basic: {
    name: string;
    cif: string;
    tag: string;
    address: string;
    city: string;
    province: string;
  };
  publicInfo: {
    foundationYear: string;
    hymn: string;
    motto: string;
    monumentLocation: string;
    gateLocation: string;
  };
  headquarters: {
    address: string;
    postalCode: string;
    city: string;
    province: string;
  };
  contact: {
    email: string;
    phone: string;
  };
}

@Component({
  selector: 'app-asociacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './asociacion.component.html',
  styleUrls: ['./asociacion.component.scss']
})
export class AsociacionComponent implements OnInit {
  association: AssociationData = this.emptyAssociation();
  form: FormGroup = this.buildForm(this.association);
  private rawAssociation: Asociacion | null = null;
  isEditing = false;
  loading = false;
  saving = false;
  error = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly censoService: CensoService,
    private readonly errorService: ErrorService,
    readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.loadAssociation();
  }

  startEdit(): void {
    if (!this.permissions.hasPermission('asociacion:write')) {
      this.errorService.show('No tienes permiso para editar los datos de la asociacion.');
      return;
    }
    this.isEditing = true;
    this.form.enable({ emitEvent: false });
    this.disableUnsupportedControls();
  }

  cancelEdit(): void {
    this.form.reset(this.association);
    this.form.disable({ emitEvent: false });
    this.isEditing = false;
  }

  save(): void {
    if (!this.permissions.hasPermission('asociacion:write')) {
      this.errorService.show('No tienes permiso para guardar los datos de la asociacion.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.rawAssociation) {
      this.errorService.show('No hay datos originales de la asociacion para actualizar.');
      return;
    }

    const formValue = this.form.getRawValue() as AssociationData;
    const payload = this.mapFormToPayload(formValue);

    this.saving = true;
    this.censoService.updateAsociacion(payload.id, payload).subscribe({
      next: asociacion => {
        this.rawAssociation = asociacion;
        this.association = this.mapAssociation(asociacion);
        this.form.reset(this.association);
        this.form.disable({ emitEvent: false });
        this.isEditing = false;
        this.saving = false;
      },
      error: () => {
        this.saving = false;
        this.errorService.show('No se han podido guardar los datos de la asociacion.');
      }
    });
  }

  private loadAssociation(): void {
    this.loading = true;
    this.error = '';
    this.censoService.getAsociacion(this.censoService.asociacionId).subscribe({
      next: asociacion => {
        this.rawAssociation = asociacion;
        this.association = this.mapAssociation(asociacion);
        this.form = this.buildForm(this.association);
        this.form.disable({ emitEvent: false });
        this.disableUnsupportedControls();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se han podido cargar los datos de la asociacion desde la API de censo.';
        this.errorService.show(this.error);
        this.loading = false;
      }
    });
  }

  private buildForm(data: AssociationData): FormGroup {
    return this.fb.group({
      basic: this.fb.group({
        name: [data.basic.name, Validators.required],
        cif: [data.basic.cif, Validators.required],
        tag: [data.basic.tag, Validators.required],
        address: [data.basic.address],
        city: [data.basic.city],
        province: [data.basic.province]
      }),
      publicInfo: this.fb.group({
        foundationYear: [data.publicInfo.foundationYear],
        hymn: [data.publicInfo.hymn],
        motto: [data.publicInfo.motto],
        monumentLocation: [data.publicInfo.monumentLocation],
        gateLocation: [data.publicInfo.gateLocation]
      }),
      headquarters: this.fb.group({
        address: [data.headquarters.address],
        postalCode: [data.headquarters.postalCode],
        city: [data.headquarters.city],
        province: [data.headquarters.province]
      }),
      contact: this.fb.group({
        email: [data.contact.email, Validators.email],
        phone: [data.contact.phone]
      })
    });
  }

  private disableUnsupportedControls(): void {
    [
      'publicInfo.hymn',
      'publicInfo.monumentLocation',
      'publicInfo.gateLocation',
      'headquarters.address',
      'headquarters.postalCode',
      'headquarters.city',
      'headquarters.province'
    ].forEach(path => this.form.get(path)?.disable({ emitEvent: false }));
  }

  private mapAssociation(asociacion: Asociacion): AssociationData {
    return {
      basic: {
        name: asociacion.name ?? (asociacion as any).nombre ?? '',
        cif: asociacion.cif ?? '',
        tag: String((asociacion as any).tipo_asociacion ?? (asociacion as any).tipoAsociacion ?? ''),
        address: asociacion.address ?? (asociacion as any).direccion ?? '',
        city: asociacion.city ?? (asociacion as any).poblacion ?? '',
        province: asociacion.state ?? (asociacion as any).provincia ?? ''
      },
      publicInfo: {
        foundationYear: String((asociacion as any).anyo_fundacion ?? (asociacion as any).anyoFundacion ?? ''),
        hymn: (asociacion as any).himno ?? '',
        motto: (asociacion as any).lema ?? '',
        monumentLocation: (asociacion as any).ubicacionMonumento ?? '',
        gateLocation: (asociacion as any).ubicacionPortada ?? ''
      },
      headquarters: {
        address: (asociacion as any).sedeDireccion ?? '',
        postalCode: (asociacion as any).sedeCodigoPostal ?? '',
        city: (asociacion as any).sedeCiudad ?? '',
        province: (asociacion as any).sedeProvincia ?? ''
      },
      contact: {
        email: asociacion.email ?? '',
        phone: asociacion.phone ?? (asociacion as any).telefono ?? ''
      }
    };
  }

  private mapFormToPayload(data: AssociationData): Asociacion {
    const original = this.rawAssociation as Asociacion;
    const tipoAsociacion = Number(data.basic.tag);

    return {
      id: Number(original.id),
      nombre: data.basic.name,
      cif: data.basic.cif,
      direccion: data.basic.address,
      email: data.contact.email,
      telefono: data.contact.phone,
      tipo_asociacion: Number.isFinite(tipoAsociacion) ? tipoAsociacion : (original as any).tipo_asociacion,
      lema: data.publicInfo.motto,
      anyo_fundacion: data.publicInfo.foundationYear ? Number(data.publicInfo.foundationYear) : null,
      password: original.password ?? null,
      active: this.toBooleanOrNull(original.active),
      img: null,
      asociacion_order: (original as any).asociacion_order ?? null
    } as Asociacion;
  }

  private toBooleanOrNull(value: unknown): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return Number(value) === 1;
  }

  private emptyAssociation(): AssociationData {
    return {
      basic: { name: '', cif: '', tag: '', address: '', city: '', province: '' },
      publicInfo: { foundationYear: '', hymn: '', motto: '', monumentLocation: '', gateLocation: '' },
      headquarters: { address: '', postalCode: '', city: '', province: '' },
      contact: { email: '', phone: '' }
    };
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CensoService } from '../core/censo.service';
import { ErrorService } from '../core/error.service';
import { Asociacion } from '../core/models';

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
  isEditing = false;
  loading = false;
  error = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly censoService: CensoService,
    private readonly errorService: ErrorService
  ) {}

  ngOnInit(): void {
    this.loadAssociation();
  }

  startEdit(): void {
    this.isEditing = true;
    this.form.enable({ emitEvent: false });
  }

  cancelEdit(): void {
    this.form.reset(this.association);
    this.form.disable({ emitEvent: false });
    this.isEditing = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // La API de censo tiene endpoint PUT, pero falta definir mapeo completo de campos editables.
    this.association = this.form.getRawValue() as AssociationData;
    this.form.disable({ emitEvent: false });
    this.isEditing = false;
  }

  private loadAssociation(): void {
    this.loading = true;
    this.error = '';
    this.censoService.getAsociacion(this.censoService.asociacionId).subscribe({
      next: asociacion => {
        this.association = this.mapAssociation(asociacion);
        this.form = this.buildForm(this.association);
        this.form.disable({ emitEvent: false });
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

  private mapAssociation(asociacion: Asociacion): AssociationData {
    return {
      basic: {
        name: asociacion.name ?? (asociacion as any).nombre ?? '',
        cif: asociacion.cif ?? '',
        tag: String((asociacion as any).tipoAsociacion ?? ''),
        address: asociacion.address ?? (asociacion as any).direccion ?? '',
        city: asociacion.city ?? '',
        province: asociacion.state ?? ''
      },
      publicInfo: {
        foundationYear: String((asociacion as any).anyoFundacion ?? ''),
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

  private emptyAssociation(): AssociationData {
    return {
      basic: { name: '', cif: '', tag: '', address: '', city: '', province: '' },
      publicInfo: { foundationYear: '', hymn: '', motto: '', monumentLocation: '', gateLocation: '' },
      headquarters: { address: '', postalCode: '', city: '', province: '' },
      contact: { email: '', phone: '' }
    };
  }
}

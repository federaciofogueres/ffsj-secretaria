import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

interface BasicInfo {
  name: string;
  cif: string;
  tag: string;
  address: string;
  city: string;
  province: string;
}

interface PublicInfo {
  foundationYear: string;
  hymn: string;
  motto: string;
  monumentLocation: string;
  gateLocation: string;
}

interface Headquarters {
  address: string;
  postalCode: string;
  city: string;
  province: string;
}

interface ContactInfo {
  email: string;
  phone: string;
}

interface AssociationData {
  basic: BasicInfo;
  publicInfo: PublicInfo;
  headquarters: Headquarters;
  contact: ContactInfo;
}

@Component({
  selector: 'app-asociacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './asociacion.component.html',
  styleUrls: ['./asociacion.component.scss']
})
export class AsociacionComponent {
  association: AssociationData = {
    basic: {
      name: 'Doctor Bergez - Carolinas',
      cif: 'G03628971',
      tag: 'Foguera',
      address: 'C/ Del Gust no. 5-B - 03110',
      city: 'Alicante',
      province: 'Alicante'
    },
    publicInfo: {
      foundationYear: '1983',
      hymn: 'No existe',
      motto: 'No existe',
      monumentLocation: 'Dato Iradier cruce con San Pablo',
      gateLocation: 'Dato Iradier'
    },
    headquarters: {
      address: 'Calle Doctor Bergez, 16, Bajo',
      postalCode: '03012',
      city: 'Alicante',
      province: 'Alicante'
    },
    contact: {
      email: 'hogueradoctor.bergez.carolinas@gmail.com',
      phone: '633 130 507'
    }
  };

  form: FormGroup;
  isEditing = false;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.buildForm();
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
    this.association = this.form.getRawValue() as AssociationData;
    this.form.disable({ emitEvent: false });
    this.isEditing = false;
  }

  private buildForm(): FormGroup {
    const formGroup = this.fb.group({
      basic: this.fb.group({
        name: [this.association.basic.name],
        cif: [this.association.basic.cif],
        tag: [this.association.basic.tag],
        address: [this.association.basic.address],
        city: [this.association.basic.city],
        province: [this.association.basic.province]
      }),
      publicInfo: this.fb.group({
        foundationYear: [this.association.publicInfo.foundationYear],
        hymn: [this.association.publicInfo.hymn],
        motto: [this.association.publicInfo.motto],
        monumentLocation: [this.association.publicInfo.monumentLocation],
        gateLocation: [this.association.publicInfo.gateLocation]
      }),
      headquarters: this.fb.group({
        address: [this.association.headquarters.address],
        postalCode: [this.association.headquarters.postalCode],
        city: [this.association.headquarters.city],
        province: [this.association.headquarters.province]
      }),
      contact: this.fb.group({
        email: [this.association.contact.email],
        phone: [this.association.contact.phone]
      })
    });

    formGroup.disable({ emitEvent: false });
    return formGroup;
  }
}

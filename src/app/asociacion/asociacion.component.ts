import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CensoService } from '../core/censo.service';
import { ErrorService } from '../core/error.service';
import { Asociacion } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { LocationPickerComponent, StructuredLocation } from '../shared/location-picker.component';
import { FfsjSpinnerComponent } from 'ffsj-web-components';

interface AssociationData {
  basic: {
    name: string;
    cif: string;
    tag: string;
    address: string;
    postalCode: string;
    city: string;
    province: string;
    latitud: number | null;
    longitud: number | null;
  };
  publicInfo: {
    foundationYear: string;
    hymn: string;
    motto: string;
    monumentLocation: string;
    gateLocation: string;
    childMonumentLocation: string;
    racoLocation: string;
    barracaLocation: string;
  };
  headquarters: {
    address: string;
    postalCode: string;
    city: string;
    province: string;
    latitud: number | null;
    longitud: number | null;
  };
  contact: {
    email: string;
    phone: string;
  };
}

@Component({
  selector: 'app-asociacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationPickerComponent, FfsjSpinnerComponent],
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
  activeTab: 'general' | 'public' | 'headquarters' | 'contact' | 'access' = 'general';
  readonly passwordForm = this.fb.group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, Validators.minLength(8)]],
    confirmacion: ['', Validators.required]
  });
  passwordSaving = false;
  passwordError = '';
  passwordSuccess = '';
  showPassword = { actual: false, nueva: false, confirmacion: false };

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
      error: response => {
        this.saving = false;
        this.error = this.saveErrorMessage(response);
        this.errorService.show(this.error);
      }
    });
  }

  selectTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  location(group: 'basic' | 'headquarters' | 'publicInfo', prefix = ''): StructuredLocation {
    const value = this.form.get(group)?.value as any || {}; const apiPrefix: Record<string, string> = { monumentLocation: 'ubicacion_monumento', childMonumentLocation: 'ubicacion_foguera_infantil', racoLocation: 'ubicacion_raco', gateLocation: 'ubicacion_portada', barracaLocation: 'ubicacion_barraca' };
    const key = prefix ? (apiPrefix[prefix] || prefix) : '';
    return { direccion: key ? value[key] || '' : value.address || '', codigoPostal: key ? value[`${key}_codigo_postal`] || '' : value.postalCode || '', localidad: key ? value[`${key}_localidad`] || '' : value.city || '', provincia: key ? value[`${key}_provincia`] || '' : value.province || '', latitud: Number(key ? value[`${key}_latitud`] : value.latitud) || null, longitud: Number(key ? value[`${key}_longitud`] : value.longitud) || null };
  }

  setLocation(group: 'basic' | 'headquarters' | 'publicInfo', location: StructuredLocation, prefix = ''): void {
    const target = this.form.get(group) as FormGroup; const apiPrefix: Record<string, string> = { monumentLocation: 'ubicacion_monumento', childMonumentLocation: 'ubicacion_foguera_infantil', racoLocation: 'ubicacion_raco', gateLocation: 'ubicacion_portada', barracaLocation: 'ubicacion_barraca' }; const key = apiPrefix[prefix] || prefix; const patch: any = prefix ? { [prefix]: location.direccion, [`${key}_codigo_postal`]: location.codigoPostal, [`${key}_localidad`]: location.localidad, [`${key}_provincia`]: location.provincia, [`${key}_latitud`]: location.latitud, [`${key}_longitud`]: location.longitud } : { address: location.direccion, postalCode: location.codigoPostal, city: location.localidad, province: location.provincia, latitud: location.latitud, longitud: location.longitud }; target.patchValue(patch);
  }

  isFoguera(): boolean { return Number(this.form.get('basic.tag')?.value) === 2; }

  cambiarPassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';
    if (!this.permissions.hasPermission('asociacion:write')) {
      this.passwordError = 'No tienes permiso para cambiar la contraseña.';
      return;
    }
    if (this.passwordForm.invalid || this.passwordForm.value.nueva !== this.passwordForm.value.confirmacion) {
      this.passwordForm.markAllAsTouched();
      this.passwordError = this.passwordForm.value.nueva !== this.passwordForm.value.confirmacion
        ? 'La nueva contraseña y su confirmación no coinciden.'
        : 'Completa los tres campos. La nueva contraseña debe tener al menos 8 caracteres.';
      return;
    }
    this.passwordSaving = true;
    this.censoService.cambiarPasswordAsociacion(this.passwordForm.value.actual || '', this.passwordForm.value.nueva || '').subscribe({
      next: () => {
        this.passwordSaving = false;
        this.passwordForm.reset();
        this.passwordSuccess = 'Contraseña actualizada correctamente.';
      },
      error: error => {
        this.passwordSaving = false;
        this.passwordError = error?.error?.message || 'No se ha podido actualizar la contraseña.';
      }
    });
  }

  getTipoLabel(value: unknown): string {
    const tipo = Number(value);

    if (tipo === 2) {
      return 'Foguera';
    }

    if (tipo === 1) {
      return 'Barraca';
    }

    return '';
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
        postalCode: [data.basic.postalCode],
        city: [data.basic.city],
        province: [data.basic.province]
        , latitud: [data.basic.latitud], longitud: [data.basic.longitud]
      }),
      publicInfo: this.fb.group({
        foundationYear: [data.publicInfo.foundationYear],
        hymn: [data.publicInfo.hymn],
        motto: [data.publicInfo.motto],
        monumentLocation: [data.publicInfo.monumentLocation],
        gateLocation: [data.publicInfo.gateLocation], childMonumentLocation: [data.publicInfo.childMonumentLocation], racoLocation: [data.publicInfo.racoLocation], barracaLocation: [data.publicInfo.barracaLocation],
        ubicacion_monumento_codigo_postal: [(this.rawAssociation as any)?.ubicacion_monumento_codigo_postal || ''], ubicacion_monumento_localidad: [(this.rawAssociation as any)?.ubicacion_monumento_localidad || ''], ubicacion_monumento_provincia: [(this.rawAssociation as any)?.ubicacion_monumento_provincia || ''], ubicacion_monumento_latitud: [(this.rawAssociation as any)?.ubicacion_monumento_latitud || null], ubicacion_monumento_longitud: [(this.rawAssociation as any)?.ubicacion_monumento_longitud || null], ubicacion_foguera_infantil_codigo_postal: [(this.rawAssociation as any)?.ubicacion_foguera_infantil_codigo_postal || ''], ubicacion_foguera_infantil_localidad: [(this.rawAssociation as any)?.ubicacion_foguera_infantil_localidad || ''], ubicacion_foguera_infantil_provincia: [(this.rawAssociation as any)?.ubicacion_foguera_infantil_provincia || ''], ubicacion_foguera_infantil_latitud: [(this.rawAssociation as any)?.ubicacion_foguera_infantil_latitud || null], ubicacion_foguera_infantil_longitud: [(this.rawAssociation as any)?.ubicacion_foguera_infantil_longitud || null], ubicacion_raco_codigo_postal: [(this.rawAssociation as any)?.ubicacion_raco_codigo_postal || ''], ubicacion_raco_localidad: [(this.rawAssociation as any)?.ubicacion_raco_localidad || ''], ubicacion_raco_provincia: [(this.rawAssociation as any)?.ubicacion_raco_provincia || ''], ubicacion_raco_latitud: [(this.rawAssociation as any)?.ubicacion_raco_latitud || null], ubicacion_raco_longitud: [(this.rawAssociation as any)?.ubicacion_raco_longitud || null], ubicacion_portada_codigo_postal: [(this.rawAssociation as any)?.ubicacion_portada_codigo_postal || ''], ubicacion_portada_localidad: [(this.rawAssociation as any)?.ubicacion_portada_localidad || ''], ubicacion_portada_provincia: [(this.rawAssociation as any)?.ubicacion_portada_provincia || ''], ubicacion_portada_latitud: [(this.rawAssociation as any)?.ubicacion_portada_latitud || null], ubicacion_portada_longitud: [(this.rawAssociation as any)?.ubicacion_portada_longitud || null], ubicacion_barraca_codigo_postal: [(this.rawAssociation as any)?.ubicacion_barraca_codigo_postal || ''], ubicacion_barraca_localidad: [(this.rawAssociation as any)?.ubicacion_barraca_localidad || ''], ubicacion_barraca_provincia: [(this.rawAssociation as any)?.ubicacion_barraca_provincia || ''], ubicacion_barraca_latitud: [(this.rawAssociation as any)?.ubicacion_barraca_latitud || null], ubicacion_barraca_longitud: [(this.rawAssociation as any)?.ubicacion_barraca_longitud || null]
      }),
      headquarters: this.fb.group({
        address: [data.headquarters.address],
        postalCode: [data.headquarters.postalCode],
        city: [data.headquarters.city],
        province: [data.headquarters.province], latitud: [data.headquarters.latitud], longitud: [data.headquarters.longitud]
      }),
      contact: this.fb.group({
        email: [data.contact.email, Validators.email],
        phone: [data.contact.phone]
      })
    });
  }

  private disableUnsupportedControls(): void {
    // Todos los campos visibles de esta pantalla tienen columna en censo.
  }

  private mapAssociation(asociacion: Asociacion): AssociationData {
    const addressParts = this.mapAddressParts(asociacion);

    return {
      basic: {
        name: asociacion.name ?? (asociacion as any).nombre ?? '',
        cif: asociacion.cif ?? '',
        tag: String((asociacion as any).tipo_asociacion ?? (asociacion as any).tipoAsociacion ?? ''),
        address: addressParts.address,
        postalCode: addressParts.postalCode,
        city: addressParts.city,
        province: addressParts.province
        , latitud: Number((asociacion as any).latitud) || null, longitud: Number((asociacion as any).longitud) || null
      },
      publicInfo: {
        foundationYear: String((asociacion as any).anyo_fundacion ?? (asociacion as any).anyoFundacion ?? ''),
        hymn: (asociacion as any).himno ?? '',
        motto: (asociacion as any).lema ?? '',
        monumentLocation: (asociacion as any).ubicacion_monumento ?? (asociacion as any).ubicacionMonumento ?? '',
        gateLocation: (asociacion as any).ubicacion_portada ?? (asociacion as any).ubicacionPortada ?? '', childMonumentLocation: (asociacion as any).ubicacion_foguera_infantil ?? '', racoLocation: (asociacion as any).ubicacion_raco ?? '', barracaLocation: (asociacion as any).ubicacion_barraca ?? ''
      },
      headquarters: {
        address: (asociacion as any).sede_direccion ?? (asociacion as any).sedeDireccion ?? '',
        postalCode: (asociacion as any).sede_codigo_postal ?? (asociacion as any).sedeCodigoPostal ?? '',
        city: (asociacion as any).sede_poblacion ?? (asociacion as any).sedePoblacion ?? (asociacion as any).sedeCiudad ?? '',
        province: (asociacion as any).sede_provincia ?? (asociacion as any).sedeProvincia ?? '', latitud: Number((asociacion as any).sede_latitud) || null, longitud: Number((asociacion as any).sede_longitud) || null
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
      localidad: data.basic.city,
      codigo_postal: data.basic.postalCode,
      provincia: data.basic.province,
      latitud: data.basic.latitud, longitud: data.basic.longitud,
      email: data.contact.email,
      telefono: data.contact.phone,
      tipo_asociacion: Number.isFinite(tipoAsociacion) ? tipoAsociacion : (original as any).tipo_asociacion,
      lema: data.publicInfo.motto,
      himno: data.publicInfo.hymn,
      ubicacion_monumento: data.publicInfo.monumentLocation,
      ubicacion_portada: data.publicInfo.gateLocation,
      ubicacion_foguera_infantil: data.publicInfo.childMonumentLocation, ubicacion_raco: data.publicInfo.racoLocation, ubicacion_barraca: data.publicInfo.barracaLocation,
      ...this.locationPayload(data.publicInfo as any),
      sede_direccion: data.headquarters.address,
      sede_codigo_postal: data.headquarters.postalCode,
      sede_poblacion: data.headquarters.city,
      sede_provincia: data.headquarters.province,
      sede_latitud: data.headquarters.latitud, sede_longitud: data.headquarters.longitud,
      ...(data.publicInfo.foundationYear ? { anyo_fundacion: Number(data.publicInfo.foundationYear) } : {})
    } as Asociacion;
  }

  private saveErrorMessage(response: any): string {
    const error = response?.error ?? response;
    return error?.status?.message
      || error?.message
      || response?.status?.message
      || 'No se han podido guardar los datos de la asociación. Revisa los campos e inténtalo de nuevo.';
  }

  private mapAddressParts(asociacion: Asociacion): { address: string; postalCode: string; city: string; province: string } {
    const rawAddress = asociacion.address ?? asociacion.direccion ?? '';
    const explicitAddress = String(rawAddress).trim();
    const explicitPostalCode = String(asociacion.codigo_postal ?? asociacion.codigoPostal ?? asociacion.cp ?? '').trim();
    const explicitCity = String(asociacion.city ?? asociacion.poblacion ?? asociacion.localidad ?? '').trim();
    const explicitProvince = String(asociacion.state ?? asociacion.provincia ?? '').trim();
    const parsed = this.parseCompoundAddress(explicitAddress);

    if (explicitPostalCode || explicitCity || explicitProvince) {
      return {
        address: parsed.postalCode ? parsed.address : explicitAddress,
        postalCode: explicitPostalCode || parsed.postalCode,
        city: explicitCity || parsed.city,
        province: explicitProvince
      };
    }

    return {
      address: parsed.address,
      postalCode: parsed.postalCode,
      city: parsed.city,
      province: explicitProvince
    };
  }

  private parseCompoundAddress(value: string): { address: string; postalCode: string; city: string } {
    const parts = value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length < 3) {
      return { address: value, postalCode: '', city: '' };
    }

    const postalIndex = parts.findIndex(part => /^\d{5}$/.test(part));
    if (postalIndex < 0) {
      return { address: value, postalCode: '', city: '' };
    }

    const cityIndex = postalIndex === 0 ? 1 : postalIndex - 1;
    const addressParts = parts.filter((_, index) => index !== postalIndex && index !== cityIndex);

    return {
      address: addressParts.join(', '),
      postalCode: parts[postalIndex],
      city: parts[cityIndex] ?? ''
    };
  }

  private emptyAssociation(): AssociationData {
    return {
      basic: { name: '', cif: '', tag: '', address: '', postalCode: '', city: '', province: '', latitud: null, longitud: null },
      publicInfo: { foundationYear: '', hymn: '', motto: '', monumentLocation: '', gateLocation: '', childMonumentLocation: '', racoLocation: '', barracaLocation: '' },
      headquarters: { address: '', postalCode: '', city: '', province: '', latitud: null, longitud: null },
      contact: { email: '', phone: '' }
    };
  }

  private locationPayload(publicInfo: any): Record<string, unknown> { const keys=['ubicacion_monumento','ubicacion_foguera_infantil','ubicacion_raco','ubicacion_portada','ubicacion_barraca']; return Object.fromEntries(keys.flatMap(key=>['codigo_postal','localidad','provincia','latitud','longitud'].map(suffix=>[`${key}_${suffix}`,publicInfo[`${key}_${suffix}`] ?? null]))); }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertButtonType, FfsjDialogAlertService } from 'ffsj-web-components';
import { forkJoin } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { RegistroPendiente, SolicitudSecretaria, SolicitudTipo } from '../core/models';
import { SecretariaService } from '../core/secretaria.service';
import { Asociado, AsociadosService } from './asociados.service';

type GestionTab = 'altas' | 'modificaciones' | 'bajas' | 'solicitudes';

@Component({
  selector: 'app-asociados-gestion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './asociados-gestion.component.html',
  styleUrls: ['./asociados-gestion.component.scss']
})
export class AsociadosGestionComponent implements OnInit {
  activeTab: GestionTab = 'altas';

  adultos: Asociado[] = [];
  infantiles: Asociado[] = [];

  registroPendiente: RegistroPendiente[] = [];
  solicitudes: SolicitudSecretaria[] = [];
  solicitudDetalle: SolicitudSecretaria | null = null;

  seleccionBaja = new Set<number>();
  seleccionRegistro = new Set<number>();
  mostrarFormMod = false;
  loading = false;
  pendingViewTipo: SolicitudTipo | null = null;

  modoFormulario: 'alta' | 'modificacion' = 'alta';
  asociadoEnEdicion: Asociado | null = null;

  readonly tipoOpciones = ['Hoguera adulta', 'Hoguera infantil'];

  altaForm = this.fb.group({
    tipo: ['Hoguera adulta', Validators.required],
    dni: ['', Validators.required],
    sip: [''],
    nacimiento: [''],
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    direccion: [''],
    cp: [''],
    localidad: [''],
    provincia: [''],
    telefono: [''],
    email: ['', [Validators.email]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly censoService: CensoService,
    private readonly asociadosService: AsociadosService,
    private readonly secretariaService: SecretariaService,
    private readonly dialog: FfsjDialogAlertService
  ) {}

  ngOnInit(): void {
    this.asociadosService.getAdultos().subscribe(ad => (this.adultos = ad));
    this.asociadosService.getInfantiles().subscribe(kids => (this.infantiles = kids));
    this.cargarRegistroPendiente();
    this.cargarSolicitudes();
  }

  get asociacionId(): number {
    return this.censoService.asociacionId;
  }

  get registrosSeleccionados(): RegistroPendiente[] {
    return this.registroPendiente.filter(item => this.seleccionRegistro.has(item.id));
  }

  get tipoSeleccionado(): SolicitudTipo | null {
    const tipos = new Set(this.registrosSeleccionados.map(item => item.tipo));
    return tipos.size === 1 ? [...tipos][0] : null;
  }

  get seleccionRegistroValida(): boolean {
    return this.registrosSeleccionados.length > 0 && this.tipoSeleccionado !== null;
  }

  setTab(tab: GestionTab): void {
    this.activeTab = tab;
    this.pendingViewTipo = null;
    this.resetFormulario();
    this.modoFormulario = tab === 'modificaciones' ? 'modificacion' : 'alta';
    this.asociadoEnEdicion = null;
    this.seleccionBaja.clear();
    this.mostrarFormMod = tab === 'altas';

    if (tab === 'solicitudes') {
      this.cargarSolicitudes();
    } else {
      this.cargarRegistroPendiente();
    }
  }

  abrirPendientes(tipo: SolicitudTipo): void {
    this.pendingViewTipo = tipo;
    this.seleccionRegistro.clear();
    this.cargarRegistroPendiente();
  }

  volverDesdePendientes(): void {
    this.pendingViewTipo = null;
    this.seleccionRegistro.clear();
  }

  estaViendoPendientes(tipo: SolicitudTipo): boolean {
    return this.pendingViewTipo === tipo;
  }

  iniciarModificacion(asociado: Asociado): void {
    const ref = this.dialog.openDialogAlert({
      title: 'Modificar asociado',
      content: `Deseas modificar el asociado ${asociado.nombre} ${asociado.apellidos}?`,
      innerHtml: `<p>Deseas modificar el asociado <strong>${asociado.nombre} ${asociado.apellidos}</strong>?</p>`,
      buttonsAlert: [AlertButtonType.Cancelar, AlertButtonType.Aceptar]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result !== AlertButtonType.Aceptar) return;
      this.activeTab = 'modificaciones';
      this.modoFormulario = 'modificacion';
      this.asociadoEnEdicion = asociado;
      this.mostrarFormMod = true;
      this.altaForm.patchValue({
        tipo: asociado.tipo === 'adulto' ? 'Hoguera adulta' : 'Hoguera infantil',
        dni: asociado.dni ?? String(asociado.id),
        sip: asociado.sip ?? '',
        nacimiento: '',
        nombre: asociado.nombre,
        apellidos: asociado.apellidos,
        direccion: '',
        cp: '',
        localidad: '',
        provincia: '',
        telefono: asociado.telefono ?? '',
        email: asociado.email ?? ''
      });
    });
  }

  guardarRegistroAltaOCambio(): void {
    if (this.altaForm.invalid) {
      this.altaForm.markAllAsTouched();
      return;
    }

    const tipo: SolicitudTipo = this.modoFormulario === 'alta' ? 'alta' : 'cambio';
    const datos = { ...this.altaForm.value, tipoHoguera: this.altaForm.value.tipo };
    const datosOriginales = this.asociadoEnEdicion ? { ...this.asociadoEnEdicion } : null;

    this.loading = true;
    this.secretariaService
      .crearRegistroPendiente({
        asociacionId: this.asociacionId,
        tipo,
        asociadoId: this.asociadoEnEdicion?.id ?? null,
        datos,
        datosOriginales,
        observaciones: null
      })
      .subscribe({
        next: item => {
          this.registroPendiente.unshift(item);
          this.loading = false;
          this.resetFormulario();
          this.asociadoEnEdicion = null;
          this.mostrarFormMod = this.activeTab === 'altas';
          this.dialog.openDialogAlert({
            title: tipo === 'alta' ? 'Alta pendiente' : 'Cambio pendiente',
            content: 'Se ha añadido al registro pendiente.',
            innerHtml: '<p>Se ha añadido al registro pendiente.</p>',
            buttonsAlert: [AlertButtonType.Entendido]
          });
        },
        error: () => {
          this.loading = false;
          this.showError('No se ha podido añadir al registro pendiente.');
        }
      });
  }

  toggleSeleccionBaja(asociado: Asociado): void {
    if (this.seleccionBaja.has(asociado.id)) {
      this.seleccionBaja.delete(asociado.id);
    } else {
      this.seleccionBaja.add(asociado.id);
    }
  }

  guardarBajasPendientes(): void {
    if (this.seleccionBaja.size === 0) return;
    const seleccionados = [...this.seleccionBaja].map(id => this.buscarAsociado(id)).filter(Boolean) as Asociado[];
    const listado = seleccionados.map(a => `<li>${a.nombre} ${a.apellidos}</li>`).join('');
    const ref = this.dialog.openDialogAlert({
      title: 'Confirmar bajas',
      content: `Desea añadir al registro pendiente las bajas seleccionadas?`,
      innerHtml: `<p>Desea añadir al registro pendiente las bajas seleccionadas?</p><ul>${listado}</ul>`,
      buttonsAlert: [AlertButtonType.Cancelar, AlertButtonType.Aceptar]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result !== AlertButtonType.Aceptar) return;

      this.loading = true;
      forkJoin(
        seleccionados.map(asociado =>
          this.secretariaService.crearRegistroPendiente({
            asociacionId: this.asociacionId,
            tipo: 'baja',
            asociadoId: asociado.id,
            datos: { asociadoId: asociado.id, nombre: asociado.nombre, apellidos: asociado.apellidos },
            datosOriginales: { ...asociado },
            observaciones: null
          })
        )
      ).subscribe({
        next: items => {
          this.registroPendiente.unshift(...items);
          this.seleccionBaja.clear();
          this.loading = false;
          this.dialog.openDialogAlert({
            title: 'Bajas pendientes',
            content: 'Las bajas se han añadido al registro pendiente.',
            innerHtml: '<p>Las bajas se han añadido al registro pendiente.</p>',
            buttonsAlert: [AlertButtonType.Entendido]
          });
        },
        error: () => {
          this.loading = false;
          this.showError('No se han podido añadir las bajas al registro pendiente.');
        }
      });
    });
  }

  toggleRegistro(item: RegistroPendiente): void {
    const selectedTypes = new Set(this.registrosSeleccionados.map(registro => registro.tipo));
    if (!this.seleccionRegistro.has(item.id) && selectedTypes.size > 0 && !selectedTypes.has(item.tipo)) {
      this.seleccionRegistro.clear();
    }

    if (this.seleccionRegistro.has(item.id)) {
      this.seleccionRegistro.delete(item.id);
    } else {
      this.seleccionRegistro.add(item.id);
    }
  }

  crearSolicitudSeleccionada(tipo: SolicitudTipo): void {
    const ids = this.registroPendiente
      .filter(item => item.tipo === tipo && this.seleccionRegistro.has(item.id))
      .map(item => item.id);

    if (!ids.length) {
      this.showError('Selecciona uno o varios items pendientes.');
      return;
    }

    this.loading = true;
    this.secretariaService
      .crearSolicitud({
        asociacionId: this.asociacionId,
        tipo,
        registroPendienteIds: ids
      })
      .subscribe({
        next: solicitud => {
          const selectedIds = new Set(ids);
          this.registroPendiente = this.registroPendiente.filter(item => !selectedIds.has(item.id));
          this.seleccionRegistro.clear();
          this.solicitudes.unshift(solicitud);
          this.loading = false;
          this.dialog.openDialogAlert({
            title: 'Solicitud registrada',
            content: `Se ha creado la solicitud ${solicitud.numero}.`,
            innerHtml: `<p>Se ha creado la solicitud <strong>${solicitud.numero}</strong>.</p>`,
            buttonsAlert: [AlertButtonType.Entendido]
          });
        },
        error: () => {
          this.loading = false;
          this.showError('No se ha podido crear la solicitud.');
        }
      });
  }

  verSolicitud(solicitud: SolicitudSecretaria): void {
    this.loading = true;
    this.secretariaService.getSolicitud(solicitud.id).subscribe({
      next: detalle => {
        this.solicitudDetalle = detalle;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showError('No se ha podido cargar la solicitud.');
      }
    });
  }

  cargarRegistroPendiente(): void {
    this.secretariaService.getRegistroPendiente(this.asociacionId).subscribe({
      next: response => {
        this.registroPendiente = response.items;
        this.seleccionRegistro.clear();
      },
      error: () => this.showError('No se ha podido cargar el registro pendiente.')
    });
  }

  cargarSolicitudes(): void {
    this.secretariaService.getSolicitudes(this.asociacionId).subscribe({
      next: response => (this.solicitudes = response.solicitudes),
      error: () => this.showError('No se han podido cargar las solicitudes.')
    });
  }

  labelTipo(tipo: SolicitudTipo | string): string {
    return tipo === 'alta' ? 'Alta' : tipo === 'cambio' ? 'Cambio' : 'Baja';
  }

  tipoClass(tipo: SolicitudTipo | string): string {
    return `tipo-${tipo}`;
  }

  pendientesPorTipo(tipo: SolicitudTipo): RegistroPendiente[] {
    return this.registroPendiente.filter(item => item.tipo === tipo);
  }

  totalPendientes(tipo: SolicitudTipo): number {
    return this.pendientesPorTipo(tipo).length;
  }

  seleccionadosPorTipo(tipo: SolicitudTipo): RegistroPendiente[] {
    return this.pendientesPorTipo(tipo).filter(item => this.seleccionRegistro.has(item.id));
  }

  resumenItem(item: RegistroPendiente | { datos: Record<string, any> }): string {
    const datos = item.datos || {};
    return [datos.nombre, datos.apellidos].filter(Boolean).join(' ') || `Asociado ${datos.asociadoId ?? ''}`.trim();
  }

  public resetFormulario(): void {
    this.altaForm.reset({
      tipo: 'Hoguera adulta',
      dni: '',
      sip: '',
      nacimiento: '',
      nombre: '',
      apellidos: '',
      direccion: '',
      cp: '',
      localidad: '',
      provincia: '',
      telefono: '',
      email: ''
    });
  }

  private buscarAsociado(id: number): Asociado | undefined {
    return [...this.adultos, ...this.infantiles].find(a => a.id === id);
  }

  private showError(message: string): void {
    this.dialog.openDialogAlert({
      title: 'Error',
      content: message,
      innerHtml: `<p>${message}</p>`,
      buttonsAlert: [AlertButtonType.Entendido]
    });
  }
}

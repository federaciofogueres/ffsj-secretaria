import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertButtonType, FfsjDialogAlertService } from 'ffsj-web-components';
import { forkJoin } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { RegistroPendiente, SolicitudSecretaria, SolicitudTipo } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { Asociado, AsociadosService } from './asociados.service';

type GestionTab = 'altas' | 'modificaciones' | 'bajas' | 'solicitudes';
type AsociadoGrupo = 'adultos' | 'infantiles';
type ListadoContexto = 'modificaciones' | 'bajas';

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
  readonly pageSize = 10;
  filtrosListado: Record<ListadoContexto, Record<AsociadoGrupo, string>> = {
    modificaciones: { adultos: '', infantiles: '' },
    bajas: { adultos: '', infantiles: '' }
  };
  paginasListado: Record<ListadoContexto, Record<AsociadoGrupo, number>> = {
    modificaciones: { adultos: 0, infantiles: 0 },
    bajas: { adultos: 0, infantiles: 0 }
  };

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
    private readonly dialog: FfsjDialogAlertService,
    readonly permissions: PermissionsService
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
    if (this.estadoPendienteAsociado(asociado)) {
      return;
    }

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
        nacimiento: asociado.fechaNacimiento ?? '',
        nombre: asociado.nombre,
        apellidos: asociado.apellidos,
        direccion: asociado.direccion ?? '',
        cp: asociado.codigoPostal ?? asociado.codigo_postal ?? asociado.cp ?? '',
        localidad: '',
        provincia: '',
        telefono: asociado.telefono ?? '',
        email: asociado.email ?? ''
      });
    });
  }

  guardarRegistroAltaOCambio(): void {
    if (!this.permissions.hasPermission('solicitudes:write')) {
      this.showError('No tienes permiso para crear registros pendientes.');
      return;
    }
    if (this.altaForm.invalid) {
      this.altaForm.markAllAsTouched();
      return;
    }

    const tipo: SolicitudTipo = this.modoFormulario === 'alta' ? 'alta' : 'cambio';
    const datos = { ...this.altaForm.value, tipoHoguera: this.altaForm.value.tipo };
    const datosOriginales = this.asociadoEnEdicion ? { ...this.asociadoEnEdicion } : null;

    if (this.tieneDuplicadoPendiente(tipo, this.asociadoEnEdicion?.id ?? null, datos)) {
      this.showError('Ya existe un registro pendiente para este tramite.');
      return;
    }

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
    if (this.estadoPendienteAsociado(asociado)) {
      return;
    }

    if (this.seleccionBaja.has(asociado.id)) {
      this.seleccionBaja.delete(asociado.id);
    } else {
      this.seleccionBaja.add(asociado.id);
    }
  }

  guardarBajasPendientes(): void {
    if (!this.permissions.hasPermission('solicitudes:write')) {
      this.showError('No tienes permiso para crear registros pendientes.');
      return;
    }
    if (this.seleccionBaja.size === 0) return;
    const seleccionados = [...this.seleccionBaja].map(id => this.buscarAsociado(id)).filter(Boolean) as Asociado[];
    const duplicados = seleccionados.filter(asociado => this.tieneDuplicadoPendiente('baja', asociado.id));
    if (duplicados.length > 0) {
      this.showError(`Ya existe una baja pendiente para: ${duplicados.map(a => `${a.nombre} ${a.apellidos}`).join(', ')}.`);
      return;
    }
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
    if (!this.permissions.hasPermission('solicitudes:write')) {
      this.showError('No tienes permiso para crear solicitudes.');
      return;
    }
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
          this.solicitudDetalle = solicitud;
          this.activeTab = 'solicitudes';
          this.pendingViewTipo = null;
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

  enviarSolicitud(solicitud: SolicitudSecretaria): void {
    this.cambiarEstadoSolicitud(
      solicitud,
      () => this.secretariaService.enviarSolicitud(solicitud.id),
      'No se ha podido enviar la solicitud.'
    );
  }

  cancelarEnvioSolicitud(solicitud: SolicitudSecretaria): void {
    this.cambiarEstadoSolicitud(
      solicitud,
      () => this.secretariaService.cancelarEnvioSolicitud(solicitud.id),
      'No se ha podido cancelar el envio.'
    );
  }

  cancelarSolicitud(solicitud: SolicitudSecretaria): void {
    const ref = this.dialog.openDialogAlert({
      title: 'Cancelar solicitud',
      content: `Deseas cancelar la solicitud ${solicitud.numero}?`,
      innerHtml: `<p>Deseas cancelar la solicitud <strong>${solicitud.numero}</strong>?</p>`,
      buttonsAlert: [AlertButtonType.Cancelar, AlertButtonType.Aceptar]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result !== AlertButtonType.Aceptar) return;
      this.cambiarEstadoSolicitud(
        solicitud,
        () => this.secretariaService.cancelarSolicitud(solicitud.id),
        'No se ha podido cancelar la solicitud.',
        true
      );
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
      next: response => {
        this.solicitudes = response.solicitudes;
        this.cargarDetalleSolicitudesBloqueantes(response.solicitudes);
      },
      error: () => this.showError('No se han podido cargar las solicitudes.')
    });
  }

  puedeEnviarSolicitud(solicitud: SolicitudSecretaria): boolean {
    return solicitud.estado === 'registrada' && this.permissions.hasPermission('solicitudes:send');
  }

  puedeCancelarEnvio(solicitud: SolicitudSecretaria): boolean {
    return ['enviada', 'en_revision', 'con_incidencias'].includes(solicitud.estado) && this.permissions.hasPermission('solicitudes:send');
  }

  puedeCancelarSolicitud(solicitud: SolicitudSecretaria): boolean {
    return solicitud.estado === 'registrada' && this.permissions.hasPermission('solicitudes:write');
  }

  labelTipo(tipo: SolicitudTipo | string): string {
    return tipo === 'alta' ? 'Alta' : tipo === 'cambio' ? 'Cambio' : 'Baja';
  }

  tipoClass(tipo: SolicitudTipo | string): string {
    return `tipo-${tipo}`;
  }

  labelEstado(estado: string): string {
    const labels: Record<string, string> = {
      registrada: 'Registrada',
      enviada: 'Enviada',
      en_revision: 'En revision',
      con_incidencias: 'Con incidencias',
      validada: 'Validada',
      rechazada: 'Rechazada',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada'
    };
    return labels[estado] ?? estado;
  }

  estadoClass(estado: string): string {
    return `estado-${estado.replace('_', '-')}`;
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

  asociadoBloqueado(asociado: Asociado): boolean {
    return this.estadoPendienteAsociado(asociado) !== null;
  }

  estadoPendienteAsociado(asociado: Asociado): 'cambio' | 'baja' | null {
    const tieneBaja = this.tieneDuplicadoPendiente('baja', asociado.id) || this.tieneSolicitudAbierta('baja', asociado.id);
    if (tieneBaja) {
      return 'baja';
    }

    const tieneCambio = this.tieneDuplicadoPendiente('cambio', asociado.id) || this.tieneSolicitudAbierta('cambio', asociado.id);
    return tieneCambio ? 'cambio' : null;
  }

  etiquetaPendienteAsociado(asociado: Asociado): string {
    const estado = this.estadoPendienteAsociado(asociado);
    return estado === 'baja' ? 'Baja pendiente' : estado === 'cambio' ? 'Cambio pendiente' : '';
  }

  descartarRegistro(item: RegistroPendiente): void {
    if (!this.permissions.hasPermission('solicitudes:write')) {
      this.showError('No tienes permiso para descartar registros pendientes.');
      return;
    }

    const ref = this.dialog.openDialogAlert({
      title: 'Descartar registro',
      content: `Deseas descartar ${this.resumenItem(item)}?`,
      innerHtml: `<p>Deseas descartar <strong>${this.resumenItem(item)}</strong>?</p>`,
      buttonsAlert: [AlertButtonType.Cancelar, AlertButtonType.Aceptar]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result !== AlertButtonType.Aceptar) return;

      this.loading = true;
      this.secretariaService.descartarRegistroPendiente(item.id, this.asociacionId).subscribe({
        next: () => {
          this.registroPendiente = this.registroPendiente.filter(registro => registro.id !== item.id);
          this.seleccionRegistro.delete(item.id);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.showError('No se ha podido descartar el registro pendiente.');
        }
      });
    });
  }

  resumenItem(item: RegistroPendiente | { datos: Record<string, any> }): string {
    const datos = item.datos || {};
    return [datos.nombre, datos.apellidos].filter(Boolean).join(' ') || `Asociado ${datos.asociadoId ?? ''}`.trim();
  }

  detalleItem(item: RegistroPendiente | { datos: Record<string, any>; datosOriginales?: Record<string, any> | null }): string[] {
    const datos = item.datos || {};

    if ('tipo' in item && item.tipo === 'cambio') {
      return this.diferenciasItem(item as RegistroPendiente);
    }

    return [
      datos.dni ? `DNI/NIE: ${datos.dni}` : '',
      datos.sip ? `SIP: ${datos.sip}` : '',
      datos.telefono ? `Telefono: ${datos.telefono}` : '',
      datos.email ? `Email: ${datos.email}` : '',
    ].filter(Boolean);
  }

  diferenciasItem(item: RegistroPendiente): string[] {
    const datos = item.datos || {};
    const originales = item.datosOriginales || {};
    const campos: Array<[string, string, string]> = [
      ['nombre', 'Nombre', 'nombre'],
      ['apellidos', 'Apellidos', 'apellidos'],
      ['dni', 'DNI/NIE', 'dni'],
      ['sip', 'SIP', 'sip'],
      ['telefono', 'Telefono', 'telefono'],
      ['email', 'Email', 'email']
    ];

    return campos
      .map(([key, label, originalKey]) => {
        const nuevo = String(datos[key] ?? '').trim();
        const anterior = String(originales[originalKey] ?? '').trim();
        return nuevo !== anterior ? `${label}: ${anterior || '-'} -> ${nuevo || '-'}` : '';
      })
      .filter(Boolean);
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

  asociadosPagina(contexto: ListadoContexto, grupo: AsociadoGrupo): Asociado[] {
    const start = this.paginasListado[contexto][grupo] * this.pageSize;
    return this.asociadosFiltrados(contexto, grupo).slice(start, start + this.pageSize);
  }

  totalPaginas(contexto: ListadoContexto, grupo: AsociadoGrupo): number {
    return Math.max(1, Math.ceil(this.asociadosFiltrados(contexto, grupo).length / this.pageSize));
  }

  cambiarPagina(contexto: ListadoContexto, grupo: AsociadoGrupo, delta: number): void {
    const total = this.totalPaginas(contexto, grupo);
    const nextPage = this.paginasListado[contexto][grupo] + delta;
    this.paginasListado[contexto][grupo] = Math.min(Math.max(nextPage, 0), total - 1);
  }

  actualizarFiltro(contexto: ListadoContexto, grupo: AsociadoGrupo, event: Event): void {
    this.filtrosListado[contexto][grupo] = (event.target as HTMLInputElement).value ?? '';
    this.paginasListado[contexto][grupo] = 0;
  }

  private asociadosFiltrados(contexto: ListadoContexto, grupo: AsociadoGrupo): Asociado[] {
    const source = grupo === 'adultos' ? this.adultos : this.infantiles;
    const filter = this.normalizeText(this.filtrosListado[contexto][grupo]);

    return source
      .filter(asociado => !filter || this.normalizeText([
        asociado.id,
        asociado.nombre,
        asociado.apellidos,
        asociado.cargo,
        asociado.dni,
        asociado.telefono,
        asociado.email
      ].join(' ')).includes(filter))
      .slice()
      .sort((a, b) =>
        this.normalizeText(`${a.nombre} ${a.apellidos}`).localeCompare(
          this.normalizeText(`${b.nombre} ${b.apellidos}`),
          'es',
          { sensitivity: 'base' }
        )
      );
  }

  private buscarAsociado(id: number): Asociado | undefined {
    return [...this.adultos, ...this.infantiles].find(a => a.id === id);
  }

  private cambiarEstadoSolicitud(
    solicitud: SolicitudSecretaria,
    action: () => any,
    errorMessage: string,
    removeFromList = false
  ): void {
    this.loading = true;
    action().subscribe({
      next: (updated: SolicitudSecretaria) => {
        this.loading = false;
        if (removeFromList) {
          this.solicitudes = this.solicitudes.filter(item => item.id !== solicitud.id);
          this.solicitudDetalle = null;
          this.cargarRegistroPendiente();
          return;
        }

        this.solicitudes = this.solicitudes.map(item => (item.id === updated.id ? updated : item));
        this.solicitudDetalle = updated;
      },
      error: () => {
        this.loading = false;
        this.showError(errorMessage);
      }
    });
  }

  private tieneDuplicadoPendiente(
    tipo: SolicitudTipo,
    asociadoId: number | null,
    datos: Record<string, any> = {}
  ): boolean {
    return this.registroPendiente.some(item => {
      if (item.tipo !== tipo || item.estado !== 'pendiente') {
        return false;
      }

      if (asociadoId) {
        return Number(item.asociadoId ?? item.datos?.asociadoId) === asociadoId;
      }

      if (tipo === 'alta' && datos['dni']) {
        return String(item.datos?.['dni'] ?? '').trim().toLowerCase() === String(datos['dni']).trim().toLowerCase();
      }

      return false;
    });
  }

  private tieneSolicitudAbierta(tipo: SolicitudTipo, asociadoId: number): boolean {
    if (!['cambio', 'baja'].includes(tipo)) {
      return false;
    }

    return this.solicitudes.some(solicitud => {
      if (solicitud.tipo !== tipo || solicitud.estado === 'finalizada') {
        return false;
      }

      return (solicitud.items || []).some(item => Number(item.datos?.asociadoId ?? item.datosOriginales?.['id']) === asociadoId);
    });
  }

  private cargarDetalleSolicitudesBloqueantes(solicitudes: SolicitudSecretaria[]): void {
    const abiertasSinDetalle = solicitudes.filter(
      solicitud => ['cambio', 'baja'].includes(solicitud.tipo) && solicitud.estado !== 'finalizada' && !solicitud.items?.length
    );

    if (!abiertasSinDetalle.length) {
      return;
    }

    forkJoin(abiertasSinDetalle.map(solicitud => this.secretariaService.getSolicitud(solicitud.id))).subscribe({
      next: detalles => {
        const detallesById = new Map(detalles.map(detalle => [detalle.id, detalle]));
        this.solicitudes = this.solicitudes.map(solicitud => detallesById.get(solicitud.id) ?? solicitud);
      },
      error: () => undefined
    });
  }

  private showError(message: string): void {
    this.dialog.openDialogAlert({
      title: 'Error',
      content: message,
      innerHtml: `<p>${message}</p>`,
      buttonsAlert: [AlertButtonType.Entendido]
    });
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlertButtonType, FfsjDialogAlertService } from 'ffsj-web-components';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { CensoService } from '../core/censo.service';
import { AdjuntoSecretaria, AutorizacionAlta, CargoCupoSecretaria, CargoResumen, HistoricoAsociado, RegistroPendiente, SolicitudSecretaria, SolicitudTipo } from '../core/models';
import { PermissionsService } from '../core/permissions.service';
import { SecretariaService } from '../core/secretaria.service';
import { EjercicioService } from '../core/ejercicio.service';
import { IncidenciasPanelComponent } from '../shared/incidencias-panel.component';
import { Asociado, AsociadosService } from './asociados.service';

type GestionTab = 'altas' | 'modificaciones' | 'bajas' | 'solicitudes' | 'cupos';
type AsociadoGrupo = 'adultos' | 'infantiles';
type PestanaSolicitudAsociacion = 'resumen' | 'cambios' | 'incidencias' | 'adjuntos' | 'historial';

function fechaNacimientoValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim();
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= fechaHoyLocal()
    ? null : { fechaNacimientoInvalida: true };
}

function fechaHoyLocal(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
type ListadoContexto = 'modificaciones' | 'bajas';

interface SustitucionCargoRequerido {
  asociado: Asociado;
  cargo: HistoricoAsociado;
  sustitutoId: number | null;
}

interface ModificacionPendienteConSustitucion {
  asociado: Asociado;
  datos: Record<string, any>;
  datosOriginales: Record<string, any> | null;
}

interface ConflictoCargoExclusivo {
  cargo: CargoResumen;
  titular: Asociado;
}

@Component({
  selector: 'app-asociados-gestion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, IncidenciasPanelComponent],
  templateUrl: './asociados-gestion.component.html',
  styleUrls: ['./asociados-gestion.component.scss']
})
export class AsociadosGestionComponent implements OnInit {
  activeTab: GestionTab = 'altas';

  adultos: Asociado[] = [];
  infantiles: Asociado[] = [];
  cargos: CargoResumen[] = [];
  cuposCargos: CargoCupoSecretaria[] = [];
  errorCupos = '';

  registroPendiente: RegistroPendiente[] = [];
  solicitudes: SolicitudSecretaria[] = [];
  solicitudDetalle: SolicitudSecretaria | null = null;
  filtroSolicitudes: 'incidencias' | null = null;
  busquedaSolicitudes = '';
  tipoSolicitudFiltro = 'todos';
  estadoSolicitudFiltro = 'todos';
  ordenSolicitudes: 'fecha_desc' | 'fecha_asc' | 'estado' = 'fecha_desc';
  paginaSolicitudes = 1;
  tamanoPaginaSolicitudes = 10;
  totalSolicitudes = 0;
  totalPaginasSolicitudes = 1;
  detalleSolicitudDialogOpen = false;
  pestanaSolicitud: PestanaSolicitudAsociacion = 'resumen';
  readonly pestanasSolicitud: Array<{ id: PestanaSolicitudAsociacion; label: string }> = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'cambios', label: 'Cambios' },
    { id: 'incidencias', label: 'Incidencias' },
    { id: 'adjuntos', label: 'Adjuntos' },
    { id: 'historial', label: 'Historial' }
  ];

  seleccionBaja = new Set<number>();
  seleccionRegistro = new Set<number>();
  mostrarFormMod = false;
  loading = false;
  pendingViewTipo: SolicitudTipo | null = null;
  sustitucionesDialogOpen = false;
  sustitucionesCargo: SustitucionCargoRequerido[] = [];
  bajasPendientesSustitucion: Asociado[] = [];
  sustitucionOrigen: 'baja' | 'modificacion' = 'baja';
  modificacionPendienteConSustitucion: ModificacionPendienteConSustitucion | null = null;
  cargosSeleccionadosIds = new Set<number>();
  comprobandoDocumentoAlta = false;
  altaExistenteAsociado: Asociado | null = null;
  altaAsociacionesAnteriores: Array<{ id: number; nombre?: string | null }> = [];
  solicitudFirmadaFiles: Record<number, File | null> = {};
  private ultimoDocumentoAltaConsultado = '';

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
    cargoId: [null as number | null],
    dni: ['', [Validators.required, Validators.pattern(/^(?:\d{8}|[XYZ]\d{7})[A-Za-z]$/)]],
    sip: ['', [Validators.maxLength(30)]],
    nacimiento: ['', [Validators.required, fechaNacimientoValidator]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(150)]],
    direccion: ['', Validators.maxLength(200)],
    cp: ['', Validators.pattern(/^\d{5}$/)],
    localidad: ['', Validators.maxLength(100)],
    provincia: ['', Validators.maxLength(100)],
    telefono: ['', Validators.pattern(/^[+0-9][0-9\s-]{7,19}$/)],
    email: ['', [Validators.email]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly censoService: CensoService,
    private readonly asociadosService: AsociadosService,
    private readonly secretariaService: SecretariaService,
    private readonly route: ActivatedRoute,
    private readonly dialog: FfsjDialogAlertService,
    readonly permissions: PermissionsService,
    readonly ejercicioService: EjercicioService
  ) {}

  ngOnInit(): void {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (this.isGestionTab(requestedTab)) {
      this.activeTab = requestedTab;
      this.mostrarFormMod = requestedTab === 'altas';
    }
    this.filtroSolicitudes = this.route.snapshot.queryParamMap.get('filtro') === 'incidencias' ? 'incidencias' : null;

    this.asociadosService.getAdultos().subscribe(ad => (this.adultos = ad));
    this.asociadosService.getInfantiles().subscribe(kids => (this.infantiles = kids));
    this.censoService.getCargos().subscribe(cargos => {
      this.cargos = cargos;
      this.actualizarCargoPorTipo();
    });
    this.cargarRegistroPendiente();
    this.cargarSolicitudes();
    this.cargarCupos();
  }

  get asociacionId(): number {
    return this.censoService.asociacionId;
  }

  cargarCupos(): void {
    const ejercicio = Number(this.ejercicioService.selectedSnapshot?.ejercicio || new Date().getFullYear());
    if (!this.asociacionId || !ejercicio) return;
    this.secretariaService.getCargosCupos(this.asociacionId, ejercicio).subscribe({
      next: response => {
        this.cuposCargos = response.cargos;
        this.errorCupos = '';
      },
      error: error => {
        this.cuposCargos = [];
        this.errorCupos = error?.error?.message || 'No se ha podido cargar el resumen de cupos.';
      }
    });
  }

  labelConflictoCupo(conflicto: string): string {
    return conflicto === 'obligatorio_sin_cubrir' ? 'Obligatorio sin cubrir' : conflicto === 'cupo_superado' ? 'Cupo superado' : conflicto;
  }

  get ejercicioActivoSeleccionado(): boolean {
    return this.ejercicioService.isSelectedActive;
  }

  get accionesBloqueadasPorEjercicio(): boolean {
    return !this.ejercicioActivoSeleccionado;
  }

  get mensajeEjercicioNoActivo(): string {
    const ejercicio = this.ejercicioService.selectedSnapshot?.ejercicio;
    return ejercicio
      ? `El ejercicio ${ejercicio} es solo de consulta. Selecciona el ejercicio activo para tramitar.`
      : 'Selecciona el ejercicio activo para tramitar.';
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

  get cargosFormulario(): CargoResumen[] {
    const infantil = this.altaForm.value.tipo === 'Hoguera infantil';
    return this.cargos
      .filter(cargo => Number(cargo.id) > 0)
      .filter(cargo => this.cargoActivo(cargo))
      .filter(cargo => this.cargoEsInfantil(cargo) === infantil)
      .sort((a, b) => this.normalizeText(a.nombre).localeCompare(this.normalizeText(b.nombre), 'es'));
  }

  get cargosSeleccionados(): CargoResumen[] {
    return [...this.cargosSeleccionadosIds]
      .map(id => this.cargos.find(cargo => Number(cargo.id) === Number(id)))
      .filter(Boolean) as CargoResumen[];
  }

  setTab(tab: GestionTab): void {
    this.activeTab = tab;
    this.filtroSolicitudes = null;
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
    if (this.asociadoBloqueado(asociado)) {
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
        cargoId: null,
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
      this.cargosSeleccionadosIds = new Set(asociado.cargoIds?.length ? asociado.cargoIds : [asociado.cargoId ?? this.getCargoIdPorNombre(asociado.cargo, asociado.tipo)].filter(Boolean) as number[]);
      this.precargarCargoActual(asociado);
    });
  }

  comprobarAltaExistentePorDocumento(): void {
    if (this.modoFormulario !== 'alta') {
      return;
    }

    const documento = this.getDocumentoAlta();
    if (!documento || documento === this.ultimoDocumentoAltaConsultado) {
      return;
    }

    this.ultimoDocumentoAltaConsultado = documento;
    this.comprobandoDocumentoAlta = true;
    this.censoService.getAsociadoByDocumento(documento).subscribe({
      next: asociado => {
        if (asociado) {
          this.comprobarHistoricoAsociadoParaAlta(asociado);
          return;
        }
        this.comprobandoDocumentoAlta = false;
      },
      error: (error: any) => {
        this.comprobandoDocumentoAlta = false;
        if (Number(error?.status) !== 404) {
          this.showError('No se ha podido comprobar si la persona existe en el censo.');
        }
      }
    });
  }

  guardarRegistroAltaOCambio(): void {
    if (!this.permissions.hasPermission('solicitudes:write')) {
      this.showError('No tienes permiso para crear registros pendientes.');
      return;
    }
    if (this.accionesBloqueadasPorEjercicio) {
      this.showError(this.mensajeEjercicioNoActivo);
      return;
    }
    if (this.altaForm.invalid) {
      this.altaForm.markAllAsTouched();
      this.showError(this.mensajeErrorFormulario());
      return;
    }
    if (!this.fechaNacimientoValida()) {
      this.altaForm.get('nacimiento')?.markAsTouched();
      this.showError('La fecha de nacimiento debe ser una fecha real y no puede ser futura.');
      return;
    }
    if (this.cargosSeleccionadosIds.size === 0) {
      this.showError('Selecciona al menos un cargo.');
      return;
    }

    const tipo: SolicitudTipo = this.modoFormulario === 'alta' ? 'alta' : 'cambio';
    const cargosSeleccionados = this.cargosSeleccionados;
    const cargoIds = cargosSeleccionados.map(cargo => Number(cargo.id));
    const cargoNombres = cargosSeleccionados.map(cargo => cargo.nombre);
    const datos = {
      ...this.altaForm.value,
      cargoId: cargoIds[0],
      cargoIds,
      cargoNombre: cargoNombres[0] || '',
      cargoNombres,
      tipoCambio: this.modoFormulario === 'modificacion' ? 'cargo' : undefined,
      tipoHoguera: this.altaForm.value.tipo
    };
    const datosOriginales = this.asociadoEnEdicion ? { ...this.asociadoEnEdicion } : null;

    if (this.tieneDuplicadoPendiente(tipo, this.asociadoEnEdicion?.id ?? null, datos)) {
      this.showError('Ya existe un cambio preparado para este tramite.');
      return;
    }

    if (tipo === 'alta' && this.altaExistenteAsociado && this.altaAsociacionesAnteriores.length > 0) {
      this.confirmarAltaConAutorizacionAnterior(datos, { ...this.altaExistenteAsociado });
      return;
    }

    if (this.modoFormulario === 'modificacion' && this.asociadoEnEdicion) {
      this.loading = true;
      this.detectarSustitucionesPorCambioCargo(this.asociadoEnEdicion, cargoIds).subscribe({
        next: sustituciones => {
          this.loading = false;
          if (sustituciones.length) {
            this.sustitucionOrigen = 'modificacion';
            this.modificacionPendienteConSustitucion = {
              asociado: this.asociadoEnEdicion as Asociado,
              datos,
              datosOriginales
            };
            this.bajasPendientesSustitucion = [this.asociadoEnEdicion as Asociado];
            this.sustitucionesCargo = sustituciones;
            this.sustitucionesDialogOpen = true;
            return;
          }

          this.crearRegistroAltaOCambioConConflictos(tipo, datos, datosOriginales, cargoIds);
        },
        error: () => {
          this.loading = false;
          this.showError('No se han podido comprobar los cargos obligatorios.');
        }
      });
      return;
    }

    this.crearRegistroAltaOCambioConConflictos(tipo, datos, datosOriginales, cargoIds);
  }

  private crearRegistroAltaOCambioConConflictos(
    tipo: SolicitudTipo,
    datos: Record<string, any>,
    datosOriginales: Record<string, any> | null,
    cargoIds: number[]
  ): void {
    const conflictos = this.getConflictosCargoExclusivo(cargoIds);
    if (!conflictos.length) {
      this.crearRegistroAltaOCambio(tipo, datos, datosOriginales);
      return;
    }

    this.confirmarCesionCargoObligatorio(tipo, datos, datosOriginales, conflictos);
  }

  private crearAltaConAutorizacionAnterior(datos: Record<string, any>, datosOriginales: Record<string, any> | null): void {
    if (!this.altaExistenteAsociado || !this.altaAsociacionesAnteriores.length) {
      this.crearRegistroAltaOCambioConConflictos('alta', datos, datosOriginales, this.cargosSeleccionados.map(cargo => Number(cargo.id)));
      return;
    }

    this.loading = true;
    this.secretariaService.crearAltaConAutorizacion({
      asociacionId: this.asociacionId,
      asociadoId: this.altaExistenteAsociado.id,
      datos: {
        ...datos,
        asociadoExistenteId: this.altaExistenteAsociado.id,
        requiereAutorizacionAsociacionAnterior: true
      },
      datosOriginales,
      asociacionesAnteriores: this.altaAsociacionesAnteriores
    }).subscribe({
      next: solicitud => {
        this.solicitudes.unshift(solicitud);
        this.solicitudDetalle = solicitud;
        this.resetFormulario();
        this.activeTab = 'solicitudes';
        this.mostrarFormMod = false;
        this.loading = false;
        this.dialog.openDialogAlert({
          title: 'Alta registrada',
          content: 'Se ha creado el alta y queda pendiente de firma por la asociacion anterior.',
          innerHtml: `
            <p>Se ha creado la solicitud <strong>${solicitud.numero}</strong>.</p>
            <p>Queda pendiente de autorizacion por la asociacion anterior. Cuando se firme, se enviara automaticamente a Secretaria.</p>
          `,
          buttonsAlert: [AlertButtonType.Entendido]
        });
      },
      error: error => {
        this.loading = false;
        if (!this.gestionarErrorAltaDuplicada(error)) {
          this.showError('No se ha podido crear el alta con autorizacion previa.');
        }
      }
    });
  }

  private confirmarAltaConAutorizacionAnterior(datos: Record<string, any>, datosOriginales: Record<string, any> | null): void {
    const ref = this.dialog.openDialogAlert({
      title: 'Autorizacion necesaria',
      content: 'Para validar el alta de esta persona sera necesaria la autorizacion de la asociacion a la que pertenecio anteriormente.',
      innerHtml: '<p>Para validar el alta de esta persona sera necesaria la autorizacion de la asociacion a la que pertenecio anteriormente.</p>',
      buttonsAlert: [AlertButtonType.Cancelar, AlertButtonType.Aceptar]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result !== AlertButtonType.Aceptar) {
        return;
      }
      this.crearAltaConAutorizacionAnterior(datos, datosOriginales);
    });
  }

  private confirmarCesionCargoObligatorio(
    tipo: SolicitudTipo,
    datos: Record<string, any>,
    datosOriginales: Record<string, any> | null,
    conflictos: ConflictoCargoExclusivo[]
  ): void {
    const conflicto = conflictos[0];
    const cargoNombre = conflicto.cargo.nombre;
    const titularNombre = `${conflicto.titular.nombre} ${conflicto.titular.apellidos}`.trim();
    const nuevoNombre = `${datos['nombre'] || ''} ${datos['apellidos'] || ''}`.trim();
    const extra = conflictos.length > 1
      ? `<p>Tambien se aplicaran ${conflictos.length - 1} cambio(s) de cargo obligatorio adicionales.</p>`
      : '';
    const ref = this.dialog.openDialogAlert({
      title: 'Cambiar cargo obligatorio',
      content: `Desea cambiar el cargo ${cargoNombre} de ${titularNombre} por el de ${nuevoNombre}?`,
      innerHtml: `
        <p>Desea cambiar el cargo <strong>${cargoNombre}</strong> de <strong>${titularNombre}</strong> por el de <strong>${nuevoNombre}</strong>?</p>
        <p>Con este cambio <strong>${titularNombre}</strong> dejara de tener el cargo <strong>${cargoNombre}</strong> y lo tendra <strong>${nuevoNombre}</strong>.</p>
        ${extra}
      `,
      buttonsAlert: [AlertButtonType.Cancelar, AlertButtonType.Aceptar]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result !== AlertButtonType.Aceptar) return;
      this.crearYEnviarSolicitudConCesionCargo(tipo, datos, datosOriginales, conflictos);
    });
  }

  private crearYEnviarSolicitudConCesionCargo(
    tipo: SolicitudTipo,
    datos: Record<string, any>,
    datosOriginales: Record<string, any> | null,
    conflictos: ConflictoCargoExclusivo[]
  ): void {
    const cargosCedidosPorTitular = conflictos.reduce<Map<number, ConflictoCargoExclusivo[]>>((acc, conflicto) => {
      const current = acc.get(conflicto.titular.id) || [];
      current.push(conflicto);
      acc.set(conflicto.titular.id, current);
      return acc;
    }, new Map<number, ConflictoCargoExclusivo[]>());
    const nuevoNombre = `${datos['nombre'] || ''} ${datos['apellidos'] || ''}`.trim();

    this.loading = true;
    const registroBase$ = this.secretariaService.crearRegistroPendiente({
      asociacionId: this.asociacionId,
      tipo,
      asociadoId: this.asociadoEnEdicion?.id ?? null,
      datos: {
        ...datos,
        cesionesCargo: conflictos.map(conflicto => ({
          cargoId: Number(conflicto.cargo.id),
          cargoNombre: conflicto.cargo.nombre,
          titularAnteriorId: conflicto.titular.id,
          titularAnteriorNombre: `${conflicto.titular.nombre} ${conflicto.titular.apellidos}`.trim()
        }))
      },
      datosOriginales,
      observaciones: 'Solicitud con cesion automatica de cargo obligatorio'
    });

    const registrosCesion$ = [...cargosCedidosPorTitular.entries()].map(([titularId, conflictosTitular]) => {
      const titular = conflictosTitular[0].titular;
      const cargosARetirar = new Set(conflictosTitular.map(conflicto => Number(conflicto.cargo.id)));
      let cargosRestantes = this.getCargoIdsAsociado(titular).filter(cargoId => !cargosARetirar.has(cargoId));
      if (!cargosRestantes.length) {
        cargosRestantes = [this.getDefaultCargoId(titular.tipo === 'infantil' ? 'Hoguera infantil' : 'Hoguera adulta')].filter(Boolean);
      }
      const cargoNombres = cargosRestantes.map(cargoId => this.cargos.find(cargo => Number(cargo.id) === cargoId)?.nombre || String(cargoId));
      return this.secretariaService.crearRegistroPendiente({
        asociacionId: this.asociacionId,
        tipo: 'cambio',
        asociadoId: titularId,
        datos: {
          asociadoId: titularId,
          nombre: titular.nombre,
          apellidos: titular.apellidos,
          tramiteOrigen: 'cesion_cargo_obligatorio',
          tipoCambio: 'cargo',
          cargoId: cargosRestantes[0],
          cargoIds: cargosRestantes,
          cargoNombre: cargoNombres[0] || '',
          cargoNombres,
          cedeCargoAId: this.asociadoEnEdicion?.id ?? null,
          cedeCargoANombre: nuevoNombre,
          cargosCedidos: conflictosTitular.map(conflicto => ({
            cargoId: Number(conflicto.cargo.id),
            cargoNombre: conflicto.cargo.nombre
          }))
        },
        datosOriginales: { ...titular },
        observaciones: 'Cesion de cargo obligatorio asociada a solicitud'
      });
    });

    forkJoin([registroBase$, ...registrosCesion$])
      .pipe(
        switchMap(items =>
          this.secretariaService.crearSolicitud({
            asociacionId: this.asociacionId,
            tipo,
            registroPendienteIds: items.map(item => item.id),
            observaciones: `Solicitud conjunta: ${tipo} y cesion de cargo obligatorio`
          })
        )
      )
      .subscribe({
        next: solicitud => {
          this.solicitudes.unshift(solicitud);
          this.solicitudDetalle = solicitud;
          this.resetFormulario();
          this.asociadoEnEdicion = null;
          this.mostrarFormMod = false;
          this.activeTab = 'solicitudes';
          this.loading = false;
          this.dialog.openDialogAlert({
            title: 'Solicitud creada',
            content: `Se ha creado la solicitud ${solicitud.numero}. Adjunta la solicitud firmada para enviarla a Secretaria.`,
            innerHtml: `<p>Se ha creado la solicitud <strong>${solicitud.numero}</strong> con la cesion de cargo indicada.</p><p>Adjunta la solicitud firmada desde el detalle antes de enviarla a Secretaria.</p>`,
            buttonsAlert: [AlertButtonType.Entendido]
          });
        },
        error: error => {
          this.loading = false;
          if (!this.gestionarErrorAltaDuplicada(error)) {
            this.showError('No se ha podido crear la solicitud con cesion de cargo.');
          }
        }
      });
  }

  private crearRegistroAltaOCambio(tipo: SolicitudTipo, datos: Record<string, any>, datosOriginales: Record<string, any> | null): void {
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
            content: 'Se ha anadido al borrador de solicitud.',
            innerHtml: '<p>Se ha anadido al borrador de solicitud.</p>',
            buttonsAlert: [AlertButtonType.Entendido]
          });
        },
        error: () => {
          this.loading = false;
          this.showError('No se ha podido anadir al borrador de solicitud.');
        }
      });
  }

  private getDocumentoAlta(): string {
    return String(this.altaForm.value.dni || this.altaForm.value.sip || '')
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  private comprobarHistoricoAsociadoParaAlta(asociado: Asociado): void {
    this.censoService.getHistoricoByAsociado(asociado.id).subscribe({
      next: historico => {
        this.comprobandoDocumentoAlta = false;
        const estaActivoEnEstaAsociacion = historico.some(item =>
          Number(item.idAsociacion) === Number(this.asociacionId) &&
          (item.active === true || item.active === 1 || String(item.active) === '1')
        );
        if (estaActivoEnEstaAsociacion) {
          this.altaExistenteAsociado = null;
          this.altaAsociacionesAnteriores = [];
          this.limpiarDocumentoAltaDuplicado();
          this.showError('Esta persona ya esta dada de alta en esta asociacion. No se puede crear un alta duplicada.');
          return;
        }
        this.cargarAsociadoExistenteEnAlta(asociado, historico);
      },
      error: () => {
        this.comprobandoDocumentoAlta = false;
        this.showError('No se ha podido consultar el historico de asociaciones de esta persona.');
      }
    });
  }

  private cargarAsociadoExistenteEnAlta(asociado: Asociado, historico: HistoricoAsociado[]): void {
    this.altaExistenteAsociado = asociado;
    this.altaAsociacionesAnteriores = [];
    const tipo = asociado.tipo === 'infantil' ? 'Hoguera infantil' : 'Hoguera adulta';
    this.altaForm.patchValue({
      tipo,
      dni: asociado.dni ?? this.altaForm.value.dni ?? '',
      sip: asociado.sip ?? this.altaForm.value.sip ?? '',
      nacimiento: asociado.fechaNacimiento ?? '',
      nombre: asociado.nombre,
      apellidos: asociado.apellidos,
      direccion: asociado.direccion ?? '',
      cp: asociado.codigoPostal ?? asociado.codigo_postal ?? asociado.cp ?? '',
      localidad: asociado.localidad ?? '',
      provincia: asociado.provincia ?? '',
      telefono: asociado.telefono ?? '',
      email: asociado.email ?? ''
    });
    this.actualizarCargoPorTipo();

    this.dialog.openDialogAlert({
      title: 'Persona encontrada',
      content: 'Esta persona ya esta dada de alta en el sistema, vamos a incorporar sus datos al formulario',
      innerHtml: '<p>Esta persona ya esta dada de alta en el sistema, vamos a incorporar sus datos al formulario.</p>',
      buttonsAlert: [AlertButtonType.Entendido]
    });

    const anteriores = new Map<number, { id: number; nombre?: string | null }>();
    historico
      .filter(item => Number(item.idAsociacion) > 0 && Number(item.idAsociacion) !== Number(this.asociacionId))
      .forEach(item => anteriores.set(Number(item.idAsociacion), {
        id: Number(item.idAsociacion),
        nombre: item.nombreAsociacion || null
      }));
    this.altaAsociacionesAnteriores = [...anteriores.values()];
  }

  private limpiarDocumentoAltaDuplicado(): void {
    this.altaForm.patchValue({ dni: '', sip: '' });
    this.ultimoDocumentoAltaConsultado = '';
  }

  toggleSeleccionBaja(asociado: Asociado): void {
    if (this.asociadoBloqueado(asociado)) {
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
    if (this.accionesBloqueadasPorEjercicio) {
      this.showError(this.mensajeEjercicioNoActivo);
      return;
    }
    if (this.seleccionBaja.size === 0) return;
    const seleccionados = [...this.seleccionBaja]
      .map(id => this.buscarAsociado(id))
      .filter(Boolean)
      .filter(asociado => !this.asociadoBloqueado(asociado as Asociado)) as Asociado[];
    if (seleccionados.length === 0) {
      this.seleccionBaja.clear();
      this.showError('No se pueden tramitar asociados dados de baja o bloqueados.');
      return;
    }
    const duplicados = seleccionados.filter(asociado => this.tieneDuplicadoPendiente('baja', asociado.id));
    if (duplicados.length > 0) {
      this.showError(`Ya existe una baja pendiente para: ${duplicados.map(a => `${a.nombre} ${a.apellidos}`).join(', ')}.`);
      return;
    }

    this.loading = true;
    this.detectarSustitucionesRequeridas(seleccionados).subscribe({
      next: sustituciones => {
        this.loading = false;
        if (sustituciones.length) {
          this.bajasPendientesSustitucion = seleccionados;
          this.sustitucionesCargo = sustituciones;
          this.sustitucionesDialogOpen = true;
          return;
        }

        this.confirmarBajasPendientes(seleccionados);
      },
      error: () => {
        this.loading = false;
        this.showError('No se han podido comprobar los cargos obligatorios.');
      }
    });
  }

  cerrarSustitucionesDialog(): void {
    this.sustitucionesDialogOpen = false;
    this.sustitucionesCargo = [];
    this.bajasPendientesSustitucion = [];
    this.modificacionPendienteConSustitucion = null;
    this.sustitucionOrigen = 'baja';
  }

  confirmarSolicitudConSustituciones(): void {
    if (this.accionesBloqueadasPorEjercicio) {
      this.showError(this.mensajeEjercicioNoActivo);
      return;
    }
    if (!this.sustitucionesCargo.every(item => item.sustitutoId)) {
      this.showError('Selecciona sustituto para todos los cargos obligatorios.');
      return;
    }

    this.loading = true;
    const sustitucionesByAsociado = this.sustitucionesCargo.reduce<Record<number, any[]>>((acc, item) => {
      const sustituto = this.buscarAsociado(Number(item.sustitutoId));
      acc[item.asociado.id] = acc[item.asociado.id] || [];
      acc[item.asociado.id].push({
        cargoId: item.cargo.idCargo,
        cargoNombre: item.cargo.cargo,
        ejercicio: item.cargo.ejercicio,
        sustituidoId: item.asociado.id,
        sustituidoNombre: `${item.asociado.nombre} ${item.asociado.apellidos}`,
        sustitutoId: sustituto?.id,
        sustitutoNombre: sustituto ? `${sustituto.nombre} ${sustituto.apellidos}` : ''
      });
      return acc;
    }, {});

    const registrosBase$ = this.sustitucionOrigen === 'modificacion' && this.modificacionPendienteConSustitucion
      ? [
          this.secretariaService.crearRegistroPendiente({
            asociacionId: this.asociacionId,
            tipo: 'cambio',
            asociadoId: this.modificacionPendienteConSustitucion.asociado.id,
            datos: this.modificacionPendienteConSustitucion.datos,
            datosOriginales: this.modificacionPendienteConSustitucion.datosOriginales,
            observaciones: 'Solicitud con sustitucion automatica de cargo obligatorio'
          })
        ]
      : this.bajasPendientesSustitucion.map(asociado =>
      this.secretariaService.crearRegistroPendiente({
        asociacionId: this.asociacionId,
        tipo: 'baja',
        asociadoId: asociado.id,
        datos: {
          asociadoId: asociado.id,
          nombre: asociado.nombre,
          apellidos: asociado.apellidos,
          sustitucionesCargo: sustitucionesByAsociado[asociado.id] || []
        },
        datosOriginales: { ...asociado },
        observaciones: 'Solicitud con sustitucion automatica de cargo obligatorio'
      })
    );
    const registrosCambioCargo$ = this.sustitucionesCargo.map(item => {
      const sustituto = this.buscarAsociado(Number(item.sustitutoId));
      return this.secretariaService.crearRegistroPendiente({
        asociacionId: this.asociacionId,
        tipo: 'cambio',
        asociadoId: Number(item.sustitutoId),
        datos: {
          asociadoId: Number(item.sustitutoId),
          nombre: sustituto?.nombre || '',
          apellidos: sustituto?.apellidos || '',
          tramiteOrigen: 'sustitucion_cargo_obligatorio',
          tipoCambio: 'cargo',
          cargoId: item.cargo.idCargo,
          cargoIds: [item.cargo.idCargo],
          cargoNombre: item.cargo.cargo,
          cargoNombres: [item.cargo.cargo],
          ejercicio: item.cargo.ejercicio,
          sustituyeAId: item.asociado.id,
          sustituyeANombre: `${item.asociado.nombre} ${item.asociado.apellidos}`
        },
        datosOriginales: sustituto ? { ...sustituto } : null,
        observaciones: 'Cambio de cargo obligatorio asociado a baja'
      });
    });

    const tipoSolicitud: SolicitudTipo = this.sustitucionOrigen === 'modificacion' ? 'cambio' : 'baja';
    const observacionesSolicitud = this.sustitucionOrigen === 'modificacion'
      ? 'Solicitud conjunta: cambio y sustitucion de cargo obligatorio'
      : 'Solicitud conjunta: baja y cambio de cargo obligatorio';
    forkJoin([...registrosBase$, ...registrosCambioCargo$])
      .pipe(
        switchMap(items =>
          this.secretariaService.crearSolicitud({
            asociacionId: this.asociacionId,
            tipo: tipoSolicitud,
            registroPendienteIds: items.map(item => item.id),
            observaciones: observacionesSolicitud
          })
        )
      )
      .subscribe({
        next: solicitud => {
          this.solicitudes.unshift(solicitud);
          this.solicitudDetalle = solicitud;
          this.seleccionBaja.clear();
          this.resetFormulario();
          this.asociadoEnEdicion = null;
          this.mostrarFormMod = false;
          this.activeTab = 'solicitudes';
          this.loading = false;
          this.cerrarSustitucionesDialog();
          this.dialog.openDialogAlert({
            title: 'Solicitud creada',
            content: `Se ha creado la solicitud ${solicitud.numero}. Adjunta la solicitud firmada para enviarla a Secretaria.`,
            innerHtml: `<p>Se ha creado la solicitud <strong>${solicitud.numero}</strong> con la sustitucion indicada.</p><p>Adjunta la solicitud firmada desde el detalle antes de enviarla a Secretaria.</p>`,
            buttonsAlert: [AlertButtonType.Entendido]
          });
        },
        error: () => {
          this.loading = false;
          this.showError('No se ha podido crear la solicitud con sustitucion.');
        }
      });
  }

  sustitutosDisponibles(sustitucion: SustitucionCargoRequerido): Asociado[] {
    const afectados = new Set(this.bajasPendientesSustitucion.map(asociado => asociado.id));
    return [...this.adultos, ...this.infantiles]
      .filter(asociado => asociado.id !== sustitucion.asociado.id)
      .filter(asociado => !afectados.has(asociado.id))
      .filter(asociado => !this.asociadoBloqueado(asociado))
      .sort((a, b) => this.normalizeText(`${a.nombre} ${a.apellidos}`).localeCompare(this.normalizeText(`${b.nombre} ${b.apellidos}`)));
  }

  cargoRequeridoLabel(cargo: HistoricoAsociado): string {
    return `${cargo.cargo} (${cargo.ejercicio})`;
  }

  private confirmarBajasPendientes(seleccionados: Asociado[]): void {
    const listado = seleccionados.map(a => `<li>${a.nombre} ${a.apellidos}</li>`).join('');
    const ref = this.dialog.openDialogAlert({
      title: 'Confirmar bajas',
      content: `Desea preparar las bajas seleccionadas para generar una solicitud?`,
      innerHtml: `<p>Desea preparar las bajas seleccionadas para generar una solicitud?</p><ul>${listado}</ul>`,
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
            content: 'Las bajas se han anadido al borrador de solicitud.',
            innerHtml: '<p>Las bajas se han anadido al borrador de solicitud.</p>',
            buttonsAlert: [AlertButtonType.Entendido]
          });
        },
        error: () => {
          this.loading = false;
          this.showError('No se han podido anadir las bajas al borrador de solicitud.');
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
    if (this.accionesBloqueadasPorEjercicio) {
      this.showError(this.mensajeEjercicioNoActivo);
      return;
    }
    const ids = this.registroPendiente
      .filter(item => item.tipo === tipo && this.seleccionRegistro.has(item.id))
      .map(item => item.id);

    if (!ids.length) {
      this.showError('Selecciona uno o varios cambios preparados.');
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
        error: error => {
          this.loading = false;
          if (!this.gestionarErrorAltaDuplicada(error)) {
            this.showError('No se ha podido crear la solicitud.');
          }
        }
      });
  }

  verSolicitud(solicitud: SolicitudSecretaria): void {
    this.loading = true;
    this.secretariaService.getSolicitud(solicitud.id).subscribe({
      next: detalle => {
        this.solicitudDetalle = detalle;
        this.pestanaSolicitud = 'resumen';
        this.detalleSolicitudDialogOpen = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showError('No se ha podido cargar la solicitud.');
      }
    });
  }

  private verSolicitudPorId(solicitudId: number): void {
    const solicitud = this.solicitudes.find(item => Number(item.id) === Number(solicitudId));
    this.activeTab = 'solicitudes';
    this.pendingViewTipo = null;
    if (solicitud) {
      this.verSolicitud(solicitud);
      return;
    }

    this.loading = true;
    this.secretariaService.getSolicitud(solicitudId).subscribe({
      next: detalle => {
        this.solicitudes = this.solicitudes.some(item => item.id === detalle.id)
          ? this.solicitudes.map(item => (item.id === detalle.id ? detalle : item))
          : [detalle, ...this.solicitudes];
        this.solicitudDetalle = detalle;
        this.pestanaSolicitud = 'resumen';
        this.detalleSolicitudDialogOpen = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showError('No se ha podido cargar la solicitud existente.');
      }
    });
  }

  enviarSolicitud(solicitud: SolicitudSecretaria): void {
    if (this.accionesBloqueadasPorEjercicio) {
      this.showError(this.mensajeEjercicioNoActivo);
      return;
    }
    if (!this.solicitudAdjunta(solicitud)) {
      this.showError('Debes adjuntar la solicitud firmada antes de enviarla a Secretaria.');
      return;
    }
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

  reenviarAutorizacion(solicitud: SolicitudSecretaria): void {
    this.cambiarEstadoSolicitud(
      solicitud,
      () => this.secretariaService.reenviarAutorizacionesAlta(solicitud.id),
      'No se ha podido reenviar la autorizacion.'
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

  imprimirSolicitud(solicitud: SolicitudSecretaria): void {
    this.loading = true;
    this.secretariaService.descargarJustificantePdf('solicitud', solicitud.id).subscribe({
      next: ({ blob }) => {
        this.openPdfBlob(blob);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showError('No se ha podido generar el PDF de la solicitud.');
      }
    });
  }

  private openPdfBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  cargarRegistroPendiente(): void {
    this.secretariaService.getRegistroPendiente(this.asociacionId).subscribe({
      next: response => {
        this.registroPendiente = response.items;
        this.seleccionRegistro.clear();
      },
      error: () => this.showError('No se han podido cargar los cambios preparados.')
    });
  }

  cargarSolicitudes(resetPage = false): void {
    if (resetPage) this.paginaSolicitudes = 1;
    this.loading = true;
    this.secretariaService.getSolicitudes(this.asociacionId, {
      page: this.paginaSolicitudes,
      pageSize: this.tamanoPaginaSolicitudes,
      tipo: this.tipoSolicitudFiltro === 'todos' ? undefined : this.tipoSolicitudFiltro,
      estado: this.estadoSolicitudFiltro === 'todos' ? undefined : this.estadoSolicitudFiltro,
      busqueda: this.busquedaSolicitudes.trim() || undefined,
      orden: this.ordenSolicitudes,
      soloProblematicas: this.filtroSolicitudes === 'incidencias'
    }).subscribe({
      next: response => {
        const solicitudesActivas = response.solicitudes.filter(solicitud => solicitud.estado !== 'cancelada');
        this.solicitudes = solicitudesActivas;
        this.paginaSolicitudes = response.paginacion?.page ?? this.paginaSolicitudes;
        this.totalSolicitudes = response.paginacion?.total ?? solicitudesActivas.length;
        this.totalPaginasSolicitudes = response.paginacion?.totalPages ?? 1;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showError('No se han podido cargar las solicitudes.');
      }
    });
  }

  puedeEnviarSolicitud(solicitud: SolicitudSecretaria): boolean {
    return solicitud.estado === 'registrada'
      && this.autorizacionesPendientesNombres(solicitud).length === 0
      && this.permissions.hasPermission('solicitudes:send');
  }

  solicitudAdjunta(solicitud: SolicitudSecretaria): boolean {
    return this.solicitudAdjuntos(solicitud).length > 0;
  }

  solicitudAdjuntos(solicitud: SolicitudSecretaria): AdjuntoSecretaria[] {
    return solicitud.adjuntos || [];
  }

  seleccionarSolicitudFirmada(event: Event, solicitud: SolicitudSecretaria): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.solicitudFirmadaFiles[solicitud.id] = file;
    input.value = '';

    if (file) {
      this.adjuntarSolicitudFirmada(solicitud);
    }
  }

  adjuntarSolicitudFirmada(solicitud: SolicitudSecretaria): void {
    const file = this.solicitudFirmadaFiles[solicitud.id];
    if (!file) {
      this.showError('Selecciona el documento firmado antes de adjuntarlo.');
      return;
    }

    this.loading = true;
    this.secretariaService.subirAdjunto('solicitud', solicitud.id, file).subscribe({
      next: adjunto => {
        this.loading = false;
        this.solicitudFirmadaFiles[solicitud.id] = null;
        const updated = {
          ...solicitud,
          adjuntos: [adjunto, ...this.solicitudAdjuntos(solicitud)]
        };
        this.solicitudDetalle = updated;
        this.solicitudes = this.solicitudes.map(item => item.id === updated.id ? updated : item);
        this.dialog.openDialogAlert({
          title: 'Solicitud adjunta',
          content: 'La solicitud firmada se ha adjuntado correctamente.',
          innerHtml: '<p>La solicitud firmada se ha adjuntado correctamente.</p>',
          buttonsAlert: [AlertButtonType.Entendido]
        });
      },
      error: error => {
        this.loading = false;
        this.solicitudFirmadaFiles[solicitud.id] = null;
        this.showError(error?.error?.message || 'No se ha podido adjuntar la solicitud firmada.');
      }
    });
  }

  descargarAdjuntoSolicitud(adjunto: AdjuntoSecretaria): void {
    this.secretariaService.descargarAdjunto(adjunto.id).subscribe({
      next: blob => this.downloadBlob(blob, adjunto.originalName || `adjunto-${adjunto.id}`),
      error: () => this.showError('No se ha podido descargar la solicitud firmada.')
    });
  }

  puedeReenviarAutorizacion(solicitud: SolicitudSecretaria): boolean {
    return solicitud.estado === 'autorizacion_rechazada'
      && this.permissions.hasPermission('solicitudes:send');
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
      autorizacion_rechazada: 'Autorizacion rechazada',
      pendiente_firma: 'Pendiente de firma',
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
    if (estado === 'autorizacion_rechazada') {
      return 'estado-rechazada';
    }
    return `estado-${estado.replace('_', '-')}`;
  }

  autorizacionesAltaRegistradas(solicitud: SolicitudSecretaria): AutorizacionAlta[] {
    return solicitud.autorizacionesAlta || [];
  }

  labelEstadoAutorizacion(estado: AutorizacionAlta['estado']): string {
    const labels: Record<AutorizacionAlta['estado'], string> = {
      pendiente_firma: 'Pendiente de firma',
      firmada: 'Autorizada',
      archivada: 'Autorizada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada'
    };
    return labels[estado] || estado;
  }

  estadoAutorizacionClass(estado: AutorizacionAlta['estado']): string {
    return estado === 'firmada' || estado === 'archivada'
      ? 'estado-validada'
      : this.estadoClass(estado);
  }

  firmaAutorizacion(autorizacion: AutorizacionAlta): { firmante?: string | null; observaciones?: string | null; fecha?: string | null } | null {
    return (autorizacion.documento?.['firma'] as { firmante?: string | null; observaciones?: string | null; fecha?: string | null } | undefined) || null;
  }

  labelEstadoSolicitud(solicitud: SolicitudSecretaria): string {
    return this.labelEstado(this.estadoVisibleSolicitud(solicitud));
  }

  estadoClassSolicitud(solicitud: SolicitudSecretaria): string {
    return this.estadoClass(this.estadoVisibleSolicitud(solicitud));
  }

  estadoTooltipSolicitud(solicitud: SolicitudSecretaria): string | null {
    const nombres = this.autorizacionesPendientesNombres(solicitud);
    return nombres.length ? `Pendiente de firma por ${nombres.join(', ')}` : null;
  }

  private estadoVisibleSolicitud(solicitud: SolicitudSecretaria): string {
    return ['finalizada', 'rechazada', 'cancelada', 'validada', 'autorizacion_rechazada'].includes(solicitud.estado)
      ? solicitud.estado
      : this.autorizacionesPendientesNombres(solicitud).length > 0 ? 'pendiente_firma' : solicitud.estado;
  }

  private autorizacionesPendientesNombres(solicitud: SolicitudSecretaria): string[] {
    const detalle = solicitud.autorizacionesAlta
      ?.filter(item => item.estado === 'pendiente_firma')
      .map(item => item.asociacionAnteriorNombre || `Asociacion ${item.asociacionAnteriorId}`)
      .filter(Boolean) || [];
    if (detalle.length) {
      return [...new Set(detalle)];
    }
    const resumen = String(solicitud.autorizacionesPendientesNombres || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    return solicitud.autorizacionesPendientes && solicitud.autorizacionesPendientes > 0
      ? resumen.length ? resumen : ['asociacion anterior']
      : [];
  }

  limpiarFiltroSolicitudes(): void {
    this.filtroSolicitudes = null;
    this.cargarSolicitudes(true);
  }

  aplicarFiltrosSolicitudes(): void {
    this.cargarSolicitudes(true);
  }

  cambiarPaginaSolicitudes(delta: number): void {
    const page = this.paginaSolicitudes + delta;
    if (page < 1 || page > this.totalPaginasSolicitudes || this.loading) return;
    this.paginaSolicitudes = page;
    this.cargarSolicitudes();
  }

  cerrarDetalleSolicitud(): void {
    this.detalleSolicitudDialogOpen = false;
  }

  activarPestanaSolicitud(pestana: PestanaSolicitudAsociacion): void {
    this.pestanaSolicitud = pestana;
  }

  navegarPestanasSolicitud(event: KeyboardEvent, index: number): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const total = this.pestanasSolicitud.length;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? total - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + total) % total;
    const pestana = this.pestanasSolicitud[next];
    this.activarPestanaSolicitud(pestana.id);
    setTimeout(() => document.getElementById(`solicitud-asociacion-tab-${pestana.id}`)?.focus());
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
    return this.asociadoDadoDeBaja(asociado) || this.estadoPendienteAsociado(asociado) !== null;
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
    if (this.asociadoDadoDeBaja(asociado)) {
      return 'Baja';
    }

    const estado = this.estadoPendienteAsociado(asociado);
    return estado === 'baja' ? 'Baja pendiente' : estado === 'cambio' ? 'Cambio pendiente' : '';
  }

  asociadoDadoDeBaja(asociado: Asociado): boolean {
    return String(asociado.estado || '').toLowerCase() === 'baja';
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
          this.showError('No se ha podido descartar el cambio preparado.');
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
    const sustituciones = Array.isArray(datos['sustitucionesCargo'])
      ? datos['sustitucionesCargo'].map((sustitucion: any) =>
          `Sustitucion ${sustitucion.cargoNombre}: ${sustitucion.sustituidoNombre} -> ${sustitucion.sustitutoNombre}`
        )
      : [];

    if ('tipo' in item && item.tipo === 'cambio') {
      return [...this.diferenciasItem(item as RegistroPendiente), ...sustituciones];
    }

    return [
      datos.dni ? `DNI/NIE: ${datos.dni}` : '',
      datos.sip ? `SIP: ${datos.sip}` : '',
      datos.telefono ? `Telefono: ${datos.telefono}` : '',
      datos.email ? `Email: ${datos.email}` : '',
      ...sustituciones
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

    const diferencias = campos
      .map(([key, label, originalKey]) => {
        const nuevo = String(datos[key] ?? '').trim();
        const anterior = String(originales[originalKey] ?? '').trim();
        return nuevo !== anterior ? `${label}: ${anterior || '-'} -> ${nuevo || '-'}` : '';
      })
      .filter(Boolean);

    const cargosNuevo = Array.isArray(datos['cargoNombres'])
      ? datos['cargoNombres'].join(' / ')
      : datos['cargoNombre'] || '';
    const cargosAnterior = String(originales['cargo'] || '').trim();
    if (cargosNuevo && this.normalizeText(cargosNuevo) !== this.normalizeText(cargosAnterior)) {
      diferencias.push(`Cargos: ${cargosAnterior || '-'} -> ${cargosNuevo}`);
    }

    return diferencias;
  }

  public resetFormulario(): void {
    this.altaForm.reset({
      tipo: 'Hoguera adulta',
      cargoId: null,
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
    this.ultimoDocumentoAltaConsultado = '';
    this.comprobandoDocumentoAlta = false;
    this.altaExistenteAsociado = null;
    this.altaAsociacionesAnteriores = [];
    this.cargosSeleccionadosIds = new Set([this.getDefaultCargoId('Hoguera adulta')].filter(Boolean));
  }

  actualizarCargoPorTipo(): void {
    const validIds = new Set(this.cargosFormulario.map(cargo => Number(cargo.id)));
    this.cargosSeleccionadosIds = new Set([...this.cargosSeleccionadosIds].filter(id => validIds.has(id)));
    if (this.cargosSeleccionadosIds.size === 0) {
      this.cargosSeleccionadosIds.add(this.getDefaultCargoId(this.altaForm.value.tipo || 'Hoguera adulta'));
    }
    this.altaForm.patchValue({ cargoId: null });
  }

  agregarCargoSeleccionado(): void {
    const currentCargoId = Number(this.altaForm.value.cargoId || 0);
    if (!currentCargoId) {
      return;
    }

    const validIds = new Set(this.cargosFormulario.map(cargo => Number(cargo.id)));
    if (!validIds.has(currentCargoId)) {
      return;
    }

    this.cargosSeleccionadosIds.add(currentCargoId);
    this.altaForm.patchValue({ cargoId: null });
  }

  quitarCargoSeleccionado(cargoId: number): void {
    this.cargosSeleccionadosIds.delete(Number(cargoId));
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
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.showError(error?.error?.message || errorMessage);
      }
    });
  }

  private gestionarErrorAltaDuplicada(error: unknown): boolean {
    const response = error as HttpErrorResponse;
    const details = response?.error?.details;
    if (response?.status !== 409 || details?.code !== 'SOLICITUD_ALTA_DUPLICADA' || !details?.solicitudId) {
      return false;
    }

    const verSolicitudButton = 'Ver solicitud' as AlertButtonType;
    const ref = this.dialog.openDialogAlert({
      title: 'Solicitud existente',
      content: 'Ya existe una solicitud para esta persona, finalicela antes de crear otra',
      innerHtml: `
        <p>Ya existe una solicitud para esta persona, finalicela antes de crear otra.</p>
        <p>Solicitud existente: <strong>${details.solicitudNumero || details.solicitudId}</strong></p>
      `,
      buttonsAlert: [AlertButtonType.Cancelar, verSolicitudButton]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result === verSolicitudButton) {
        this.verSolicitudPorId(Number(details.solicitudId));
      }
    });

    return true;
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
      if (solicitud.tipo !== tipo || ['validada', 'finalizada', 'rechazada', 'cancelada'].includes(solicitud.estado)) {
        return false;
      }

      return (solicitud.items || []).some(item => Number(item.datos?.asociadoId ?? item.datosOriginales?.['id']) === asociadoId);
    });
  }

  private detectarSustitucionesRequeridas(asociados: Asociado[]) {
    if (!asociados.length) {
      return of([]);
    }

    const currentYear = new Date().getFullYear();
    return forkJoin(
      asociados.map(asociado =>
        this.asociadosService.getHistorico(asociado.id).pipe(
          map(historico =>
            historico
              .filter(item =>
              Number(item.ejercicio) === currentYear &&
              Number(item.idAsociacion) === this.asociacionId &&
              this.esCargoRequerido(item)
              )
              .map(cargo => ({ asociado, cargo, sustitutoId: null }))
          )
        )
      )
    ).pipe(map(items => items.flat()));
  }

  private detectarSustitucionesPorCambioCargo(asociado: Asociado, cargoIdsSeleccionados: number[]) {
    const selected = new Set(cargoIdsSeleccionados.map(Number));
    const currentYear = new Date().getFullYear();

    return this.asociadosService.getHistorico(asociado.id).pipe(
      map(historico =>
        historico
          .filter(item =>
            Number(item.ejercicio) === currentYear &&
            Number(item.idAsociacion) === this.asociacionId &&
            Number(item.active) === 1 &&
            this.esCargoRequerido(item) &&
            !selected.has(Number(item.idCargo))
          )
          .map(cargo => ({ asociado, cargo, sustitutoId: null }))
      )
    );
  }

  private esCargoRequerido(historico: HistoricoAsociado): boolean {
    const cargo = this.cargos.find(item => Number(item.id) === Number(historico.idCargo));
    return Number(cargo?.obligatorio ?? cargo?.requerido ?? 0) === 1;
  }

  private precargarCargoActual(asociado: Asociado): void {
    this.asociadosService.getHistorico(asociado.id).subscribe({
      next: historico => {
        const currentYear = new Date().getFullYear();
        const cargoActual = historico.find(item =>
          Number(item.ejercicio) === currentYear &&
          Number(item.idAsociacion) === this.asociacionId &&
          Number(item.active) === 1
        );
        const cargoIds = historico
          .filter(item =>
            Number(item.ejercicio) === currentYear &&
            Number(item.idAsociacion) === this.asociacionId &&
            Number(item.active) === 1
          )
          .map(item => Number(item.idCargo))
          .filter(Boolean);
        if (cargoIds.length) {
          this.cargosSeleccionadosIds = new Set(cargoIds);
          this.altaForm.patchValue({ cargoId: null });
        } else if (cargoActual?.idCargo) {
          this.cargosSeleccionadosIds = new Set([Number(cargoActual.idCargo)]);
          this.altaForm.patchValue({ cargoId: null });
        }
      },
      error: () => undefined
    });
  }

  private getCargoIdPorNombre(nombreCargo: string | undefined, tipo: 'adulto' | 'infantil'): number {
    const firstCargoName = String(nombreCargo || '').split('/')[0].trim();
    const cargo = this.cargos.find(item =>
      this.cargoActivo(item) &&
      this.cargoEsInfantil(item) === (tipo === 'infantil') &&
      this.normalizeText(item.nombre) === this.normalizeText(firstCargoName)
    );
    return Number(cargo?.id || this.getDefaultCargoId(tipo === 'infantil' ? 'Hoguera infantil' : 'Hoguera adulta'));
  }

  private getDefaultCargoId(tipo: string): number {
    const infantil = tipo === 'Hoguera infantil';
    const preferredName = infantil ? 'Asociado/a Infantil' : 'Asociado/a';
    const preferred = this.cargos.find(cargo =>
      this.cargoActivo(cargo) &&
      this.cargoEsInfantil(cargo) === infantil &&
      this.normalizeText(cargo.nombre) === this.normalizeText(preferredName)
    );
    const first = this.cargos.find(cargo =>
      Number(cargo.id) > 0 &&
      this.cargoActivo(cargo) &&
      this.cargoEsInfantil(cargo) === infantil
    );
    return Number(preferred?.id || first?.id || (infantil ? 12 : 8));
  }

  private cargoActivo(cargo: CargoResumen): boolean {
    if (cargo.activo === undefined && cargo.active === undefined) {
      return true;
    }

    return cargo.activo === true || Number(cargo.active ?? 0) === 1;
  }

  private cargoEsInfantil(cargo: CargoResumen): boolean {
    return Number(cargo.es_infantil ?? cargo.esInfantil ?? 0) === 1;
  }

  private getConflictosCargoExclusivo(cargoIds: number[]): ConflictoCargoExclusivo[] {
    const actualId = this.asociadoEnEdicion?.id ?? null;
    return cargoIds
      .map(cargoId => this.cargos.find(item => Number(item.id) === Number(cargoId)))
      .filter((cargo): cargo is CargoResumen => Boolean(cargo) && this.cargoExclusivo(cargo))
      .map(cargo => {
        const titular = [...this.adultos, ...this.infantiles].find(asociado =>
          asociado.id !== actualId &&
          !this.asociadoDadoDeBaja(asociado) &&
          this.getCargoIdsAsociado(asociado).includes(Number(cargo.id))
        );
        return titular ? { cargo, titular } : null;
      })
      .filter(Boolean) as ConflictoCargoExclusivo[];
  }

  private getCargoIdsAsociado(asociado: Asociado): number[] {
    const directIds = (asociado.cargoIds || []).map(Number).filter(Boolean);
    if (directIds.length) {
      return directIds;
    }

    const splitIds = String((asociado as any).cargo_ids || '')
      .split(',')
      .map(id => Number(id.trim()))
      .filter(Boolean);
    if (splitIds.length) {
      return splitIds;
    }

    const cargoId = Number(asociado.cargoId || 0);
    return cargoId ? [cargoId] : [this.getCargoIdPorNombre(asociado.cargo, asociado.tipo)].filter(Boolean);
  }

  private cargoExclusivo(cargo: CargoResumen | undefined): boolean {
    return (cargo?.modo_ocupacion ?? cargo?.modoOcupacion) === 'exclusivo';
  }

  private isGestionTab(value: string | null): value is GestionTab {
    return value === 'altas' || value === 'modificaciones' || value === 'bajas' || value === 'solicitudes' || value === 'cupos';
  }

  private showError(message: string): void {
    this.dialog.openDialogAlert({
      title: 'Error',
      content: message,
      innerHtml: `<p>${message}</p>`,
      buttonsAlert: [AlertButtonType.Entendido]
    });
  }

  controlInvalido(nombre: string): boolean {
    const control = this.altaForm.get(nombre);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private mensajeErrorFormulario(): string {
    const errors: Array<[string, string]> = [
      ['dni', 'Indica un DNI o NIE válido (por ejemplo, 12345678Z o X1234567L).'],
      ['nombre', 'El nombre es obligatorio y no puede superar 100 caracteres.'],
      ['apellidos', 'Los apellidos son obligatorios y no pueden superar 150 caracteres.'],
      ['cp', 'El código postal debe tener cinco cifras.'],
      ['telefono', 'El teléfono debe contener entre 8 y 20 caracteres válidos.'],
      ['email', 'Indica una dirección de correo electrónico válida.'],
      ['sip', 'El SIP no puede superar 30 caracteres.'],
      ['nacimiento', 'La fecha de nacimiento es obligatoria, debe ser real y no puede ser futura.']
    ];
    return errors.find(([name]) => this.altaForm.get(name)?.invalid)?.[1]
      || 'Revisa los datos obligatorios del formulario.';
  }

  private fechaNacimientoValida(): boolean {
    const value = String(this.altaForm.value.nacimiento || '').trim();
    if (!value) return true;
    const date = new Date(`${value}T00:00:00Z`);
    const today = fechaHoyLocal();
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today;
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}



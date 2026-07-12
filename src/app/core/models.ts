export type AsociadoTipo = 'adulto' | 'infantil';

export interface Asociado {
  id: number;
  nombre: string;
  apellidos: string;
  cargo: string;
  cargoId?: number;
  cargoIds?: number[];
  tipo: AsociadoTipo;
  dni?: string;
  sip?: string;
  estado?: string;
  fechaBaja?: string;
  fechaAlta?: string;
  fechaNacimiento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigoPostal?: string;
  codigo_postal?: string;
  cp?: string;
  localidad?: string;
  provincia?: string;
}

export interface HistoricoAsociado {
  cargo: string;
  ejercicio: number | string;
  nombreAsociacion: string;
  idCargo: number;
  idEjercicio: number;
  idAsociacion: number;
  active: boolean | number;
}

export interface Asociacion {
  id: number;
  name?: string;
  nombre?: string;
  cif: string;
  email?: string;
  phone?: string;
  telefono?: string;
  address?: string;
  direccion?: string;
  city?: string;
  localidad?: string;
  poblacion?: string;
  codigo_postal?: string;
  codigoPostal?: string;
  cp?: string;
  state?: string;
  provincia?: string;
  lema?: string;
  himno?: string;
  ubicacion_monumento?: string;
  ubicacionMonumento?: string;
  ubicacion_portada?: string;
  ubicacionPortada?: string;
  sede_direccion?: string;
  sedeDireccion?: string;
  sede_codigo_postal?: string;
  sedeCodigoPostal?: string;
  sede_poblacion?: string;
  sedePoblacion?: string;
  sede_provincia?: string;
  sedeProvincia?: string;
  anyo_fundacion?: number | string | null;
  anyoFundacion?: number | string | null;
  tipo_asociacion?: number | string;
  tipoAsociacion?: number | string;
  active?: boolean | number;
  img?: string | null;
  password?: string | null;
}

export interface AuthContext {
  asociacionId: number;
  usuario: string;
  nombre: string;
  asociacionNombre: string;
  ejercicioActivo?: EjercicioSecretaria | null;
  ejercicios?: EjercicioSecretaria[];
  permisos: string[];
}

export interface EjercicioSecretaria {
  id: number;
  ejercicio: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface EjercicioInicioResultado {
  ejercicio: EjercicioSecretaria;
  ejercicioAnterior: EjercicioSecretaria;
  censoEjercicioId: number;
  censoEjercicioAnteriorId: number;
  totalPreviosActivos: number;
  creados: number;
  yaExistian: number;
  omitidos: number;
}

export type SolicitudTipo = 'alta' | 'cambio' | 'baja';

export interface RegistroPendiente {
  id: number;
  asociacionId: number;
  ejercicioId?: number | null;
  ejercicio?: number | null;
  tipo: SolicitudTipo;
  asociadoId?: number | null;
  estado: 'pendiente' | 'incluido_en_solicitud' | 'descartado';
  datos: Record<string, any>;
  datosOriginales?: Record<string, any> | null;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SolicitudItemSecretaria {
  id: number;
  solicitudId: number;
  registroPendienteId: number;
  tipo?: SolicitudTipo;
  datos: Record<string, any>;
  datosOriginales?: Record<string, any> | null;
  estado: string;
}

export interface SolicitudSecretaria {
  id: number;
  numero: string;
  asociacionId: number;
  ejercicioId?: number | null;
  ejercicio?: number | null;
  tipo: SolicitudTipo;
  estado: string;
  totalRegistros: number;
  autorizacionesPendientes?: number;
  autorizacionesPendientesNombres?: string;
  fechaAlta: string;
  fechaRegistro?: string;
  fechaEntrada?: string | null;
  fechaValidacion?: string | null;
  observaciones?: string | null;
  items?: SolicitudItemSecretaria[];
  autorizacionesAlta?: AutorizacionAlta[];
  adjuntos?: AdjuntoSecretaria[];
}

export interface AutorizacionAlta {
  id: number;
  solicitudId: number;
  solicitudNumero: string;
  solicitudItemId?: number | null;
  asociadoId: number;
  asociadoNombre: string;
  asociacionNuevaId: number;
  asociacionAnteriorId: number;
  asociacionAnteriorNombre?: string | null;
  estado: 'pendiente_firma' | 'firmada' | 'rechazada' | 'cancelada' | 'archivada';
  documento?: Record<string, any> | null;
  fechaCreacion: string;
  fechaFirma?: string | null;
  fechaEnvioSecretaria?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardAsociacionResumen {
  solicitudesConIncidencia: number;
  inscripcionesAbiertas: number;
  comunicacionesNuevas: number;
  autorizacionesAltaPendientes?: number;
}

export interface DashboardAdminResumen {
  solicitudesPendientes: number;
  incidenciasRespondidas: number;
  comunicacionesPendientes: number;
  documentacionRecibida: number;
}

export interface RegistroSecretaria {
  id: number;
  numero: string;
  asociacionId: number;
  ejercicio?: number | null;
  tipo: 'documentacion' | 'comunicacion';
  origen: 'asociacion' | 'administracion';
  titulo: string;
  mensaje?: string;
  responsable?: string | null;
  estado: 'enviada' | 'recibido' | 'leido' | 'validado' | 'incidencia' | 'rechazado' | 'finalizada' | 'archivada';
  fechaEntrada: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  adjuntos: AdjuntoSecretaria[];
  mensajes?: RegistroMensajeSecretaria[];
}

export interface RegistroMensajeSecretaria {
  id: number;
  registroId: number;
  actor: 'asociacion' | 'administracion';
  mensaje: string;
  createdAt: string;
  adjuntos: AdjuntoSecretaria[];
}

export interface InscripcionSecretaria {
  id: string;
  asociacionId: number;
  ejercicioId?: number | null;
  ejercicio?: number | null;
  formularioId: string | null;
  actividadId?: string | null;
  titulo: string;
  estado: string;
  fechaPublicacion: string;
  fechaLimite: string;
  tiposPermitidos: AsociadoTipo[];
  campos: CampoInscripcion[];
}

export interface InscripcionEntradaSecretaria {
  id: number;
  numero: string;
  asociacionId: number;
  ejercicioId?: number | null;
  ejercicio?: number | null;
  asociacionNombre?: string;
  formularioId: string;
  estado: 'recibida' | 'en_revision' | 'con_incidencias' | 'validada' | 'rechazada';
  fechaEntrada: string;
  participantes: string[];
  datos: Record<string, unknown>;
}

export interface CampoInscripcion {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'tel' | 'email' | 'number' | 'date' | 'select' | 'asociado' | 'asociado_adulto' | 'asociado_infantil' | 'responsable';
  required?: boolean;
  options?: string[];
}

export interface FormularioInscripcion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: 'activo' | 'archivado';
  campos: CampoInscripcion[];
  inscripcionesCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Incidencia {
  id: string;
  scope: 'solicitud' | 'registro' | 'inscripcion' | 'incidencia';
  scopeId: string;
  estado: 'abierta' | 'respondida' | 'subsanada' | 'cerrada';
  mensaje: string;
  respuesta?: string | null;
  fechaAlta: string;
  fechaCierre?: string | null;
  eventos?: IncidenciaEvento[];
}

export interface IncidenciaEvento {
  id: number;
  incidenciaId: number;
  tipo: 'creada' | 'respuesta_asociacion' | 'devuelta_admin' | 'subsanada' | 'cerrada';
  actor: 'administracion' | 'asociacion' | 'sistema';
  mensaje: string;
  createdAt: string;
  adjuntos: AdjuntoSecretaria[];
}

export interface AdjuntoSecretaria {
  id: number;
  scope: 'solicitud' | 'registro' | 'inscripcion' | 'incidencia' | 'incidencia_evento' | 'registro_mensaje';
  scopeId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface JustificanteSecretaria {
  scope: 'solicitud' | 'registro' | 'inscripcion';
  scopeId: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  generatedAt: string;
}

export interface ActividadSecretaria {
  id: string;
  ejercicioId?: number | null;
  ejercicio?: number | null;
  titulo: string;
  estado: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  descripcion?: string;
  inscripciones?: InscripcionSecretaria[];
}

export interface CargoResumen {
  id: number;
  nombre: string;
  requerido: number;
  maximo: number;
  activo: boolean;
  active?: boolean | number;
  es_infantil?: boolean | number;
  esInfantil?: boolean | number;
  validados: number;
  solicitados: number;
}

export interface PermisoSecretaria {
  id: number;
  codigo: string;
  descripcion: string;
  modulo: string;
}

export interface RolSecretaria {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  permisos: PermisoSecretaria[];
}

export interface CargoPermisosSecretaria {
  cargoId: number;
  permisos: PermisoSecretaria[];
}

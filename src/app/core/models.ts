export type AsociadoTipo = 'adulto' | 'infantil';

export interface Asociado {
  id: number;
  nombre: string;
  apellidos: string;
  cargo: string;
  tipo: AsociadoTipo;
  dni?: string;
  sip?: string;
  estado?: string;
  fechaAlta?: string;
  fechaNacimiento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigoPostal?: string;
  codigo_postal?: string;
  cp?: string;
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
  permisos: string[];
}

export type SolicitudTipo = 'alta' | 'cambio' | 'baja';

export interface RegistroPendiente {
  id: number;
  asociacionId: number;
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
  tipo: SolicitudTipo;
  estado: string;
  totalRegistros: number;
  fechaAlta: string;
  fechaRegistro?: string;
  fechaEntrada?: string | null;
  fechaValidacion?: string | null;
  observaciones?: string | null;
  items?: SolicitudItemSecretaria[];
}

export interface RegistroSecretaria {
  id: number;
  numero: string;
  asociacionId: number;
  tipo: 'documentacion' | 'comunicacion';
  origen: 'asociacion' | 'administracion';
  titulo: string;
  mensaje?: string;
  responsable?: string | null;
  estado: 'recibido' | 'leido' | 'validado' | 'incidencia' | 'rechazado';
  fechaEntrada: string;
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
  formularioId: string;
  titulo: string;
  estado: string;
  fechaPublicacion: string;
  fechaLimite: string;
  tiposPermitidos: AsociadoTipo[];
  campos: CampoInscripcion[];
}

export interface CampoInscripcion {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'tel' | 'email' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: string[];
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
  titulo: string;
  estado: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  descripcion?: string;
}

export interface CargoResumen {
  id: number;
  nombre: string;
  requerido: number;
  maximo: number;
  activo: boolean;
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

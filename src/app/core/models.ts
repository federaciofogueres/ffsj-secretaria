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
  state?: string;
  lema?: string;
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
  id: string;
  asociacionId: number;
  tipo: 'documentacion' | 'comunicacion';
  titulo: string;
  mensaje?: string;
  estado: string;
  fechaEntrada: string;
  adjuntos: unknown[];
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
  scope: 'solicitud' | 'registro' | 'inscripcion';
  scopeId: string;
  estado: 'abierta' | 'subsanada' | 'cerrada';
  mensaje: string;
  fechaAlta: string;
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

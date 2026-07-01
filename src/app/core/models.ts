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
  email?: string;
  telefono?: string;
}

export interface Asociacion {
  id: number;
  name: string;
  cif: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

export interface AuthContext {
  asociacionId: number;
  usuario: string;
  nombre: string;
  asociacionNombre: string;
  permisos: string[];
}

export interface SolicitudSecretaria {
  id: string;
  asociacionId: number;
  tipo: 'alta' | 'modificacion' | 'baja';
  estado: string;
  totalRegistros: number;
  fechaAlta: string;
  fechaEntrada?: string | null;
  fechaValidacion?: string | null;
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

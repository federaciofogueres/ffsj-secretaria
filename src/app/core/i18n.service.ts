import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'es' | 'va' | 'en';

const translations: Record<AppLanguage, Record<string, string>> = {
  es: {
    'language.spanish': 'Castellano', 'language.valencian': 'Valencià', 'language.english': 'English', 'language.label': 'Idioma',
    'nav.home': 'Inicio', 'nav.members': 'Asociados', 'nav.data': 'Datos', 'nav.calendar': 'Calendario', 'nav.registrations': 'Inscripciones', 'nav.forms': 'Formularios', 'nav.exercises': 'Ejercicios', 'nav.record': 'Registro', 'nav.requests': 'Solicitudes', 'nav.permissions': 'Permisos',
    'common.support': 'Soporte', 'common.adminSupport': 'Soporte administrativo', 'common.logout': 'Salir', 'common.close': 'Cerrar', 'common.cancel': 'Cancelar', 'common.loading': 'Cargando...',
    'login.accessAssociations': 'Acceso asociaciones', 'login.title': 'Secretaría FFSJ', 'login.subtitle': 'Acceso para fogueres y barraques.', 'login.help': 'Entra con el CIF de tu asociación y la contraseña facilitada por Secretaría.', 'login.identification': 'Identificación', 'login.enterAssociation': 'Entrar como asociación', 'login.credentialsHelp': 'Usa las credenciales de la entidad, no las de una persona concreta.', 'login.cif': 'CIF de la asociación', 'login.cifPlaceholder': 'Ej. F00000000', 'login.password': 'Contraseña', 'login.entering': 'Entrando...', 'login.forgot': 'No recuerdo la contraseña', 'login.required': 'Introduce el CIF de la asociación y la contraseña.', 'login.failed': 'No hemos podido iniciar sesión. Revisa el CIF y la contraseña.',
    'attachments.select': 'Adjuntar archivo', 'attachments.selected': 'Archivos seleccionados', 'login.adminAccess': 'Soy personal de administración'
  },
  va: {
    'language.spanish': 'Castellà', 'language.valencian': 'Valencià', 'language.english': 'English', 'language.label': 'Idioma',
    'nav.home': 'Inici', 'nav.members': 'Associats', 'nav.data': 'Dades', 'nav.calendar': 'Calendari', 'nav.registrations': 'Inscripcions', 'nav.forms': 'Formularis', 'nav.exercises': 'Exercicis', 'nav.record': 'Registre', 'nav.requests': 'Sol·licituds', 'nav.permissions': 'Permisos',
    'common.support': 'Suport', 'common.adminSupport': 'Suport administratiu', 'common.logout': 'Eixir', 'common.close': 'Tancar', 'common.cancel': 'Cancel·lar', 'common.loading': 'Carregant...',
    'login.accessAssociations': 'Accés associacions', 'login.title': 'Secretaria FFSJ', 'login.subtitle': 'Accés per a fogueres i barraques.', 'login.help': 'Entra amb el CIF de la teua associació i la contrasenya facilitada per Secretaria.', 'login.identification': 'Identificació', 'login.enterAssociation': 'Entrar com a associació', 'login.credentialsHelp': 'Utilitza les credencials de l’entitat, no les d’una persona concreta.', 'login.cif': 'CIF de l’associació', 'login.cifPlaceholder': 'Ex. F00000000', 'login.password': 'Contrasenya', 'login.entering': 'Entrant...', 'login.forgot': 'No recorde la contrasenya', 'login.required': 'Introdueix el CIF de l’associació i la contrasenya.', 'login.failed': 'No s’ha pogut iniciar sessió. Revisa el CIF i la contrasenya.',
    'attachments.select': 'Adjuntar arxiu', 'attachments.selected': 'Arxius seleccionats', 'login.adminAccess': 'Soc personal d’administració'
  },
  en: {
    'language.spanish': 'Spanish', 'language.valencian': 'Valencian', 'language.english': 'English', 'language.label': 'Language',
    'nav.home': 'Home', 'nav.members': 'Members', 'nav.data': 'Details', 'nav.calendar': 'Calendar', 'nav.registrations': 'Registrations', 'nav.forms': 'Forms', 'nav.exercises': 'Financial years', 'nav.record': 'Records', 'nav.requests': 'Requests', 'nav.permissions': 'Permissions',
    'common.support': 'Support', 'common.adminSupport': 'Administrative support', 'common.logout': 'Sign out', 'common.close': 'Close', 'common.cancel': 'Cancel', 'common.loading': 'Loading...',
    'login.accessAssociations': 'Association access', 'login.title': 'FFSJ Secretariat', 'login.subtitle': 'Access for bonfire and barraca groups.', 'login.help': 'Sign in with your association CIF and the password supplied by the Secretariat.', 'login.identification': 'Identification', 'login.enterAssociation': 'Sign in as an association', 'login.credentialsHelp': 'Use the organisation credentials, not those of an individual.', 'login.cif': 'Association CIF', 'login.cifPlaceholder': 'E.g. F00000000', 'login.password': 'Password', 'login.entering': 'Signing in...', 'login.forgot': 'I do not remember my password', 'login.required': 'Enter the association CIF and password.', 'login.failed': 'We could not sign you in. Check the CIF and password.',
    'attachments.select': 'Attach file', 'attachments.selected': 'Selected files', 'login.adminAccess': 'I am administrative staff'
  }
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storageKey = 'ffsj-secretaria.language';
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(this.initialLanguage());
  readonly languageChanges = this.languageSubject.asObservable();
  get language(): AppLanguage { return this.languageSubject.value; }
  setLanguage(language: AppLanguage): void { localStorage.setItem(this.storageKey, language); this.languageSubject.next(language); }
  t(key: string): string { return translations[this.language][key] || translations.es[key] || key; }
  private initialLanguage(): AppLanguage { const saved = localStorage.getItem(this.storageKey); return saved === 'va' || saved === 'en' || saved === 'es' ? saved : 'es'; }
}

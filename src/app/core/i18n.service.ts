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
    ,'rubi.open': 'Abrir Rubi, asistente virtual', 'rubi.close': 'Cerrar Rubi', 'rubi.name': 'Rubi', 'rubi.you': 'Tu', 'rubi.status': 'Estado', 'rubi.subtitle': 'Tu asistente virtual de Secretaria FFSJ', 'rubi.welcome': 'Hola, soy Rubi, tu asistente virtual de Secretaria FFSJ. En que puedo ayudarte?', 'rubi.quickActions': 'Consultas frecuentes', 'rubi.quick.alta': 'Dar de alta a una persona', 'rubi.quick.documents': 'Enviar documentacion', 'rubi.quick.inscriptions': 'Inscribirme en una actividad', 'rubi.quick.support': 'Tengo un problema', 'rubi.inputLabel': 'Escribe tu consulta a Rubi', 'rubi.placeholder': 'Escribe tu consulta...', 'rubi.send': 'Enviar', 'rubi.workflow.cancel': 'Cancelar trámite y volver al chat', 'rubi.loading': 'Rubi esta preparando una respuesta...', 'rubi.disabled': 'Rubi no esta disponible en este momento.', 'rubi.error.auth': 'Tu sesion no permite usar Rubi. Vuelve a iniciar sesion.', 'rubi.error.limit': 'Has alcanzado el limite temporal de consultas. Intentalo de nuevo en unos minutos.', 'rubi.error.disabled': 'Rubi esta deshabilitada temporalmente.', 'rubi.error.unavailable': 'Rubi no esta disponible temporalmente. Intentalo de nuevo mas tarde.', 'rubi.error.timeout': 'Rubi ha tardado demasiado en responder. Puedes volver a intentarlo.', 'rubi.error.invalid': 'No hemos podido procesar la respuesta de Rubi. Puedes volver a intentarlo.', 'rubi.target.label': 'Asociación sobre la que consultar', 'rubi.target.none': 'Ninguna seleccionada', 'rubi.insights.title': 'Puede interesarte', 'rubi.insights.open': 'Ver', 'rubi.insight.comunicaciones.una': 'Tienes una comunicación nueva de la Federación.', 'rubi.insight.comunicaciones.varias': 'Tienes {count} comunicaciones nuevas de la Federación.', 'rubi.insight.actividades.hoy': 'El plazo de inscripción de «{title}» termina hoy.', 'rubi.insight.actividades.manana': 'El plazo de inscripción de «{title}» termina mañana.', 'rubi.insight.actividades.dias': 'El plazo de inscripción de «{title}» termina en {days} días.', 'rubi.insight.solicitudes.incidencia': 'Tienes {count} solicitudes con una incidencia pendiente de tu respuesta.', 'rubi.insight.solicitudes.autorizaciones': 'Tienes {count} autorizaciones de alta pendientes de firma.', 'rubi.insight.solicitudes.admin': 'Hay {count} solicitudes pendientes de revisión.', 'rubi.action.personas': 'Ir a Personas', 'rubi.action.registro': 'Ir a Registro', 'rubi.action.inscripciones': 'Abrir Inscripciones', 'rubi.action.soporte': 'Abrir Soporte', 'rubi.action.calendario': 'Abrir Calendario', 'rubi.action.solicitudes': 'Ir a Solicitudes', 'rubi.action.alta': 'Preparar alta con Rubi',
    'rubi.alta.title': 'Alta asistida', 'rubi.alta.privacy': 'Introduce los datos en este formulario seguro. No se envían al proveedor de IA ni al historial de conversación.', 'rubi.alta.field.person': 'Persona', 'rubi.alta.field.identification': 'DNI, NIE, pasaporte o SIP', 'rubi.alta.field.birthDate': 'Fecha de nacimiento', 'rubi.alta.field.type': 'Tipo', 'rubi.alta.field.roles': 'Cargos', 'rubi.alta.field.exercise': 'Ejercicio', 'rubi.alta.field.name': 'Nombre', 'rubi.alta.field.surnames': 'Apellidos', 'rubi.alta.field.address': 'Dirección', 'rubi.alta.field.postcode': 'Código postal', 'rubi.alta.field.city': 'Localidad', 'rubi.alta.field.province': 'Provincia', 'rubi.alta.field.phone': 'Teléfono', 'rubi.alta.field.email': 'Correo electrónico', 'rubi.alta.type.adult': 'Hoguera adulta', 'rubi.alta.type.child': 'Hoguera infantil', 'rubi.alta.contact.title': 'Datos de contacto opcionales', 'rubi.alta.role.full': 'Caso complejo: se revisará en el flujo normal.', 'rubi.alta.representation.title': 'Representación legal', 'rubi.alta.representation.help': 'Para una persona menor, la primera representación es obligatoria.', 'rubi.alta.field.representativeName': 'Nombre de la representación', 'rubi.alta.field.representativePhone': 'Teléfono de la representación', 'rubi.alta.field.secondRepresentativeName': 'Segunda representación', 'rubi.alta.field.secondRepresentativePhone': 'Teléfono de la segunda representación', 'rubi.alta.validation.identification': 'Introduce una identificación válida.', 'rubi.alta.validation.birthDate': 'Introduce una fecha real, no futura.', 'rubi.alta.validation.roles': 'Selecciona al menos un cargo.', 'rubi.alta.boundary': 'Preparar valida el caso y genera un resumen. No confirma ni ejecuta el alta.', 'rubi.alta.prepare': 'Preparar alta', 'rubi.alta.preparing': 'Preparando...', 'rubi.alta.prepared.title': 'Alta preparada', 'rubi.alta.prepared.stop': 'STOP: revisa el resumen. El alta todavía no se ha confirmado ni enviado.', 'rubi.alta.prepared.history': 'Se ha localizado una persona con histórico en Censo.', 'rubi.alta.prepared.certification': 'El trámite requerirá certificación de una asociación anterior cuando continúe por el flujo normal.', 'rubi.alta.prepared.noEffects': 'Esta preparación no crea solicitudes, no genera registros pendientes y no escribe en Censo.', 'rubi.alta.edit': 'Editar datos', 'rubi.alta.normal.title': 'Este caso requiere el flujo normal', 'rubi.alta.normal.description': 'Secretaría ha detectado un conflicto que no debe resolverse automáticamente desde Rubi.', 'rubi.alta.normal.conflict': 'Conflicto de cargo', 'rubi.alta.normal.open': 'Abrir flujo normal', 'rubi.alta.cancelled': 'He cancelado el alta asistida y he limpiado sus datos del panel.', 'rubi.alta.expired': 'La preparación ha caducado y sus datos se han limpiado. Puedes iniciar otra alta.', 'rubi.alta.error.permission': 'No tienes permiso para preparar altas.', 'rubi.alta.error.exercise': 'Selecciona el ejercicio activo e iniciado para preparar un alta.', 'rubi.alta.error.options': 'No se han podido cargar los cargos. Puedes usar el flujo normal.', 'rubi.alta.error.form': 'Revisa los campos obligatorios y los formatos indicados.', 'rubi.alta.error.representative': 'Indica nombre y teléfono válidos para la primera representación legal.', 'rubi.alta.error.duplicate': 'Ya existe un alta pendiente o una solicitud abierta para esta persona.', 'rubi.alta.error.active': 'Esta persona ya está activa en la asociación.', 'rubi.alta.error.contextChanged': 'El ejercicio o el contexto han cambiado. Revisa el flujo normal.', 'rubi.alta.error.validation': 'Secretaría ha rechazado algún dato. Revísalo antes de volver a preparar.', 'rubi.alta.error.prepare': 'No se ha podido preparar el alta. Ningún trámite se ha ejecutado.'
  },
  va: {
    'language.spanish': 'Castellà', 'language.valencian': 'Valencià', 'language.english': 'English', 'language.label': 'Idioma',
    'nav.home': 'Inici', 'nav.members': 'Associats', 'nav.data': 'Dades', 'nav.calendar': 'Calendari', 'nav.registrations': 'Inscripcions', 'nav.forms': 'Formularis', 'nav.exercises': 'Exercicis', 'nav.record': 'Registre', 'nav.requests': 'Sol·licituds', 'nav.permissions': 'Permisos',
    'common.support': 'Suport', 'common.adminSupport': 'Suport administratiu', 'common.logout': 'Eixir', 'common.close': 'Tancar', 'common.cancel': 'Cancel·lar', 'common.loading': 'Carregant...',
    'login.accessAssociations': 'Accés associacions', 'login.title': 'Secretaria FFSJ', 'login.subtitle': 'Accés per a fogueres i barraques.', 'login.help': 'Entra amb el CIF de la teua associació i la contrasenya facilitada per Secretaria.', 'login.identification': 'Identificació', 'login.enterAssociation': 'Entrar com a associació', 'login.credentialsHelp': 'Utilitza les credencials de l’entitat, no les d’una persona concreta.', 'login.cif': 'CIF de l’associació', 'login.cifPlaceholder': 'Ex. F00000000', 'login.password': 'Contrasenya', 'login.entering': 'Entrant...', 'login.forgot': 'No recorde la contrasenya', 'login.required': 'Introdueix el CIF de l’associació i la contrasenya.', 'login.failed': 'No s’ha pogut iniciar sessió. Revisa el CIF i la contrasenya.',
    'attachments.select': 'Adjuntar arxiu', 'attachments.selected': 'Arxius seleccionats', 'login.adminAccess': 'Soc personal d’administració'
    ,'rubi.open': 'Obrir Rubi, assistent virtual', 'rubi.close': 'Tancar Rubi', 'rubi.name': 'Rubi', 'rubi.you': 'Tu', 'rubi.status': 'Estat', 'rubi.subtitle': 'El teu assistent virtual de Secretaria FFSJ', 'rubi.welcome': 'Hola, soc Rubi, el teu assistent virtual de Secretaria FFSJ. En que et puc ajudar?', 'rubi.quickActions': 'Consultes frequents', 'rubi.quick.alta': "Donar d'alta una persona", 'rubi.quick.documents': 'Enviar documentacio', 'rubi.quick.inscriptions': "Inscriure'm en una activitat", 'rubi.quick.support': 'Tinc un problema', 'rubi.inputLabel': 'Escriu la teua consulta a Rubi', 'rubi.placeholder': 'Escriu la teua consulta...', 'rubi.send': 'Enviar', 'rubi.workflow.cancel': 'Cancel·lar el tràmit i tornar al xat', 'rubi.loading': 'Rubi esta preparant una resposta...', 'rubi.disabled': 'Rubi no esta disponible en aquest moment.', 'rubi.error.auth': 'La teua sessio no permet usar Rubi. Torna a iniciar sessio.', 'rubi.error.limit': 'Has arribat al limit temporal de consultes. Torna-ho a intentar en uns minuts.', 'rubi.error.disabled': 'Rubi esta deshabilitada temporalment.', 'rubi.error.unavailable': 'Rubi no esta disponible temporalment. Torna-ho a intentar mes tard.', 'rubi.error.timeout': 'Rubi ha tardat massa a respondre. Pots tornar-ho a intentar.', 'rubi.error.invalid': 'No hem pogut processar la resposta de Rubi. Pots tornar-ho a intentar.', 'rubi.target.label': 'Associació sobre la qual consultar', 'rubi.target.none': 'Cap seleccionada', 'rubi.insights.title': 'Pot interessar-te', 'rubi.insights.open': 'Veure', 'rubi.insight.comunicaciones.una': 'Tens una comunicació nova de la Federació.', 'rubi.insight.comunicaciones.varias': 'Tens {count} comunicacions noves de la Federació.', 'rubi.insight.actividades.hoy': "El termini d'inscripció de «{title}» acaba hui.", 'rubi.insight.actividades.manana': "El termini d'inscripció de «{title}» acaba demà.", 'rubi.insight.actividades.dias': "El termini d'inscripció de «{title}» acaba en {days} dies.", 'rubi.insight.solicitudes.incidencia': 'Tens {count} sol·licituds amb una incidència pendent de la teua resposta.', 'rubi.insight.solicitudes.autorizaciones': "Tens {count} autoritzacions d'alta pendents de firma.", 'rubi.insight.solicitudes.admin': 'Hi ha {count} sol·licituds pendents de revisió.', 'rubi.action.personas': 'Anar a Persones', 'rubi.action.registro': 'Anar a Registre', 'rubi.action.inscripciones': 'Obrir Inscripcions', 'rubi.action.soporte': 'Obrir Suport', 'rubi.action.calendario': 'Obrir Calendari', 'rubi.action.solicitudes': 'Anar a Sollicituds', 'rubi.action.alta': 'Preparar alta amb Rubi',
    'rubi.alta.title': 'Alta assistida', 'rubi.alta.privacy': "Introduïx les dades en este formulari segur. No s'envien al proveïdor d'IA ni a l'historial de conversa.", 'rubi.alta.field.person': 'Persona', 'rubi.alta.field.identification': 'DNI, NIE, passaport o SIP', 'rubi.alta.field.birthDate': 'Data de naixement', 'rubi.alta.field.type': 'Tipus', 'rubi.alta.field.roles': 'Càrrecs', 'rubi.alta.field.exercise': 'Exercici', 'rubi.alta.field.name': 'Nom', 'rubi.alta.field.surnames': 'Cognoms', 'rubi.alta.field.address': 'Adreça', 'rubi.alta.field.postcode': 'Codi postal', 'rubi.alta.field.city': 'Localitat', 'rubi.alta.field.province': 'Província', 'rubi.alta.field.phone': 'Telèfon', 'rubi.alta.field.email': 'Correu electrònic', 'rubi.alta.type.adult': 'Foguera adulta', 'rubi.alta.type.child': 'Foguera infantil', 'rubi.alta.contact.title': 'Dades de contacte opcionals', 'rubi.alta.role.full': 'Cas complex: es revisarà en el flux normal.', 'rubi.alta.representation.title': 'Representació legal', 'rubi.alta.representation.help': 'Per a una persona menor, la primera representació és obligatòria.', 'rubi.alta.field.representativeName': 'Nom de la representació', 'rubi.alta.field.representativePhone': 'Telèfon de la representació', 'rubi.alta.field.secondRepresentativeName': 'Segona representació', 'rubi.alta.field.secondRepresentativePhone': 'Telèfon de la segona representació', 'rubi.alta.validation.identification': 'Introduïx una identificació vàlida.', 'rubi.alta.validation.birthDate': 'Introduïx una data real, no futura.', 'rubi.alta.validation.roles': 'Selecciona almenys un càrrec.', 'rubi.alta.boundary': "Preparar valida el cas i genera un resum. No confirma ni executa l'alta.", 'rubi.alta.prepare': 'Preparar alta', 'rubi.alta.preparing': 'Preparant...', 'rubi.alta.prepared.title': 'Alta preparada', 'rubi.alta.prepared.stop': "STOP: revisa el resum. L'alta encara no s'ha confirmat ni enviat.", 'rubi.alta.prepared.history': "S'ha localitzat una persona amb històric en Cens.", 'rubi.alta.prepared.certification': "El tràmit requerirà certificació d'una associació anterior quan continue pel flux normal.", 'rubi.alta.prepared.noEffects': 'Esta preparació no crea sol·licituds, no genera registres pendents i no escriu en Cens.', 'rubi.alta.edit': 'Editar dades', 'rubi.alta.normal.title': 'Este cas requerix el flux normal', 'rubi.alta.normal.description': "Secretaria ha detectat un conflicte que no s'ha de resoldre automàticament des de Rubi.", 'rubi.alta.normal.conflict': 'Conflicte de càrrec', 'rubi.alta.normal.open': 'Obrir flux normal', 'rubi.alta.cancelled': "He cancel·lat l'alta assistida i he netejat les dades del panell.", 'rubi.alta.expired': "La preparació ha caducat i les dades s'han netejat. Pots iniciar una altra alta.", 'rubi.alta.error.permission': 'No tens permís per a preparar altes.', 'rubi.alta.error.exercise': "Selecciona l'exercici actiu i iniciat per a preparar una alta.", 'rubi.alta.error.options': 'No s’han pogut carregar els càrrecs. Pots usar el flux normal.', 'rubi.alta.error.form': 'Revisa els camps obligatoris i els formats indicats.', 'rubi.alta.error.representative': 'Indica nom i telèfon vàlids per a la primera representació legal.', 'rubi.alta.error.duplicate': 'Ja existix una alta pendent o una sol·licitud oberta per a esta persona.', 'rubi.alta.error.active': 'Esta persona ja està activa en l’associació.', 'rubi.alta.error.contextChanged': "L'exercici o el context han canviat. Revisa el flux normal.", 'rubi.alta.error.validation': 'Secretaria ha rebutjat alguna dada. Revisa-la abans de tornar a preparar.', 'rubi.alta.error.prepare': "No s'ha pogut preparar l'alta. No s'ha executat cap tràmit."
  },
  en: {
    'language.spanish': 'Spanish', 'language.valencian': 'Valencian', 'language.english': 'English', 'language.label': 'Language',
    'nav.home': 'Home', 'nav.members': 'Members', 'nav.data': 'Details', 'nav.calendar': 'Calendar', 'nav.registrations': 'Registrations', 'nav.forms': 'Forms', 'nav.exercises': 'Financial years', 'nav.record': 'Records', 'nav.requests': 'Requests', 'nav.permissions': 'Permissions',
    'common.support': 'Support', 'common.adminSupport': 'Administrative support', 'common.logout': 'Sign out', 'common.close': 'Close', 'common.cancel': 'Cancel', 'common.loading': 'Loading...',
    'login.accessAssociations': 'Association access', 'login.title': 'FFSJ Secretariat', 'login.subtitle': 'Access for bonfire and barraca groups.', 'login.help': 'Sign in with your association CIF and the password supplied by the Secretariat.', 'login.identification': 'Identification', 'login.enterAssociation': 'Sign in as an association', 'login.credentialsHelp': 'Use the organisation credentials, not those of an individual.', 'login.cif': 'Association CIF', 'login.cifPlaceholder': 'E.g. F00000000', 'login.password': 'Password', 'login.entering': 'Signing in...', 'login.forgot': 'I do not remember my password', 'login.required': 'Enter the association CIF and password.', 'login.failed': 'We could not sign you in. Check the CIF and password.',
    'attachments.select': 'Attach file', 'attachments.selected': 'Selected files', 'login.adminAccess': 'I am administrative staff'
    ,'rubi.open': 'Open Rubi, virtual assistant', 'rubi.close': 'Close Rubi', 'rubi.name': 'Rubi', 'rubi.you': 'You', 'rubi.status': 'Status', 'rubi.subtitle': 'Your FFSJ Secretariat virtual assistant', 'rubi.welcome': 'Hello! I am Rubi, your FFSJ Secretariat virtual assistant. How can I help you?', 'rubi.quickActions': 'Common requests', 'rubi.quick.alta': 'Register a person', 'rubi.quick.documents': 'Send documentation', 'rubi.quick.inscriptions': 'Register for an activity', 'rubi.quick.support': 'I have a problem', 'rubi.inputLabel': 'Write your question for Rubi', 'rubi.placeholder': 'Write your question...', 'rubi.send': 'Send', 'rubi.workflow.cancel': 'Cancel process and return to chat', 'rubi.loading': 'Rubi is preparing an answer...', 'rubi.disabled': 'Rubi is not available at the moment.', 'rubi.error.auth': 'Your session cannot use Rubi. Please sign in again.', 'rubi.error.limit': 'You have reached the temporary question limit. Try again in a few minutes.', 'rubi.error.disabled': 'Rubi is temporarily disabled.', 'rubi.error.unavailable': 'Rubi is temporarily unavailable. Please try again later.', 'rubi.error.timeout': 'Rubi took too long to answer. You can try again.', 'rubi.error.invalid': 'We could not process Rubi response. You can try again.', 'rubi.target.label': 'Association to query', 'rubi.target.none': 'None selected', 'rubi.insights.title': 'You might be interested in', 'rubi.insights.open': 'View', 'rubi.insight.comunicaciones.una': 'You have a new communication from the Federation.', 'rubi.insight.comunicaciones.varias': 'You have {count} new communications from the Federation.', 'rubi.insight.actividades.hoy': 'The registration deadline for "{title}" ends today.', 'rubi.insight.actividades.manana': 'The registration deadline for "{title}" ends tomorrow.', 'rubi.insight.actividades.dias': 'The registration deadline for "{title}" ends in {days} days.', 'rubi.insight.solicitudes.incidencia': 'You have {count} requests with an incident pending your response.', 'rubi.insight.solicitudes.autorizaciones': 'You have {count} registration authorizations pending signature.', 'rubi.insight.solicitudes.admin': 'There are {count} requests pending review.', 'rubi.action.personas': 'Go to People', 'rubi.action.registro': 'Go to Records', 'rubi.action.inscripciones': 'Open Registrations', 'rubi.action.soporte': 'Open Support', 'rubi.action.calendario': 'Open Calendar', 'rubi.action.solicitudes': 'Go to Requests', 'rubi.action.alta': 'Prepare registration with Rubi',
    'rubi.alta.title': 'Assisted registration', 'rubi.alta.privacy': 'Enter the details in this secure form. They are not sent to the AI provider or added to conversation history.', 'rubi.alta.field.person': 'Person', 'rubi.alta.field.identification': 'ID, passport or SIP', 'rubi.alta.field.birthDate': 'Date of birth', 'rubi.alta.field.type': 'Type', 'rubi.alta.field.roles': 'Roles', 'rubi.alta.field.exercise': 'Financial year', 'rubi.alta.field.name': 'First name', 'rubi.alta.field.surnames': 'Surnames', 'rubi.alta.field.address': 'Address', 'rubi.alta.field.postcode': 'Postcode', 'rubi.alta.field.city': 'Town or city', 'rubi.alta.field.province': 'Province', 'rubi.alta.field.phone': 'Telephone', 'rubi.alta.field.email': 'Email', 'rubi.alta.type.adult': 'Adult bonfire', 'rubi.alta.type.child': 'Children’s bonfire', 'rubi.alta.contact.title': 'Optional contact details', 'rubi.alta.role.full': 'Complex case: it will be reviewed in the standard flow.', 'rubi.alta.representation.title': 'Legal representation', 'rubi.alta.representation.help': 'For a minor, the first legal representative is required.', 'rubi.alta.field.representativeName': 'Representative name', 'rubi.alta.field.representativePhone': 'Representative telephone', 'rubi.alta.field.secondRepresentativeName': 'Second representative', 'rubi.alta.field.secondRepresentativePhone': 'Second representative telephone', 'rubi.alta.validation.identification': 'Enter a valid identifier.', 'rubi.alta.validation.birthDate': 'Enter a real date that is not in the future.', 'rubi.alta.validation.roles': 'Select at least one role.', 'rubi.alta.boundary': 'Prepare validates the case and creates a summary. It does not confirm or execute the registration.', 'rubi.alta.prepare': 'Prepare registration', 'rubi.alta.preparing': 'Preparing...', 'rubi.alta.prepared.title': 'Registration prepared', 'rubi.alta.prepared.stop': 'STOP: review the summary. The registration has not been confirmed or submitted.', 'rubi.alta.prepared.history': 'A person with Census history has been found.', 'rubi.alta.prepared.certification': 'The process will require certification from a previous association when it continues through the standard flow.', 'rubi.alta.prepared.noEffects': 'This preparation does not create a request, generate a pending record or write to Census.', 'rubi.alta.edit': 'Edit details', 'rubi.alta.normal.title': 'This case requires the standard flow', 'rubi.alta.normal.description': 'The Secretariat detected a conflict that must not be resolved automatically through Rubi.', 'rubi.alta.normal.conflict': 'Role conflict', 'rubi.alta.normal.open': 'Open standard flow', 'rubi.alta.cancelled': 'I cancelled the assisted registration and cleared its details from the panel.', 'rubi.alta.expired': 'The preparation expired and its details were cleared. You can start another registration.', 'rubi.alta.error.permission': 'You do not have permission to prepare registrations.', 'rubi.alta.error.exercise': 'Select the active, started financial year to prepare a registration.', 'rubi.alta.error.options': 'The available roles could not be loaded. You can use the standard flow.', 'rubi.alta.error.form': 'Check the required fields and indicated formats.', 'rubi.alta.error.representative': 'Enter a valid name and telephone for the first legal representative.', 'rubi.alta.error.duplicate': 'There is already a pending registration or open request for this person.', 'rubi.alta.error.active': 'This person is already active in the association.', 'rubi.alta.error.contextChanged': 'The financial year or context changed. Review the standard flow.', 'rubi.alta.error.validation': 'The Secretariat rejected one or more details. Review them before preparing again.', 'rubi.alta.error.prepare': 'The registration could not be prepared. No process was executed.'
  }
};

Object.assign(translations.es, {
  'rubi.pilot': 'Piloto interno', 'rubi.feedback.question': '¿Te ha resultado útil?', 'rubi.feedback.helpful': 'Útil', 'rubi.feedback.notHelpful': 'No útil', 'rubi.feedback.thanks': 'Gracias por tu feedback',
  'rubi.alta.error.cargo': 'El cargo seleccionado no está disponible. Revisa la selección o utiliza el flujo normal.',
  'rubi.alta.error.normalFlow': 'Este caso requiere revisión mediante el flujo normal de altas.',
  'rubi.alta.error.expired': 'La preparación ya no está vigente. Vuelve a preparar el alta.',
  'rubi.alta.confirm.title': 'Confirmación administrativa',
  'rubi.alta.confirm.warning': 'Esta acción registrará un trámite real de alta en Secretaría. Se volverán a validar los datos y no se escribirá directamente en Censo.',
  'rubi.alta.confirm.accept': 'He revisado el resumen y quiero registrar el trámite de alta.',
  'rubi.alta.confirm.action': 'Confirmar alta y registrar trámite',
  'rubi.alta.confirming': 'Registrando trámite...',
  'rubi.alta.confirm.disabled': 'La confirmación transaccional no está habilitada. La preparación puede revisarse, editarse o cancelarse.',
  'rubi.alta.confirmed.title': 'Trámite de alta registrado',
  'rubi.alta.confirmed.description': 'Secretaría ha registrado el trámite administrativo. La persona no se incorpora directamente a Censo.',
  'rubi.alta.confirmed.reference': 'Referencia del trámite',
  'rubi.alta.confirmed.signature': 'El siguiente paso corresponde a la firma y validación administrativa de la solicitud.',
  'rubi.alta.confirmed.certifications': 'El trámite continúa por el circuito de certificaciones previo a su validación administrativa.',
  'rubi.alta.error.confirm': 'No se ha podido confirmar el alta. Si la respuesta se perdió, puedes reintentarlo con seguridad.',
  'rubi.alta.error.transactionDisabled': 'La confirmación transaccional no está habilitada.'
});
Object.assign(translations.va, {
  'rubi.pilot': 'Pilot intern', 'rubi.feedback.question': 'T’ha resultat útil?', 'rubi.feedback.helpful': 'Útil', 'rubi.feedback.notHelpful': 'No útil', 'rubi.feedback.thanks': 'Gràcies pel teu feedback',
  'rubi.alta.error.cargo': 'El càrrec seleccionat no està disponible. Revisa la selecció o utilitza el flux normal.',
  'rubi.alta.error.normalFlow': "Este cas requerix revisió mitjançant el flux normal d'altes.",
  'rubi.alta.error.expired': "La preparació ja no està vigent. Torna a preparar l'alta.",
  'rubi.alta.confirm.title': 'Confirmació administrativa',
  'rubi.alta.confirm.warning': "Esta acció registrarà un tràmit real d'alta en Secretaria. Es tornaran a validar les dades i no s'escriurà directament en Cens.",
  'rubi.alta.confirm.accept': "He revisat el resum i vull registrar el tràmit d'alta.",
  'rubi.alta.confirm.action': "Confirmar l'alta i registrar el tràmit",
  'rubi.alta.confirming': 'Registrant el tràmit...',
  'rubi.alta.confirm.disabled': 'La confirmació transaccional no està habilitada. La preparació es pot revisar, editar o cancel·lar.',
  'rubi.alta.confirmed.title': "Tràmit d'alta registrat",
  'rubi.alta.confirmed.description': "Secretaria ha registrat el tràmit administratiu. La persona no s'incorpora directament a Cens.",
  'rubi.alta.confirmed.reference': 'Referència del tràmit',
  'rubi.alta.confirmed.signature': 'El pas següent correspon a la firma i validació administrativa de la sol·licitud.',
  'rubi.alta.confirmed.certifications': 'El tràmit continua pel circuit de certificacions previ a la validació administrativa.',
  'rubi.alta.error.confirm': "No s'ha pogut confirmar l'alta. Si la resposta s'ha perdut, pots tornar-ho a intentar amb seguretat.",
  'rubi.alta.error.transactionDisabled': 'La confirmació transaccional no està habilitada.'
});
Object.assign(translations.en, {
  'rubi.pilot': 'Internal pilot', 'rubi.feedback.question': 'Was this helpful?', 'rubi.feedback.helpful': 'Helpful', 'rubi.feedback.notHelpful': 'Not helpful', 'rubi.feedback.thanks': 'Thank you for your feedback',
  'rubi.alta.error.cargo': 'The selected role is unavailable. Review the selection or use the standard flow.',
  'rubi.alta.error.normalFlow': 'This case requires review through the standard registration flow.',
  'rubi.alta.error.expired': 'The preparation is no longer valid. Prepare the registration again.',
  'rubi.alta.confirm.title': 'Administrative confirmation',
  'rubi.alta.confirm.warning': 'This action will register a real administrative process in the Secretariat. The details will be validated again and no direct write will be made to Census.',
  'rubi.alta.confirm.accept': 'I have reviewed the summary and want to register the process.',
  'rubi.alta.confirm.action': 'Confirm registration and register process',
  'rubi.alta.confirming': 'Registering process...',
  'rubi.alta.confirm.disabled': 'Transactional confirmation is not enabled. You can review, edit or cancel the preparation.',
  'rubi.alta.confirmed.title': 'Registration process recorded',
  'rubi.alta.confirmed.description': 'The Secretariat recorded the administrative process. The person is not added directly to Census.',
  'rubi.alta.confirmed.reference': 'Process reference',
  'rubi.alta.confirmed.signature': 'The next step is the signature and administrative validation of the request.',
  'rubi.alta.confirmed.certifications': 'The process continues through the certification circuit before administrative validation.',
  'rubi.alta.error.confirm': 'The registration could not be confirmed. If the response was lost, you can retry safely.',
  'rubi.alta.error.transactionDisabled': 'Transactional confirmation is not enabled.'
});

Object.assign(translations.es, {
  'rubi.minimize': 'Minimizar Rubi', 'rubi.ready': 'Disponible', 'rubi.launcher.help': '¿Te ayudo?',
  'rubi.welcome.eyebrow': 'Asistente de Secretaría', 'rubi.welcome.title': '¿En qué puedo ayudarte?', 'rubi.welcome.description': 'Te ayudo a encontrar información, navegar y preparar trámites de forma segura.',
  'rubi.quick.registro': 'Abrir Registro', 'rubi.quick.calendario': 'Consultar calendario', 'rubi.quick.help': '¿Qué puedes hacer?',
  'rubi.alta.guided': 'Trámite guiado', 'rubi.alta.progress': 'Progreso del alta', 'rubi.alta.step.details': 'Datos', 'rubi.alta.step.review': 'Revisión', 'rubi.alta.step.record': 'Trámite',
  'rubi.alta.section.person': 'Datos de la persona', 'rubi.alta.section.person.help': 'Identificación y datos básicos.', 'rubi.alta.section.roles': 'Cargo en la asociación', 'rubi.alta.section.roles.help': 'Selecciona el cargo que corresponde.', 'rubi.alta.section.optional': 'Opcional',
  'rubi.alta.prepared.badge': 'Preparación completada', 'rubi.alta.prepared.pending': 'Pendiente de confirmación', 'rubi.alta.registered.badge': 'Trámite registrado', 'rubi.alta.normal.badge': 'Revisión necesaria'
});
Object.assign(translations.va, {
  'rubi.minimize': 'Minimitzar Rubi', 'rubi.ready': 'Disponible', 'rubi.launcher.help': 'T’ajude?',
  'rubi.welcome.eyebrow': 'Assistent de Secretaria', 'rubi.welcome.title': 'En què puc ajudar-te?', 'rubi.welcome.description': 'T’ajude a trobar informació, navegar i preparar tràmits de manera segura.',
  'rubi.quick.registro': 'Obrir Registre', 'rubi.quick.calendario': 'Consultar calendari', 'rubi.quick.help': 'Què pots fer?',
  'rubi.alta.guided': 'Tràmit guiat', 'rubi.alta.progress': 'Progrés de l’alta', 'rubi.alta.step.details': 'Dades', 'rubi.alta.step.review': 'Revisió', 'rubi.alta.step.record': 'Tràmit',
  'rubi.alta.section.person': 'Dades de la persona', 'rubi.alta.section.person.help': 'Identificació i dades bàsiques.', 'rubi.alta.section.roles': 'Càrrec en l’associació', 'rubi.alta.section.roles.help': 'Selecciona el càrrec que correspon.', 'rubi.alta.section.optional': 'Opcional',
  'rubi.alta.prepared.badge': 'Preparació completada', 'rubi.alta.prepared.pending': 'Pendent de confirmació', 'rubi.alta.registered.badge': 'Tràmit registrat', 'rubi.alta.normal.badge': 'Revisió necessària'
});
Object.assign(translations.en, {
  'rubi.minimize': 'Minimize Rubi', 'rubi.ready': 'Available', 'rubi.launcher.help': 'Can I help?',
  'rubi.welcome.eyebrow': 'Secretariat assistant', 'rubi.welcome.title': 'How can I help you?', 'rubi.welcome.description': 'I can help you find information, navigate and prepare processes safely.',
  'rubi.quick.registro': 'Open records', 'rubi.quick.calendario': 'Check calendar', 'rubi.quick.help': 'What can you do?',
  'rubi.alta.guided': 'Guided process', 'rubi.alta.progress': 'Registration progress', 'rubi.alta.step.details': 'Details', 'rubi.alta.step.review': 'Review', 'rubi.alta.step.record': 'Process',
  'rubi.alta.section.person': 'Person details', 'rubi.alta.section.person.help': 'Identification and essential details.', 'rubi.alta.section.roles': 'Association role', 'rubi.alta.section.roles.help': 'Choose the applicable role.', 'rubi.alta.section.optional': 'Optional',
  'rubi.alta.prepared.badge': 'Preparation completed', 'rubi.alta.prepared.pending': 'Awaiting confirmation', 'rubi.alta.registered.badge': 'Process recorded', 'rubi.alta.normal.badge': 'Review required'
});

Object.assign(translations.es, {
  'rubi.action.modificacion': 'Preparar modificacion con Rubi', 'rubi.mod.guided': 'Tramite guiado',
  'rubi.mod.title': 'Modificacion asistida', 'rubi.mod.privacy': 'Selecciona y edita la persona en este formulario seguro. Sus datos no se envian al proveedor de IA.',
  'rubi.mod.step.person': 'Persona', 'rubi.mod.step.details': 'Cambios', 'rubi.mod.step.review': 'Revision',
  'rubi.mod.select.title': 'Selecciona la persona', 'rubi.mod.select.help': 'Solo se muestran personas de la asociacion y ejercicio actuales.', 'rubi.mod.select.placeholder': 'Selecciona una persona',
  'rubi.mod.data.title': 'Datos permitidos', 'rubi.mod.boundary': 'Preparar valida y muestra el antes y despues. No registra ni aplica la modificacion.',
  'rubi.mod.prepare': 'Preparar modificacion', 'rubi.mod.prepared.badge': 'PREPARADA', 'rubi.mod.prepared.title': 'Modificacion preparada',
  'rubi.mod.prepared.pending': 'Pendiente de confirmacion', 'rubi.mod.prepared.stop': 'Revisa exactamente los cambios antes de confirmar.',
  'rubi.mod.prepared.noEffects': 'La preparacion no crea solicitudes ni escribe en Censo.', 'rubi.mod.before': 'Antes', 'rubi.mod.after': 'Despues',
  'rubi.mod.confirm.title': 'Confirmacion humana', 'rubi.mod.confirm.warning': 'Confirmar registrara el tramite administrativo de modificacion.',
  'rubi.mod.confirm.accept': 'He revisado el antes y despues y quiero registrar el tramite.', 'rubi.mod.confirm.action': 'Confirmar y registrar', 'rubi.mod.confirming': 'Registrando...',
  'rubi.mod.edit': 'Editar cambios', 'rubi.mod.registered.badge': 'REGISTRADA', 'rubi.mod.confirmed.title': 'Modificacion registrada',
  'rubi.mod.confirmed.description': 'La solicitud administrativa se ha registrado. No se ha escrito directamente en Censo.', 'rubi.mod.reference': 'Solicitud',
  'rubi.mod.normal.title': 'Este caso requiere el flujo normal', 'rubi.mod.normal.description': 'El cambio de cargo requiere sustitucion, cupo o una revision especial.', 'rubi.mod.normal.open': 'Abrir flujo normal',
  'rubi.mod.cancelled': 'He cancelado la modificacion asistida y limpiado sus datos.', 'rubi.mod.expired': 'La preparacion ha caducado y sus datos se han limpiado.',
  'rubi.mod.error.permission': 'No tienes permiso para preparar modificaciones.', 'rubi.mod.error.exercise': 'Selecciona el ejercicio activo e iniciado.',
  'rubi.mod.error.options': 'No se han podido cargar las personas o cargos.', 'rubi.mod.error.form': 'Revisa los campos y formatos.',
  'rubi.mod.error.noChanges': 'No has realizado ningun cambio.', 'rubi.mod.error.duplicate': 'Ya existe una modificacion pendiente para esta persona.',
  'rubi.mod.error.person': 'La persona ya no esta disponible en esta asociacion y ejercicio.', 'rubi.mod.error.expired': 'La preparacion ya no esta vigente.',
  'rubi.mod.error.contextChanged': 'El contexto ha cambiado. Prepara la modificacion de nuevo.', 'rubi.mod.error.transactionDisabled': 'La confirmacion transaccional no esta habilitada.',
  'rubi.mod.error.prepare': 'No se ha podido preparar o registrar la modificacion.',
  'rubi.mod.field.identificacion': 'Identificacion', 'rubi.mod.field.nombre': 'Nombre', 'rubi.mod.field.apellidos': 'Apellidos',
  'rubi.mod.field.nacimiento': 'Fecha de nacimiento', 'rubi.mod.field.telefono': 'Telefono', 'rubi.mod.field.email': 'Correo electronico',
  'rubi.mod.field.direccion': 'Direccion', 'rubi.mod.field.codigo_postal': 'Codigo postal', 'rubi.mod.field.cargos': 'Cargos'
});
Object.assign(translations.es, {
  'rubi.action.baja': 'Preparar baja con Rubi', 'rubi.baja.guided': 'Tramite guiado', 'rubi.baja.title': 'Baja asistida',
  'rubi.baja.privacy': 'Selecciona la persona en este formulario seguro. Sus datos no se envian al proveedor de IA.',
  'rubi.baja.step.person': 'Persona', 'rubi.baja.step.motivo': 'Motivo', 'rubi.baja.step.review': 'Revision',
  'rubi.baja.select.title': 'Selecciona la persona', 'rubi.baja.select.help': 'Solo se muestran personas de la asociacion y ejercicio actuales.', 'rubi.baja.select.placeholder': 'Selecciona una persona',
  'rubi.baja.motivo.title': 'Motivo (opcional)', 'rubi.baja.motivo.help': 'Puedes indicar brevemente el motivo de la baja.', 'rubi.baja.field.motivo': 'Motivo',
  'rubi.baja.boundary': 'Preparar valida el caso y genera un resumen. No registra ni aplica la baja.',
  'rubi.baja.prepare': 'Preparar baja', 'rubi.baja.prepared.badge': 'PREPARADA', 'rubi.baja.prepared.title': 'Baja preparada',
  'rubi.baja.prepared.pending': 'Pendiente de confirmacion', 'rubi.baja.prepared.stop': 'Revisa exactamente lo que ocurrira antes de confirmar.',
  'rubi.baja.prepared.noEffects': 'La preparacion no crea solicitudes ni escribe en Censo.',
  'rubi.baja.summary.person': 'Persona', 'rubi.baja.summary.association': 'Asociacion', 'rubi.baja.summary.exercise': 'Ejercicio',
  'rubi.baja.confirm.title': 'Confirmacion humana', 'rubi.baja.confirm.warning': 'Confirmar registrara el tramite administrativo de baja.',
  'rubi.baja.confirm.accept': 'He revisado el resumen y quiero registrar el tramite.', 'rubi.baja.confirm.action': 'Confirmar y registrar', 'rubi.baja.confirming': 'Registrando...',
  'rubi.baja.edit': 'Volver a revisar', 'rubi.baja.registered.badge': 'REGISTRADA', 'rubi.baja.confirmed.title': 'Baja registrada',
  'rubi.baja.confirmed.description': 'La solicitud administrativa se ha registrado. No se ha escrito directamente en Censo.', 'rubi.baja.reference': 'Solicitud',
  'rubi.baja.normal.title': 'Este caso requiere el flujo normal', 'rubi.baja.normal.description': 'La persona ocupa un cargo obligatorio y requiere sustitucion o una revision especial.', 'rubi.baja.normal.open': 'Abrir flujo normal',
  'rubi.baja.cancelled': 'He cancelado la baja asistida y limpiado sus datos.', 'rubi.baja.expired': 'La preparacion ha caducado y sus datos se han limpiado.',
  'rubi.baja.error.permission': 'No tienes permiso para preparar bajas.', 'rubi.baja.error.exercise': 'Selecciona el ejercicio activo e iniciado.',
  'rubi.baja.error.options': 'No se han podido cargar las personas.', 'rubi.baja.error.form': 'Selecciona una persona valida.',
  'rubi.baja.error.duplicate': 'Ya existe una baja pendiente para esta persona.', 'rubi.baja.error.person': 'La persona ya no esta disponible en esta asociacion y ejercicio.',
  'rubi.baja.error.expired': 'La preparacion ya no esta vigente.', 'rubi.baja.error.contextChanged': 'El contexto ha cambiado. Prepara la baja de nuevo.',
  'rubi.baja.error.transactionDisabled': 'La confirmacion transaccional no esta habilitada.', 'rubi.baja.error.prepare': 'No se ha podido preparar o registrar la baja.'
});
Object.assign(translations.va, {
  'rubi.action.modificacion': 'Preparar modificacio amb Rubi', 'rubi.mod.guided': 'Tramit guiat', 'rubi.mod.title': 'Modificacio assistida',
  'rubi.mod.privacy': "Selecciona i edita la persona en este formulari segur. Les dades no s'envien al proveidor d'IA.",
  'rubi.mod.step.person': 'Persona', 'rubi.mod.step.details': 'Canvis', 'rubi.mod.step.review': 'Revisio', 'rubi.mod.select.title': 'Selecciona la persona',
  'rubi.mod.select.help': "Nomes es mostren persones de l'associacio i exercici actuals.", 'rubi.mod.select.placeholder': 'Selecciona una persona',
  'rubi.mod.data.title': 'Dades permeses', 'rubi.mod.boundary': "Preparar valida i mostra l'abans i el despres. No registra ni aplica la modificacio.",
  'rubi.mod.prepare': 'Preparar modificacio', 'rubi.mod.prepared.badge': 'PREPARADA', 'rubi.mod.prepared.title': 'Modificacio preparada',
  'rubi.mod.prepared.pending': 'Pendent de confirmacio', 'rubi.mod.prepared.stop': 'Revisa exactament els canvis abans de confirmar.',
  'rubi.mod.prepared.noEffects': 'La preparacio no crea sollicituds ni escriu en Cens.', 'rubi.mod.before': 'Abans', 'rubi.mod.after': 'Despres',
  'rubi.mod.confirm.title': 'Confirmacio humana', 'rubi.mod.confirm.warning': 'Confirmar registrara el tramit administratiu de modificacio.',
  'rubi.mod.confirm.accept': "He revisat l'abans i el despres i vull registrar el tramit.", 'rubi.mod.confirm.action': 'Confirmar i registrar', 'rubi.mod.confirming': 'Registrant...',
  'rubi.mod.edit': 'Editar canvis', 'rubi.mod.registered.badge': 'REGISTRADA', 'rubi.mod.confirmed.title': 'Modificacio registrada',
  'rubi.mod.confirmed.description': "La sollicitud administrativa s'ha registrat. No s'ha escrit directament en Cens.", 'rubi.mod.reference': 'Sollicitud',
  'rubi.mod.normal.title': 'Este cas requerix el flux normal', 'rubi.mod.normal.description': 'El canvi de carrec requerix substitucio, cupo o una revisio especial.', 'rubi.mod.normal.open': 'Obrir flux normal',
  'rubi.mod.cancelled': 'He cancellat la modificacio assistida i netejat les dades.', 'rubi.mod.expired': 'La preparacio ha caducat i les dades s han netejat.',
  'rubi.mod.error.permission': 'No tens permis per a preparar modificacions.', 'rubi.mod.error.exercise': "Selecciona l'exercici actiu i iniciat.",
  'rubi.mod.error.options': 'No s han pogut carregar les persones o carrecs.', 'rubi.mod.error.form': 'Revisa els camps i formats.', 'rubi.mod.error.noChanges': 'No has fet cap canvi.',
  'rubi.mod.error.duplicate': 'Ja existix una modificacio pendent per a esta persona.', 'rubi.mod.error.person': 'La persona ja no esta disponible en esta associacio i exercici.',
  'rubi.mod.error.expired': 'La preparacio ja no esta vigent.', 'rubi.mod.error.contextChanged': 'El context ha canviat. Prepara la modificacio de nou.',
  'rubi.mod.error.transactionDisabled': 'La confirmacio transaccional no esta habilitada.', 'rubi.mod.error.prepare': 'No s ha pogut preparar o registrar la modificacio.',
  'rubi.mod.field.identificacion': 'Identificacio', 'rubi.mod.field.nombre': 'Nom', 'rubi.mod.field.apellidos': 'Cognoms', 'rubi.mod.field.nacimiento': 'Data de naixement',
  'rubi.mod.field.telefono': 'Telefon', 'rubi.mod.field.email': 'Correu electronic', 'rubi.mod.field.direccion': 'Adreca', 'rubi.mod.field.codigo_postal': 'Codi postal', 'rubi.mod.field.cargos': 'Carrecs'
});
Object.assign(translations.va, {
  'rubi.action.baja': 'Preparar baixa amb Rubi', 'rubi.baja.guided': 'Tramit guiat', 'rubi.baja.title': 'Baixa assistida',
  'rubi.baja.privacy': "Selecciona la persona en este formulari segur. Les dades no s'envien al proveidor d'IA.",
  'rubi.baja.step.person': 'Persona', 'rubi.baja.step.motivo': 'Motiu', 'rubi.baja.step.review': 'Revisio',
  'rubi.baja.select.title': 'Selecciona la persona', 'rubi.baja.select.help': "Nomes es mostren persones de l'associacio i exercici actuals.", 'rubi.baja.select.placeholder': 'Selecciona una persona',
  'rubi.baja.motivo.title': 'Motiu (opcional)', 'rubi.baja.motivo.help': 'Pots indicar breument el motiu de la baixa.', 'rubi.baja.field.motivo': 'Motiu',
  'rubi.baja.boundary': 'Preparar valida el cas i genera un resum. No registra ni aplica la baixa.',
  'rubi.baja.prepare': 'Preparar baixa', 'rubi.baja.prepared.badge': 'PREPARADA', 'rubi.baja.prepared.title': 'Baixa preparada',
  'rubi.baja.prepared.pending': 'Pendent de confirmacio', 'rubi.baja.prepared.stop': 'Revisa exactament el que ocorrera abans de confirmar.',
  'rubi.baja.prepared.noEffects': 'La preparacio no crea sollicituds ni escriu en Cens.',
  'rubi.baja.summary.person': 'Persona', 'rubi.baja.summary.association': 'Associacio', 'rubi.baja.summary.exercise': 'Exercici',
  'rubi.baja.confirm.title': 'Confirmacio humana', 'rubi.baja.confirm.warning': 'Confirmar registrara el tramit administratiu de baixa.',
  'rubi.baja.confirm.accept': 'He revisat el resum i vull registrar el tramit.', 'rubi.baja.confirm.action': 'Confirmar i registrar', 'rubi.baja.confirming': 'Registrant...',
  'rubi.baja.edit': 'Tornar a revisar', 'rubi.baja.registered.badge': 'REGISTRADA', 'rubi.baja.confirmed.title': 'Baixa registrada',
  'rubi.baja.confirmed.description': "La sollicitud administrativa s'ha registrat. No s'ha escrit directament en Cens.", 'rubi.baja.reference': 'Sollicitud',
  'rubi.baja.normal.title': 'Este cas requerix el flux normal', 'rubi.baja.normal.description': 'La persona ocupa un carrec obligatori i requerix substitucio o una revisio especial.', 'rubi.baja.normal.open': 'Obrir flux normal',
  'rubi.baja.cancelled': 'He cancellat la baixa assistida i netejat les dades.', 'rubi.baja.expired': 'La preparacio ha caducat i les dades s han netejat.',
  'rubi.baja.error.permission': 'No tens permis per a preparar baixes.', 'rubi.baja.error.exercise': "Selecciona l'exercici actiu i iniciat.",
  'rubi.baja.error.options': 'No s han pogut carregar les persones.', 'rubi.baja.error.form': 'Selecciona una persona valida.',
  'rubi.baja.error.duplicate': 'Ja existix una baixa pendent per a esta persona.', 'rubi.baja.error.person': 'La persona ja no esta disponible en esta associacio i exercici.',
  'rubi.baja.error.expired': 'La preparacio ja no esta vigent.', 'rubi.baja.error.contextChanged': 'El context ha canviat. Prepara la baixa de nou.',
  'rubi.baja.error.transactionDisabled': 'La confirmacio transaccional no esta habilitada.', 'rubi.baja.error.prepare': 'No s ha pogut preparar o registrar la baixa.'
});
Object.assign(translations.en, {
  'rubi.action.modificacion': 'Prepare modification with Rubi', 'rubi.mod.guided': 'Guided process', 'rubi.mod.title': 'Assisted modification',
  'rubi.mod.privacy': 'Select and edit the person in this secure form. Their details are not sent to the AI provider.',
  'rubi.mod.step.person': 'Person', 'rubi.mod.step.details': 'Changes', 'rubi.mod.step.review': 'Review', 'rubi.mod.select.title': 'Select the person',
  'rubi.mod.select.help': 'Only people in the current association and financial year are shown.', 'rubi.mod.select.placeholder': 'Select a person',
  'rubi.mod.data.title': 'Permitted details', 'rubi.mod.boundary': 'Prepare validates and shows before and after. It does not register or apply the modification.',
  'rubi.mod.prepare': 'Prepare modification', 'rubi.mod.prepared.badge': 'PREPARED', 'rubi.mod.prepared.title': 'Modification prepared',
  'rubi.mod.prepared.pending': 'Awaiting confirmation', 'rubi.mod.prepared.stop': 'Review the exact changes before confirming.',
  'rubi.mod.prepared.noEffects': 'Preparation does not create a request or write to Census.', 'rubi.mod.before': 'Before', 'rubi.mod.after': 'After',
  'rubi.mod.confirm.title': 'Human confirmation', 'rubi.mod.confirm.warning': 'Confirmation will register the administrative modification process.',
  'rubi.mod.confirm.accept': 'I reviewed the before and after values and want to register the process.', 'rubi.mod.confirm.action': 'Confirm and register', 'rubi.mod.confirming': 'Registering...',
  'rubi.mod.edit': 'Edit changes', 'rubi.mod.registered.badge': 'REGISTERED', 'rubi.mod.confirmed.title': 'Modification registered',
  'rubi.mod.confirmed.description': 'The administrative request was registered. Census was not updated directly.', 'rubi.mod.reference': 'Request',
  'rubi.mod.normal.title': 'This case requires the standard flow', 'rubi.mod.normal.description': 'The role change requires a replacement, capacity check or special review.', 'rubi.mod.normal.open': 'Open standard flow',
  'rubi.mod.cancelled': 'I cancelled the assisted modification and cleared its details.', 'rubi.mod.expired': 'The preparation expired and its details were cleared.',
  'rubi.mod.error.permission': 'You do not have permission to prepare modifications.', 'rubi.mod.error.exercise': 'Select the active, started financial year.',
  'rubi.mod.error.options': 'People or roles could not be loaded.', 'rubi.mod.error.form': 'Check the fields and formats.', 'rubi.mod.error.noChanges': 'You have not made any changes.',
  'rubi.mod.error.duplicate': 'A pending modification already exists for this person.', 'rubi.mod.error.person': 'The person is no longer available in this association and financial year.',
  'rubi.mod.error.expired': 'The preparation is no longer valid.', 'rubi.mod.error.contextChanged': 'The context changed. Prepare the modification again.',
  'rubi.mod.error.transactionDisabled': 'Transactional confirmation is not enabled.', 'rubi.mod.error.prepare': 'The modification could not be prepared or registered.',
  'rubi.mod.field.identificacion': 'Identification', 'rubi.mod.field.nombre': 'First name', 'rubi.mod.field.apellidos': 'Surnames', 'rubi.mod.field.nacimiento': 'Date of birth',
  'rubi.mod.field.telefono': 'Telephone', 'rubi.mod.field.email': 'Email', 'rubi.mod.field.direccion': 'Address', 'rubi.mod.field.codigo_postal': 'Postcode', 'rubi.mod.field.cargos': 'Roles'
});
Object.assign(translations.en, {
  'rubi.action.baja': 'Prepare removal with Rubi', 'rubi.baja.guided': 'Guided process', 'rubi.baja.title': 'Assisted removal',
  'rubi.baja.privacy': 'Select the person in this secure form. Their details are not sent to the AI provider.',
  'rubi.baja.step.person': 'Person', 'rubi.baja.step.motivo': 'Reason', 'rubi.baja.step.review': 'Review',
  'rubi.baja.select.title': 'Select the person', 'rubi.baja.select.help': 'Only people in the current association and financial year are shown.', 'rubi.baja.select.placeholder': 'Select a person',
  'rubi.baja.motivo.title': 'Reason (optional)', 'rubi.baja.motivo.help': 'You can briefly note the reason for the removal.', 'rubi.baja.field.motivo': 'Reason',
  'rubi.baja.boundary': 'Prepare validates the case and creates a summary. It does not register or apply the removal.',
  'rubi.baja.prepare': 'Prepare removal', 'rubi.baja.prepared.badge': 'PREPARED', 'rubi.baja.prepared.title': 'Removal prepared',
  'rubi.baja.prepared.pending': 'Awaiting confirmation', 'rubi.baja.prepared.stop': 'Review exactly what will happen before confirming.',
  'rubi.baja.prepared.noEffects': 'Preparation does not create a request or write to Census.',
  'rubi.baja.summary.person': 'Person', 'rubi.baja.summary.association': 'Association', 'rubi.baja.summary.exercise': 'Financial year',
  'rubi.baja.confirm.title': 'Human confirmation', 'rubi.baja.confirm.warning': 'Confirmation will register the administrative removal process.',
  'rubi.baja.confirm.accept': 'I reviewed the summary and want to register the process.', 'rubi.baja.confirm.action': 'Confirm and register', 'rubi.baja.confirming': 'Registering...',
  'rubi.baja.edit': 'Review again', 'rubi.baja.registered.badge': 'REGISTERED', 'rubi.baja.confirmed.title': 'Removal registered',
  'rubi.baja.confirmed.description': 'The administrative request was registered. Census was not updated directly.', 'rubi.baja.reference': 'Request',
  'rubi.baja.normal.title': 'This case requires the standard flow', 'rubi.baja.normal.description': 'The person holds a mandatory role and requires a replacement or special review.', 'rubi.baja.normal.open': 'Open standard flow',
  'rubi.baja.cancelled': 'I cancelled the assisted removal and cleared its details.', 'rubi.baja.expired': 'The preparation expired and its details were cleared.',
  'rubi.baja.error.permission': 'You do not have permission to prepare removals.', 'rubi.baja.error.exercise': 'Select the active, started financial year.',
  'rubi.baja.error.options': 'People could not be loaded.', 'rubi.baja.error.form': 'Select a valid person.',
  'rubi.baja.error.duplicate': 'A pending removal already exists for this person.', 'rubi.baja.error.person': 'The person is no longer available in this association and financial year.',
  'rubi.baja.error.expired': 'The preparation is no longer valid.', 'rubi.baja.error.contextChanged': 'The context changed. Prepare the removal again.',
  'rubi.baja.error.transactionDisabled': 'Transactional confirmation is not enabled.', 'rubi.baja.error.prepare': 'The removal could not be prepared or registered.'
});
Object.assign(translations.es, {
  'rubi.admin.noAccess': 'No tienes permiso para administrar la configuracion de Rubi.',
  'rubi.admin.error.load': 'No se ha podido cargar la configuracion de Rubi.', 'rubi.admin.error.save': 'No se ha podido guardar el cambio.',
  'rubi.admin.error.associations': 'No se han podido cargar las asociaciones.', 'rubi.admin.error.associationSave': 'No se ha podido actualizar el acceso de la asociacion.',
  'rubi.admin.error.analytics': 'No se ha podido cargar la analitica.',
  'rubi.admin.error.tools': 'No se ha podido cargar el catalogo de tools.', 'rubi.admin.error.toolSave': 'No se ha podido actualizar el bloqueo de la tool.',
  'rubi.admin.status.title': 'Estado general', 'rubi.admin.status.hint': 'El kill switch de infraestructura sigue teniendo prioridad sobre estas opciones.', 'rubi.admin.status.federationHint': 'La autorización de Federación/Administración es independiente de la autorización por asociación: ninguna concede acceso a la otra.',
  'rubi.admin.toggle.enabled': 'Rubi habilitada', 'rubi.admin.toggle.realProvider': 'Proveedor real habilitado', 'rubi.admin.toggle.transactional': 'Operaciones transaccionales habilitadas', 'rubi.admin.toggle.federation': 'Acceso de Federación/Administración autorizado',
  'rubi.admin.provider.title': 'Proveedor', 'rubi.admin.provider.name': 'Proveedor', 'rubi.admin.provider.model': 'Modelo',
  'rubi.admin.provider.killSwitch': 'Kill switch de infraestructura', 'rubi.admin.provider.credential': 'Credencial',
  'rubi.admin.state.active': 'Activo', 'rubi.admin.state.inactive': 'Inactivo', 'rubi.admin.state.configured': 'Configurada', 'rubi.admin.state.notConfigured': 'No configurada',
  'rubi.admin.state.authorized': 'Autorizada', 'rubi.admin.state.notAuthorized': 'No autorizada',
  'rubi.admin.budget.title': 'Consumo y presupuesto', 'rubi.admin.budget.daily': 'Presupuesto diario', 'rubi.admin.budget.monthly': 'Presupuesto mensual', 'rubi.admin.budget.limitReached': 'Limite alcanzado',
  'rubi.admin.associations.title': 'Asociaciones', 'rubi.admin.associations.search': 'Buscar asociacion', 'rubi.admin.associations.refresh': 'Actualizar',
  'rubi.admin.associations.filter.all': 'Todas', 'rubi.admin.associations.filter.authorized': 'Autorizadas', 'rubi.admin.associations.filter.unauthorized': 'No autorizadas',
  'rubi.admin.associations.total': 'Total', 'rubi.admin.associations.name': 'Asociacion', 'rubi.admin.associations.status': 'Rubi', 'rubi.admin.associations.empty': 'No se han encontrado asociaciones.',
  'rubi.admin.analytics.title': 'Analiticas', 'rubi.admin.analytics.last7': 'Ultimos 7 dias', 'rubi.admin.analytics.last30': 'Ultimos 30 dias',
  'rubi.admin.analytics.calls': 'Llamadas', 'rubi.admin.analytics.tokens': 'Tokens', 'rubi.admin.analytics.cost': 'Coste estimado',
  'rubi.admin.analytics.failures': 'Fallidas', 'rubi.admin.analytics.actors': 'Actores unicos', 'rubi.admin.analytics.associations': 'Asociaciones unicas',
  'rubi.admin.analytics.latency': 'Latencia media', 'rubi.admin.analytics.filterAssociation': 'Filtrar por asociacion (id)',
  'rubi.admin.analytics.byTool': 'Por tool', 'rubi.admin.analytics.byFailureCode': 'Fallos por codigo', 'rubi.admin.analytics.byAssociation': 'Por asociacion',
  'rubi.admin.tools.title': 'Tools y capacidades', 'rubi.admin.tools.hint': 'El kill switch de infraestructura (RUBI_BLOCKED_TOOLS) sigue siendo superior: una tool bloqueada por infraestructura no puede reactivarse desde aqui.',
  'rubi.admin.tools.name': 'Tool', 'rubi.admin.tools.domain': 'Dominio', 'rubi.admin.tools.status': 'Estado',
  'rubi.admin.tools.blocked': 'Bloqueada', 'rubi.admin.tools.available': 'Disponible', 'rubi.admin.tools.blockedByInfra': 'Bloqueada por infraestructura'
});
Object.assign(translations.va, {
  'rubi.admin.noAccess': 'No tens permis per a administrar la configuracio de Rubi.',
  'rubi.admin.error.load': 'No s ha pogut carregar la configuracio de Rubi.', 'rubi.admin.error.save': 'No s ha pogut guardar el canvi.',
  'rubi.admin.error.associations': 'No s han pogut carregar les associacions.', 'rubi.admin.error.associationSave': 'No s ha pogut actualitzar l acces de l associacio.',
  'rubi.admin.error.analytics': 'No s ha pogut carregar l analitica.',
  'rubi.admin.error.tools': 'No s ha pogut carregar el cataleg de tools.', 'rubi.admin.error.toolSave': 'No s ha pogut actualitzar el bloqueig de la tool.',
  'rubi.admin.status.title': 'Estat general', 'rubi.admin.status.hint': 'El kill switch d infraestructura continua tenint prioritat sobre estes opcions.', 'rubi.admin.status.federationHint': 'L autorització de Federació/Administració és independent de l autorització per associació: cap concedix accés a l altra.',
  'rubi.admin.toggle.enabled': 'Rubi habilitada', 'rubi.admin.toggle.realProvider': 'Proveidor real habilitat', 'rubi.admin.toggle.transactional': 'Operacions transaccionals habilitades', 'rubi.admin.toggle.federation': 'Accés de Federació/Administració autoritzat',
  'rubi.admin.provider.title': 'Proveidor', 'rubi.admin.provider.name': 'Proveidor', 'rubi.admin.provider.model': 'Model',
  'rubi.admin.provider.killSwitch': 'Kill switch d infraestructura', 'rubi.admin.provider.credential': 'Credencial',
  'rubi.admin.state.active': 'Actiu', 'rubi.admin.state.inactive': 'Inactiu', 'rubi.admin.state.configured': 'Configurada', 'rubi.admin.state.notConfigured': 'No configurada',
  'rubi.admin.state.authorized': 'Autoritzada', 'rubi.admin.state.notAuthorized': 'No autoritzada',
  'rubi.admin.budget.title': 'Consum i pressupost', 'rubi.admin.budget.daily': 'Pressupost diari', 'rubi.admin.budget.monthly': 'Pressupost mensual', 'rubi.admin.budget.limitReached': 'Limit assolit',
  'rubi.admin.associations.title': 'Associacions', 'rubi.admin.associations.search': 'Cercar associacio', 'rubi.admin.associations.refresh': 'Actualitzar',
  'rubi.admin.associations.filter.all': 'Totes', 'rubi.admin.associations.filter.authorized': 'Autoritzades', 'rubi.admin.associations.filter.unauthorized': 'No autoritzades',
  'rubi.admin.associations.total': 'Total', 'rubi.admin.associations.name': 'Associacio', 'rubi.admin.associations.status': 'Rubi', 'rubi.admin.associations.empty': 'No s han trobat associacions.',
  'rubi.admin.analytics.title': 'Analitiques', 'rubi.admin.analytics.last7': 'Ultims 7 dies', 'rubi.admin.analytics.last30': 'Ultims 30 dies',
  'rubi.admin.analytics.calls': 'Crides', 'rubi.admin.analytics.tokens': 'Tokens', 'rubi.admin.analytics.cost': 'Cost estimat',
  'rubi.admin.analytics.failures': 'Fallides', 'rubi.admin.analytics.actors': 'Actors unics', 'rubi.admin.analytics.associations': 'Associacions uniques',
  'rubi.admin.analytics.latency': 'Latencia mitjana', 'rubi.admin.analytics.filterAssociation': 'Filtrar per associacio (id)',
  'rubi.admin.analytics.byTool': 'Per tool', 'rubi.admin.analytics.byFailureCode': 'Fallades per codi', 'rubi.admin.analytics.byAssociation': 'Per associacio',
  'rubi.admin.tools.title': 'Tools i capacitats', 'rubi.admin.tools.hint': 'El kill switch d infraestructura (RUBI_BLOCKED_TOOLS) continua sent superior: una tool bloquejada per infraestructura no pot reactivar-se des d aci.',
  'rubi.admin.tools.name': 'Tool', 'rubi.admin.tools.domain': 'Domini', 'rubi.admin.tools.status': 'Estat',
  'rubi.admin.tools.blocked': 'Bloquejada', 'rubi.admin.tools.available': 'Disponible', 'rubi.admin.tools.blockedByInfra': 'Bloquejada per infraestructura'
});
Object.assign(translations.en, {
  'rubi.admin.noAccess': 'You do not have permission to manage Rubi configuration.',
  'rubi.admin.error.load': 'Rubi configuration could not be loaded.', 'rubi.admin.error.save': 'The change could not be saved.',
  'rubi.admin.error.associations': 'Associations could not be loaded.', 'rubi.admin.error.associationSave': 'The association access could not be updated.',
  'rubi.admin.error.analytics': 'Analytics could not be loaded.',
  'rubi.admin.error.tools': 'The tools catalogue could not be loaded.', 'rubi.admin.error.toolSave': 'The tool block could not be updated.',
  'rubi.admin.status.title': 'Overall status', 'rubi.admin.status.hint': 'The infrastructure kill switch still takes priority over these options.', 'rubi.admin.status.federationHint': 'Federation/Administration authorization is independent from association authorization: neither one grants access to the other.',
  'rubi.admin.toggle.enabled': 'Rubi enabled', 'rubi.admin.toggle.realProvider': 'Real provider enabled', 'rubi.admin.toggle.transactional': 'Transactional operations enabled', 'rubi.admin.toggle.federation': 'Federation/Administration access authorized',
  'rubi.admin.provider.title': 'Provider', 'rubi.admin.provider.name': 'Provider', 'rubi.admin.provider.model': 'Model',
  'rubi.admin.provider.killSwitch': 'Infrastructure kill switch', 'rubi.admin.provider.credential': 'Credential',
  'rubi.admin.state.active': 'Active', 'rubi.admin.state.inactive': 'Inactive', 'rubi.admin.state.configured': 'Configured', 'rubi.admin.state.notConfigured': 'Not configured',
  'rubi.admin.state.authorized': 'Authorized', 'rubi.admin.state.notAuthorized': 'Not authorized',
  'rubi.admin.budget.title': 'Consumption and budget', 'rubi.admin.budget.daily': 'Daily budget', 'rubi.admin.budget.monthly': 'Monthly budget', 'rubi.admin.budget.limitReached': 'Limit reached',
  'rubi.admin.associations.title': 'Associations', 'rubi.admin.associations.search': 'Search association', 'rubi.admin.associations.refresh': 'Refresh',
  'rubi.admin.associations.filter.all': 'All', 'rubi.admin.associations.filter.authorized': 'Authorized', 'rubi.admin.associations.filter.unauthorized': 'Not authorized',
  'rubi.admin.associations.total': 'Total', 'rubi.admin.associations.name': 'Association', 'rubi.admin.associations.status': 'Rubi', 'rubi.admin.associations.empty': 'No associations found.',
  'rubi.admin.analytics.title': 'Analytics', 'rubi.admin.analytics.last7': 'Last 7 days', 'rubi.admin.analytics.last30': 'Last 30 days',
  'rubi.admin.analytics.calls': 'Calls', 'rubi.admin.analytics.tokens': 'Tokens', 'rubi.admin.analytics.cost': 'Estimated cost',
  'rubi.admin.analytics.failures': 'Failures', 'rubi.admin.analytics.actors': 'Unique actors', 'rubi.admin.analytics.associations': 'Unique associations',
  'rubi.admin.analytics.latency': 'Average latency', 'rubi.admin.analytics.filterAssociation': 'Filter by association (id)',
  'rubi.admin.analytics.byTool': 'By tool', 'rubi.admin.analytics.byFailureCode': 'Failures by code', 'rubi.admin.analytics.byAssociation': 'By association',
  'rubi.admin.tools.title': 'Tools and capabilities', 'rubi.admin.tools.hint': 'The infrastructure kill switch (RUBI_BLOCKED_TOOLS) is still superior: a tool blocked by infrastructure cannot be re-enabled from here.',
  'rubi.admin.tools.name': 'Tool', 'rubi.admin.tools.domain': 'Domain', 'rubi.admin.tools.status': 'Status',
  'rubi.admin.tools.blocked': 'Blocked', 'rubi.admin.tools.available': 'Available', 'rubi.admin.tools.blockedByInfra': 'Blocked by infrastructure'
});
Object.assign(translations.es, {
  'rubi.action.documentacion': 'Presentar documentación con Rubi', 'rubi.action.comunicacion': 'Enviar una comunicación con Rubi',
  'rubi.registro.doc.guided': 'Trámite guiado', 'rubi.registro.doc.title': 'Documentación asistida',
  'rubi.registro.comm.guided': 'Trámite guiado', 'rubi.registro.comm.title': 'Comunicación asistida',
  'rubi.registro.privacy': 'Completa este formulario seguro. Los datos y adjuntos no se envían al proveedor de IA.',
  'rubi.registro.step.destinatario': 'Destinatario', 'rubi.registro.step.details': 'Detalles', 'rubi.registro.step.review': 'Revisión',
  'rubi.registro.destinatario.title': 'Selecciona el destinatario', 'rubi.registro.destinatario.help': 'Elige el departamento o persona responsable al que se dirige.', 'rubi.registro.destinatario.placeholder': 'Selecciona un destinatario',
  'rubi.registro.details.title': 'Detalles', 'rubi.registro.doc.details.help': 'Indica un título, una descripción y adjunta al menos un archivo.', 'rubi.registro.comm.details.help': 'Indica un título y el mensaje. Los adjuntos son opcionales.',
  'rubi.registro.field.titulo': 'Título', 'rubi.registro.field.mensaje': 'Mensaje',
  'rubi.registro.doc.adjuntos': 'Documentos', 'rubi.registro.comm.adjuntos': 'Adjuntos (opcional)',
  'rubi.registro.doc.adjuntoRequerido': 'La documentación requiere al menos un archivo adjunto.',
  'rubi.registro.boundary': 'Preparar valida los datos y genera un resumen. No presenta ni envía nada todavía.',
  'rubi.registro.prepare': 'Preparar', 'rubi.registro.prepared.badge': 'PREPARADA', 'rubi.registro.prepared.title': 'Revisión antes de confirmar',
  'rubi.registro.prepared.pending': 'Pendiente de confirmación', 'rubi.registro.prepared.stop': 'Revisa exactamente lo que se va a presentar antes de confirmar.',
  'rubi.registro.prepared.noEffects': 'La preparación no crea el registro ni sube ningún archivo todavía.',
  'rubi.registro.summary.destinatario': 'Destinatario', 'rubi.registro.summary.titulo': 'Título', 'rubi.registro.summary.mensaje': 'Mensaje', 'rubi.registro.summary.adjuntos': 'Número de archivos',
  'rubi.registro.confirm.title': 'Confirmación humana',
  'rubi.registro.doc.confirm.warning': 'Confirmar presentará la documentación y generará un número de registro real.',
  'rubi.registro.comm.confirm.warning': 'Confirmar enviará la comunicación y generará un número de registro real.',
  'rubi.registro.confirm.accept': 'He revisado el resumen y quiero confirmarlo.', 'rubi.registro.confirm.action': 'Confirmar y registrar', 'rubi.registro.confirming': 'Registrando...',
  'rubi.registro.edit': 'Volver a revisar', 'rubi.registro.registered.badge': 'REGISTRADO',
  'rubi.registro.doc.confirmed.title': 'Documentación presentada', 'rubi.registro.doc.confirmed.description': 'La documentación se ha presentado en Registro con un número real.',
  'rubi.registro.comm.confirmed.title': 'Comunicación enviada', 'rubi.registro.comm.confirmed.description': 'La comunicación se ha enviado en Registro con un número real.',
  'rubi.registro.reference': 'Número de registro', 'rubi.registro.state': 'Estado',
  'rubi.registro.uploading': 'Subiendo los archivos adjuntos...', 'rubi.registro.uploadFailed': 'El registro se ha creado, pero algún adjunto no se ha podido subir.', 'rubi.registro.retryUpload': 'Reintentar subir los adjuntos pendientes',
  'rubi.registro.doc.cancelled': 'He cancelado la documentación asistida y he limpiado sus datos del panel.', 'rubi.registro.doc.expired': 'La preparación ha caducado y sus datos se han limpiado.',
  'rubi.registro.comm.cancelled': 'He cancelado la comunicación asistida y he limpiado sus datos del panel.', 'rubi.registro.comm.expired': 'La preparación ha caducado y sus datos se han limpiado.',
  'rubi.registro.error.permission': 'No tienes permiso para gestionar Registro.', 'rubi.registro.error.options': 'No se han podido cargar los destinatarios.',
  'rubi.registro.error.form': 'Revisa los campos obligatorios.', 'rubi.registro.error.destinatario': 'Selecciona un destinatario activo.',
  'rubi.registro.error.adjunto': 'Revisa los archivos adjuntos: tipo o tamaño no permitido.', 'rubi.registro.error.expired': 'La preparación ya no está vigente.',
  'rubi.registro.error.contextChanged': 'Los datos han cambiado. Prepáralo de nuevo.', 'rubi.registro.error.transactionDisabled': 'La confirmación transaccional no está habilitada.',
  'rubi.registro.error.prepare': 'No se ha podido preparar o confirmar el Registro.', 'rubi.registro.error.uploadFailed': 'El registro se ha creado, pero algún adjunto no se ha podido subir.',
  'rubi.registro.error.exerciseInactive': 'Estás consultando un ejercicio que no está activo; cambia al ejercicio activo para enviar una comunicación.'
});
Object.assign(translations.va, {
  'rubi.action.documentacion': 'Presentar documentació amb Rubi', 'rubi.action.comunicacion': 'Enviar una comunicació amb Rubi',
  'rubi.registro.doc.guided': 'Tràmit guiat', 'rubi.registro.doc.title': 'Documentació assistida',
  'rubi.registro.comm.guided': 'Tràmit guiat', 'rubi.registro.comm.title': 'Comunicació assistida',
  'rubi.registro.privacy': "Completa este formulari segur. Les dades i adjunts no s'envien al proveïdor d'IA.",
  'rubi.registro.step.destinatario': 'Destinatari', 'rubi.registro.step.details': 'Detalls', 'rubi.registro.step.review': 'Revisió',
  'rubi.registro.destinatario.title': 'Selecciona el destinatari', 'rubi.registro.destinatario.help': 'Tria el departament o la persona responsable a qui es dirigix.', 'rubi.registro.destinatario.placeholder': 'Selecciona un destinatari',
  'rubi.registro.details.title': 'Detalls', 'rubi.registro.doc.details.help': "Indica un títol, una descripció i adjunta almenys un arxiu.", 'rubi.registro.comm.details.help': 'Indica un títol i el missatge. Els adjunts són opcionals.',
  'rubi.registro.field.titulo': 'Títol', 'rubi.registro.field.mensaje': 'Missatge',
  'rubi.registro.doc.adjuntos': 'Documents', 'rubi.registro.comm.adjuntos': 'Adjunts (opcional)',
  'rubi.registro.doc.adjuntoRequerido': "La documentació requerix almenys un arxiu adjunt.",
  'rubi.registro.boundary': 'Preparar valida les dades i genera un resum. No presenta ni envia res encara.',
  'rubi.registro.prepare': 'Preparar', 'rubi.registro.prepared.badge': 'PREPARADA', 'rubi.registro.prepared.title': 'Revisió abans de confirmar',
  'rubi.registro.prepared.pending': 'Pendent de confirmació', 'rubi.registro.prepared.stop': 'Revisa exactament el que es presentarà abans de confirmar.',
  'rubi.registro.prepared.noEffects': 'La preparació no crea el registre ni puja cap arxiu encara.',
  'rubi.registro.summary.destinatario': 'Destinatari', 'rubi.registro.summary.titulo': 'Títol', 'rubi.registro.summary.mensaje': 'Missatge', 'rubi.registro.summary.adjuntos': "Nombre d'arxius",
  'rubi.registro.confirm.title': 'Confirmació humana',
  'rubi.registro.doc.confirm.warning': 'Confirmar presentarà la documentació i generarà un número de registre real.',
  'rubi.registro.comm.confirm.warning': 'Confirmar enviarà la comunicació i generarà un número de registre real.',
  'rubi.registro.confirm.accept': 'He revisat el resum i vull confirmar-ho.', 'rubi.registro.confirm.action': 'Confirmar i registrar', 'rubi.registro.confirming': 'Registrant...',
  'rubi.registro.edit': 'Tornar a revisar', 'rubi.registro.registered.badge': 'REGISTRAT',
  'rubi.registro.doc.confirmed.title': 'Documentació presentada', 'rubi.registro.doc.confirmed.description': 'La documentació s\'ha presentat en Registre amb un número real.',
  'rubi.registro.comm.confirmed.title': 'Comunicació enviada', 'rubi.registro.comm.confirmed.description': "La comunicació s'ha enviat en Registre amb un número real.",
  'rubi.registro.reference': 'Número de registre', 'rubi.registro.state': 'Estat',
  'rubi.registro.uploading': "Pujant els arxius adjunts...", 'rubi.registro.uploadFailed': 'El registre s\'ha creat, però algun adjunt no s\'ha pogut pujar.', 'rubi.registro.retryUpload': 'Reintentar pujar els adjunts pendents',
  'rubi.registro.doc.cancelled': "He cancel·lat la documentació assistida i he netejat les dades del panell.", 'rubi.registro.doc.expired': "La preparació ha caducat i les dades s'han netejat.",
  'rubi.registro.comm.cancelled': "He cancel·lat la comunicació assistida i he netejat les dades del panell.", 'rubi.registro.comm.expired': "La preparació ha caducat i les dades s'han netejat.",
  'rubi.registro.error.permission': 'No tens permís per a gestionar Registre.', 'rubi.registro.error.options': 'No s\'han pogut carregar els destinataris.',
  'rubi.registro.error.form': 'Revisa els camps obligatoris.', 'rubi.registro.error.destinatario': 'Selecciona un destinatari actiu.',
  'rubi.registro.error.adjunto': 'Revisa els arxius adjunts: tipus o grandària no permesa.', 'rubi.registro.error.expired': 'La preparació ja no està vigent.',
  'rubi.registro.error.contextChanged': 'Les dades han canviat. Prepara-ho de nou.', 'rubi.registro.error.transactionDisabled': 'La confirmació transaccional no està habilitada.',
  'rubi.registro.error.prepare': 'No s\'ha pogut preparar o confirmar el Registre.', 'rubi.registro.error.uploadFailed': 'El registre s\'ha creat, però algun adjunt no s\'ha pogut pujar.',
  'rubi.registro.error.exerciseInactive': "Estàs consultant un exercici que no està actiu; canvia a l'exercici actiu per a enviar una comunicació."
});
Object.assign(translations.en, {
  'rubi.action.documentacion': 'Submit documentation with Rubi', 'rubi.action.comunicacion': 'Send a communication with Rubi',
  'rubi.registro.doc.guided': 'Guided process', 'rubi.registro.doc.title': 'Assisted documentation',
  'rubi.registro.comm.guided': 'Guided process', 'rubi.registro.comm.title': 'Assisted communication',
  'rubi.registro.privacy': 'Complete this secure form. Data and attachments are not sent to the AI provider.',
  'rubi.registro.step.destinatario': 'Recipient', 'rubi.registro.step.details': 'Details', 'rubi.registro.step.review': 'Review',
  'rubi.registro.destinatario.title': 'Select the recipient', 'rubi.registro.destinatario.help': 'Choose the department or responsible person this is addressed to.', 'rubi.registro.destinatario.placeholder': 'Select a recipient',
  'rubi.registro.details.title': 'Details', 'rubi.registro.doc.details.help': 'Enter a title, a description and attach at least one file.', 'rubi.registro.comm.details.help': 'Enter a title and the message. Attachments are optional.',
  'rubi.registro.field.titulo': 'Title', 'rubi.registro.field.mensaje': 'Message',
  'rubi.registro.doc.adjuntos': 'Documents', 'rubi.registro.comm.adjuntos': 'Attachments (optional)',
  'rubi.registro.doc.adjuntoRequerido': 'Documentation requires at least one attached file.',
  'rubi.registro.boundary': 'Preparing validates the data and creates a summary. It does not submit or send anything yet.',
  'rubi.registro.prepare': 'Prepare', 'rubi.registro.prepared.badge': 'PREPARED', 'rubi.registro.prepared.title': 'Review before confirming',
  'rubi.registro.prepared.pending': 'Pending confirmation', 'rubi.registro.prepared.stop': 'Review exactly what will be submitted before confirming.',
  'rubi.registro.prepared.noEffects': 'This preparation does not create the record or upload any file yet.',
  'rubi.registro.summary.destinatario': 'Recipient', 'rubi.registro.summary.titulo': 'Title', 'rubi.registro.summary.mensaje': 'Message', 'rubi.registro.summary.adjuntos': 'Number of files',
  'rubi.registro.confirm.title': 'Human confirmation',
  'rubi.registro.doc.confirm.warning': 'Confirming will submit the documentation and generate a real registry number.',
  'rubi.registro.comm.confirm.warning': 'Confirming will send the communication and generate a real registry number.',
  'rubi.registro.confirm.accept': 'I have reviewed the summary and want to confirm it.', 'rubi.registro.confirm.action': 'Confirm and register', 'rubi.registro.confirming': 'Registering...',
  'rubi.registro.edit': 'Review again', 'rubi.registro.registered.badge': 'REGISTERED',
  'rubi.registro.doc.confirmed.title': 'Documentation submitted', 'rubi.registro.doc.confirmed.description': 'The documentation has been submitted in Registry with a real number.',
  'rubi.registro.comm.confirmed.title': 'Communication sent', 'rubi.registro.comm.confirmed.description': 'The communication has been sent in Registry with a real number.',
  'rubi.registro.reference': 'Registry number', 'rubi.registro.state': 'Status',
  'rubi.registro.uploading': 'Uploading attachments...', 'rubi.registro.uploadFailed': 'The record was created, but some attachment could not be uploaded.', 'rubi.registro.retryUpload': 'Retry uploading the pending attachments',
  'rubi.registro.doc.cancelled': 'I cancelled the assisted documentation and cleared its details from the panel.', 'rubi.registro.doc.expired': 'The preparation expired and its details were cleared.',
  'rubi.registro.comm.cancelled': 'I cancelled the assisted communication and cleared its details from the panel.', 'rubi.registro.comm.expired': 'The preparation expired and its details were cleared.',
  'rubi.registro.error.permission': 'You do not have permission to manage Registry.', 'rubi.registro.error.options': 'The recipients could not be loaded.',
  'rubi.registro.error.form': 'Check the required fields.', 'rubi.registro.error.destinatario': 'Select an active recipient.',
  'rubi.registro.error.adjunto': 'Check the attachments: type or size not allowed.', 'rubi.registro.error.expired': 'The preparation is no longer valid.',
  'rubi.registro.error.contextChanged': 'The data changed. Prepare it again.', 'rubi.registro.error.transactionDisabled': 'Transactional confirmation is not enabled.',
  'rubi.registro.error.prepare': 'The Registry entry could not be prepared or confirmed.', 'rubi.registro.error.uploadFailed': 'The record was created, but some attachment could not be uploaded.',
  'rubi.registro.error.exerciseInactive': 'You are viewing a financial year that is not active; switch to the active year to send a communication.'
});

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storageKey = 'ffsj-secretaria.language';
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(this.initialLanguage());
  readonly languageChanges = this.languageSubject.asObservable();
  get language(): AppLanguage { return this.languageSubject.value; }
  setLanguage(language: AppLanguage): void { localStorage.setItem(this.storageKey, language); this.languageSubject.next(language); }
  t(key: string, params?: Record<string, string | number>): string {
    const translated = translations[this.language][key] || translations.es[key];
    if (!translated) {
      // A missing catalogue entry must never render as an implementation key.
      return key.split('.').pop()?.replace(/([a-z])([A-Z])/g, '$1 $2') || '—';
    }
    if (!params) return translated;
    return translated.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }
  private initialLanguage(): AppLanguage { const saved = localStorage.getItem(this.storageKey); return saved === 'va' || saved === 'en' || saved === 'es' ? saved : 'es'; }
}

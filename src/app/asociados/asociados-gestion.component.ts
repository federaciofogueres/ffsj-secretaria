import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertButtonType, FfsjDialogAlertService } from 'ffsj-web-components';

import { SecretariaService } from '../core/secretaria.service';
import { Asociado, AsociadosService } from './asociados.service';

type GestionTab = 'altas' | 'modificaciones' | 'bajas';

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

  pendingAltas: any[] = [];
  pendingCambios: any[] = [];
  pendingBajas: Asociado[] = [];

  seleccionBaja = new Set<number>();
  mostrarFormMod = false;

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
    private readonly asociadosService: AsociadosService,
    private readonly secretariaService: SecretariaService,
    private readonly dialog: FfsjDialogAlertService
  ) { }

  ngOnInit(): void {
    this.asociadosService.getAdultos().subscribe(ad => (this.adultos = ad));
    this.asociadosService.getInfantiles().subscribe(kids => (this.infantiles = kids));
  }

  setTab(tab: GestionTab): void {
    this.activeTab = tab;
    this.resetFormulario();
    this.modoFormulario = tab === 'modificaciones' ? 'modificacion' : 'alta';
    this.asociadoEnEdicion = null;
    this.seleccionBaja.clear();
    this.mostrarFormMod = tab === 'altas';
  }

  verPendientes(tipo: 'solicitudes' | 'asociados'): void {
    this.dialog.openDialogAlert({
      title: 'Pendientes',
      content: `Mostrando vista simulada de ${tipo === 'solicitudes' ? 'solicitudes' : 'asociados'} pendientes.`,
      innerHtml: `<p>Mostrando vista simulada de ${tipo === 'solicitudes' ? 'solicitudes' : 'asociados'} pendientes.</p>`,
      buttonsAlert: [AlertButtonType.Entendido]
    });
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
        dni: String(asociado.id),
        sip: '',
        nacimiento: '',
        nombre: asociado.nombre,
        apellidos: asociado.apellidos,
        direccion: '',
        cp: '',
        localidad: '',
        provincia: '',
        telefono: '',
        email: ''
      });
    });
  }

  enviarAlta(): void {
    if (this.altaForm.invalid) {
      this.altaForm.markAllAsTouched();
      return;
    }
    const payload = { ...this.altaForm.value, tipo: this.altaForm.value.tipo };
    const tipoSolicitud = this.modoFormulario === 'alta' ? 'alta' : 'modificacion';
    this.secretariaService.crearSolicitud({
      asociacionId: 10,
      tipo: tipoSolicitud,
      asociados: [payload]
    }).subscribe({ error: () => undefined });

    if (this.modoFormulario === 'alta') {
      this.pendingAltas.push(payload);
      this.dialog.openDialogAlert({
        title: 'Alta pendiente',
        content: 'El asociado se ha añadido a Altas pendientes.',
        innerHtml: '<p>El asociado se ha añadido a Altas pendientes.</p>',
        buttonsAlert: [AlertButtonType.Entendido]
      });
    } else {
      this.pendingCambios.push({ ...payload, origenId: this.asociadoEnEdicion?.id });
      this.dialog.openDialogAlert({
        title: 'Cambio pendiente',
        content: 'La modificación se ha añadido a Cambios pendientes.',
        innerHtml: '<p>La modificación se ha añadido a Cambios pendientes.</p>',
        buttonsAlert: [AlertButtonType.Entendido]
      });
    }
    this.resetFormulario();
    this.asociadoEnEdicion = null;
    if (this.activeTab === 'modificaciones') {
      this.mostrarFormMod = false;
    }
  }

  toggleSeleccionBaja(asociado: Asociado): void {
    if (this.seleccionBaja.has(asociado.id)) {
      this.seleccionBaja.delete(asociado.id);
    } else {
      this.seleccionBaja.add(asociado.id);
    }
  }

  procesarBaja(): void {
    if (this.seleccionBaja.size === 0) return;
    const seleccionados = [...this.seleccionBaja].map(id => this.buscarAsociado(id)).filter(Boolean) as Asociado[];
    const listado = seleccionados.map(a => `<li>${a.nombre} ${a.apellidos}</li>`).join('');
    const ref = this.dialog.openDialogAlert({
      title: 'Confirmar bajas',
      content: `Desea proceder con la solicitud de baja de los siguientes asociados?\n${seleccionados
        .map(a => `${a.nombre} ${a.apellidos}`)
        .join('\n')}`,
      innerHtml: `<p>Desea proceder con la solicitud de baja de los siguientes asociados?</p><ul>${listado}</ul>`,
      buttonsAlert: [AlertButtonType.Cancelar, AlertButtonType.Aceptar]
    });

    ref.afterClosed().subscribe((result: AlertButtonType) => {
      if (result !== AlertButtonType.Aceptar) return;
      this.secretariaService.crearSolicitud({
        asociacionId: 10,
        tipo: 'baja',
        asociados: seleccionados.map(asociado => ({ id: asociado.id }))
      }).subscribe({ error: () => undefined });
      this.pendingBajas.push(...seleccionados);
      this.seleccionBaja.clear();
      this.dialog.openDialogAlert({
        title: 'Baja pendiente',
        content: 'Las bajas seleccionadas se han añadido a solicitudes pendientes.',
        innerHtml: '<p>Las bajas seleccionadas se han añadido a solicitudes pendientes.</p>',
        buttonsAlert: [AlertButtonType.Entendido]
      });
    });
  }

  private buscarAsociado(id: number): Asociado | undefined {
    return [...this.adultos, ...this.infantiles].find(a => a.id === id);
  }

  private resetFormulario(): void {
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
}

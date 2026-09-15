import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { InscripcionesComponent } from './inscripciones.component';
import { InscripcionDraftStateService } from './inscripcion-draft-state.service';

describe('InscripcionesComponent', () => {
  function createComponent(): InscripcionesComponent {
    const secretaria = jasmine.createSpyObj('SecretariaService', ['getAdjuntosInscripcion']);
    secretaria.getAdjuntosInscripcion.and.returnValue(of({ adjuntos: [] }));

    return new InscripcionesComponent(
      new FormBuilder(),
      secretaria,
      { asociacionId: 1 } as any,
      {} as any,
      { isAdmin: () => false } as any,
      { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null }, routeConfig: null } } as any,
      { navigate: () => Promise.resolve(true) } as any,
      { hasPermission: () => true } as any,
      { isSelectedActive: true, selectedSnapshot: null } as any,
      new InscripcionDraftStateService()
    );
  }

  it('conserva el estado global al cambiar de pestaña y al volver a seleccionar la inscripción', () => {
    const component = createComponent();
    const inscription: any = {
      id: 'inscripcion-draft',
      titulo: 'Inscripción de prueba',
      tiposPermitidos: ['adulto'],
      campos: [
        { key: 'texto', label: 'Texto', type: 'text' },
        { key: 'responsable', label: 'Responsable', type: 'responsable' },
        { key: 'selector', label: 'Selector', type: 'select', options: ['Uno', 'Dos'] }
      ]
    };

    component.selectInscription(inscription);
    const originalForm = component.form;
    component.form.patchValue({ texto: 'Valor de texto', responsable: 'Responsable elegido', selector: 'Dos' });

    component.setAssociationTab('asociados');
    component.setAssociationTab('formulario');
    component.selectInscription({ ...inscription, campos: [...inscription.campos] });

    expect(component.form).toBe(originalForm);
    expect(component.form.getRawValue()).toEqual({
      texto: 'Valor de texto',
      responsable: 'Responsable elegido',
      selector: 'Dos'
    });
  });
});

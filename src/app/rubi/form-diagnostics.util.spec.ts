import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

import { buildFormDiagnostics } from './form-diagnostics.util';

describe('buildFormDiagnostics', () => {
  it('reports present=false and valid=true when there is no form', () => {
    expect(buildFormDiagnostics(null)).toEqual({ present: false, valid: true, issues: [] });
  });

  it('reports a valid form with no issues', () => {
    const form = new FormGroup({ nombre: new FormControl('Ana', Validators.required) });
    const diagnostics = buildFormDiagnostics(form);
    expect(diagnostics).toEqual({ present: true, valid: true, issues: [], totalIssues: 0, truncated: false });
  });

  it('extracts required, without ever including the field value', () => {
    const form = new FormGroup({ telefono: new FormControl('', Validators.required) });
    const diagnostics = buildFormDiagnostics(form, { fieldMeta: { telefono: { label: 'Telefono' } } });
    expect(diagnostics.present).toBe(true);
    expect(diagnostics.valid).toBe(false);
    expect(diagnostics.issues).toEqual([{ field: 'telefono', label: 'Telefono', code: 'required', source: 'client' }]);
  });

  it('extracts pattern errors without leaking the offending value (Angular attaches actualValue)', () => {
    const control = new FormControl('600ABC', Validators.pattern(/^[0-9]{9}$/));
    const form = new FormGroup({ telefono: control });
    // Angular's own pattern validator error includes `actualValue` with the raw input.
    expect((control.errors as Record<string, unknown>)['pattern']).toEqual(
      jasmine.objectContaining({ actualValue: '600ABC' })
    );
    const diagnostics = buildFormDiagnostics(form, { fieldMeta: { telefono: { label: 'Telefono del responsable' } } });
    expect(diagnostics.issues).toEqual([
      { field: 'telefono', label: 'Telefono del responsable', code: 'pattern', source: 'client' }
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain('600ABC');
  });

  it('extracts email errors', () => {
    const form = new FormGroup({ email: new FormControl('not-an-email', Validators.email) });
    expect(buildFormDiagnostics(form).issues).toEqual([{ field: 'email', code: 'email', source: 'client' }]);
  });

  it('extracts requiredTrue (checkbox-style) errors', () => {
    const form = new FormGroup({ autorizacion: new FormControl(false, Validators.requiredTrue) });
    expect(buildFormDiagnostics(form).issues).toEqual([{ field: 'autorizacion', code: 'requiredTrue', source: 'client' }]);
  });

  it('extracts minlength/maxlength on a plain string control by its true code', () => {
    const form = new FormGroup({ mensaje: new FormControl('hi', Validators.minLength(10)) });
    expect(buildFormDiagnostics(form).issues).toEqual([
      { field: 'mensaje', code: 'minlength', source: 'client', required: 10, current: 2 }
    ]);
  });

  it('translates minlength/maxlength on an array-valued control to minItems/maxItems, only exposing counts', () => {
    const control = new FormControl(['a'], Validators.minLength(2));
    const form = new FormGroup({ participantes: control });
    const diagnostics = buildFormDiagnostics(form, { fieldMeta: { participantes: { label: 'Participantes' } } });
    expect(diagnostics.issues).toEqual([
      { field: 'participantes', label: 'Participantes', code: 'minItems', source: 'client', required: 2, current: 1 }
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain('"a"');
  });

  it('extracts min/max range errors', () => {
    const form = new FormGroup({ edad: new FormControl(3, Validators.min(18)) });
    expect(buildFormDiagnostics(form).issues).toEqual([
      { field: 'edad', code: 'min', source: 'client', required: 18, current: 3 }
    ]);
  });

  it('translates a custom maxSelections flag validator into maxItems using caller-supplied field metadata (never the raw error payload)', () => {
    const maxSelectionsValidator = (control: FormControl) =>
      Array.isArray(control.value) && control.value.length > 1 ? { maxSelections: true } : null;
    const control = new FormControl(['a', 'b', 'c'], maxSelectionsValidator as never);
    const form = new FormGroup({ opciones: control });
    const diagnostics = buildFormDiagnostics(form, { fieldMeta: { opciones: { label: 'Opciones', max: 1 } } });
    expect(diagnostics.issues).toEqual([
      { field: 'opciones', label: 'Opciones', code: 'maxItems', source: 'client', required: 1, current: 3 }
    ]);
  });

  it('preserves an unrecognized custom validator code without any payload', () => {
    const control = new FormControl('X1234567');
    control.setErrors({ identificacionInvalida: true });
    const form = new FormGroup({ identificacion: control });
    expect(buildFormDiagnostics(form).issues).toEqual([
      { field: 'identificacion', code: 'identificacionInvalida', source: 'client' }
    ]);
  });

  it('walks nested FormGroup with dotted paths', () => {
    const form = new FormGroup({
      contacto: new FormGroup({ telefono: new FormControl('', Validators.required) })
    });
    expect(buildFormDiagnostics(form).issues).toEqual([
      { field: 'contacto.telefono', code: 'required', source: 'client' }
    ]);
  });

  it('walks FormArray items with indexed paths and reports array-level errors too', () => {
    const array = new FormArray([new FormControl('', Validators.required)], Validators.minLength(2));
    const form = new FormGroup({ participantes: array });
    const diagnostics = buildFormDiagnostics(form, { fieldMeta: { participantes: { label: 'Participantes' } } });
    expect(diagnostics.issues).toContain(
      jasmine.objectContaining({ field: 'participantes', code: 'minItems', required: 2, current: 1 })
    );
    expect(diagnostics.issues).toContain(jasmine.objectContaining({ field: 'participantes[0]', code: 'required' }));
  });

  it('marks the diagnostics invalid and includes server issues when extraIssues are provided, even if the client form is valid', () => {
    const form = new FormGroup({ nombre: new FormControl('Ana', Validators.required) });
    const diagnostics = buildFormDiagnostics(form, {
      extraIssues: [{ code: 'INSCRIPCION_PLAZO_CERRADO', source: 'server' }]
    });
    expect(diagnostics.valid).toBe(false);
    expect(diagnostics.issues).toEqual([{ code: 'INSCRIPCION_PLAZO_CERRADO', source: 'server' }]);
  });

  it('caps the number of issues to avoid an unbounded payload', () => {
    const controls: Record<string, FormControl> = {};
    for (let index = 0; index < 20; index += 1) controls[`campo${index}`] = new FormControl('', Validators.required);
    const form = new FormGroup(controls);
    expect(buildFormDiagnostics(form, { maxIssues: 3 }).issues.length).toBe(3);
  });

  // Correccion (rubi-auditoria-resultados.json): totalIssues se calcula SIEMPRE
  // antes de recortar, para que Rubi nunca afirme un numero de problemas menor
  // que el real cuando hay mas de maxIssues.
  function formWithErrors(count: number): FormGroup {
    const controls: Record<string, FormControl> = {};
    for (let index = 0; index < count; index += 1) controls[`campo${index}`] = new FormControl('', Validators.required);
    return new FormGroup(controls);
  }

  it('reports totalIssues=issues.length and truncated=false when everything fits under the limit', () => {
    const diagnostics = buildFormDiagnostics(formWithErrors(3));
    expect(diagnostics.issues.length).toBe(3);
    expect(diagnostics.totalIssues).toBe(3);
    expect(diagnostics.truncated).toBe(false);
  });

  it('reports the real totalIssues and truncated=true when there are more errors than maxIssues', () => {
    const diagnostics = buildFormDiagnostics(formWithErrors(12));
    expect(diagnostics.issues.length).toBe(8);
    expect(diagnostics.totalIssues).toBe(12);
    expect(diagnostics.truncated).toBe(true);
  });

  it('never exposes a control value anywhere in the diagnostics, truncated or not', () => {
    const form = new FormGroup({
      ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`campo${index}`, new FormControl('', Validators.required)])),
      telefono: new FormControl('600123456', Validators.pattern(/^[0-9]{5}$/))
    });
    const diagnostics = buildFormDiagnostics(form, { fieldMeta: { telefono: { label: 'Telefono' } } });
    expect(diagnostics.truncated).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toContain('600123456');
  });

  it('includes the submitted flag only when explicitly provided', () => {
    const form = new FormGroup({ nombre: new FormControl('Ana') });
    expect(buildFormDiagnostics(form).submitted).toBeUndefined();
    expect(buildFormDiagnostics(form, { submitted: true }).submitted).toBe(true);
    expect(buildFormDiagnostics(form, { submitted: false }).submitted).toBe(false);
  });
});

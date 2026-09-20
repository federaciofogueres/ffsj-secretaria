import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

import { RubiFormDiagnosticIssue, RubiFormDiagnostics } from './rubi-api.service';

// G (form-diagnostics): unico punto del frontend que traduce el estado de un
// FormGroup/FormArray/FormControl a metadatos seguros. Nunca lee ni reenvia
// `control.value` salvo el `.length` de un valor array (un recuento, no dato
// de usuario), y nunca copia el payload bruto de un ValidationErrors (p.ej.
// `pattern` incluye `actualValue` en Angular: se descarta explicitamente).
export interface FormDiagnosticFieldMeta {
  label?: string;
  max?: number;
  min?: number;
}

export interface BuildFormDiagnosticsOptions {
  submitted?: boolean;
  fieldMeta?: Record<string, FormDiagnosticFieldMeta>;
  extraIssues?: RubiFormDiagnosticIssue[];
  maxIssues?: number;
}

const DEFAULT_MAX_ISSUES = 8;

export function buildFormDiagnostics(
  root: AbstractControl | null | undefined,
  options: BuildFormDiagnosticsOptions = {}
): RubiFormDiagnostics {
  if (!root) return { present: false, valid: true, issues: [] };
  const fieldMeta = options.fieldMeta || {};
  const extraIssues = options.extraIssues || [];
  const clientIssues: RubiFormDiagnosticIssue[] = [];
  collect(root, '', fieldMeta, clientIssues);
  const maxIssues = options.maxIssues ?? DEFAULT_MAX_ISSUES;
  // G (form-diagnostics, correccion): `totalIssues` se calcula SIEMPRE antes
  // de recortar, para que Rubi nunca afirme un numero de problemas menor que
  // el real cuando hay mas de `maxIssues`. Es solo un recuento (metadata
  // segura, nunca un dato de usuario), igual que `current` ya lo era.
  const combined = [...clientIssues, ...extraIssues];
  const totalIssues = combined.length;
  const issues = combined.slice(0, maxIssues);
  return {
    present: true,
    valid: root.valid && !extraIssues.length,
    ...(options.submitted !== undefined ? { submitted: options.submitted } : {}),
    issues,
    totalIssues,
    truncated: totalIssues > issues.length
  };
}

function collect(
  control: AbstractControl,
  path: string,
  fieldMeta: Record<string, FormDiagnosticFieldMeta>,
  out: RubiFormDiagnosticIssue[]
): void {
  if (control instanceof FormGroup) {
    Object.keys(control.controls).forEach(key => collect(control.controls[key], path ? `${path}.${key}` : key, fieldMeta, out));
    return;
  }
  if (control instanceof FormArray) {
    addOwnErrors(control, path, fieldMeta, out);
    control.controls.forEach((child, index) => collect(child, `${path}[${index}]`, fieldMeta, out));
    return;
  }
  addOwnErrors(control, path, fieldMeta, out);
}

function addOwnErrors(
  control: AbstractControl,
  path: string,
  fieldMeta: Record<string, FormDiagnosticFieldMeta>,
  out: RubiFormDiagnosticIssue[]
): void {
  if (!control.errors) return;
  const meta = fieldMeta[path];
  Object.keys(control.errors).forEach(key => out.push(translate(key, control.errors![key], control, path, meta)));
}

function translate(
  key: string,
  rawError: unknown,
  control: AbstractControl,
  path: string,
  meta?: FormDiagnosticFieldMeta
): RubiFormDiagnosticIssue {
  const base: RubiFormDiagnosticIssue = {
    ...(path ? { field: path } : {}),
    ...(meta?.label ? { label: meta.label } : {}),
    code: key,
    source: 'client'
  };
  const err = isRecord(rawError) ? rawError : undefined;
  const arrayValued = Array.isArray(control.value);

  if (key === 'required' && typeof control.value === 'boolean') {
    // Angular's Validators.requiredTrue reports the same `required` key as
    // Validators.required (it never fires on a non-boolean control, since
    // `false`/0/'' are not "empty" for a boolean field), so a boolean-typed
    // control is unambiguously the checkbox-style "must be true" case.
    return { ...base, code: 'requiredTrue' };
  }
  if (key === 'minlength' || key === 'maxlength') {
    const required = toNumber(err?.['requiredLength']);
    const current = toNumber(err?.['actualLength']);
    return {
      ...base,
      code: arrayValued ? (key === 'minlength' ? 'minItems' : 'maxItems') : key,
      ...(required !== undefined ? { required } : {}),
      ...(current !== undefined ? { current } : {})
    };
  }
  if (key === 'min' || key === 'max') {
    const required = toNumber(err?.[key]);
    const current = toNumber(err?.['actual']);
    return { ...base, ...(required !== undefined ? { required } : {}), ...(current !== undefined ? { current } : {}) };
  }
  if (key === 'maxSelections') {
    const current = arrayValued ? (control.value as unknown[]).length : undefined;
    return {
      ...base,
      code: 'maxItems',
      ...(meta?.max !== undefined ? { required: meta.max } : {}),
      ...(current !== undefined ? { current } : {})
    };
  }
  if (key === 'minSelections') {
    const current = arrayValued ? (control.value as unknown[]).length : undefined;
    return {
      ...base,
      code: 'minItems',
      ...(meta?.min !== undefined ? { required: meta.min } : {}),
      ...(current !== undefined ? { current } : {})
    };
  }
  // required, requiredTrue, pattern, email, o cualquier validador custom no
  // reconocido: se conserva el `code` (un identificador seguro definido en
  // codigo, nunca un dato de usuario) sin copiar ningun otro campo del error
  // (p.ej. `pattern` trae `actualValue` en Angular; nunca se propaga).
  return base;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

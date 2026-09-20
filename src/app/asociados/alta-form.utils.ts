import { AbstractControl, ValidationErrors } from '@angular/forms';

export const ALTA_TELEFONO_PATTERN = /^[+0-9][0-9\s-]{7,19}$/;

export function fechaHoyLocal(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function fechaNacimientoValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim();
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= fechaHoyLocal()
    ? null : { fechaNacimientoInvalida: true };
}

export function identificacionValidator(control: AbstractControl): ValidationErrors | null {
  const value = normalizarIdentificacion(control.value);
  if (!value) return { required: true };
  const documento = /^(?:\d{8}|[XYZ]\d{7})[A-Z]$/.test(value)
    || /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{5,20}$/.test(value);
  const sip = /^(?=.*\d)[A-Z0-9-]{5,30}$/.test(value);
  return documento || sip ? null : { identificacionInvalida: true };
}

export function normalizarIdentificacion(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

export function esMenorDeEdad(value: unknown, today = new Date()): boolean {
  const raw = String(value || '').trim();
  const nacimiento = new Date(`${raw}T00:00:00`);
  if (!raw || Number.isNaN(nacimiento.getTime())) return false;
  let edad = today.getFullYear() - nacimiento.getFullYear();
  if (today.getMonth() < nacimiento.getMonth()
    || (today.getMonth() === nacimiento.getMonth() && today.getDate() < nacimiento.getDate())) edad--;
  return edad < 18;
}

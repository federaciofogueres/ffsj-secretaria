import { formatMadridDate, madridDateOnly, toMadridDateTimeInputValue } from './madrid-time.util';

describe('madrid-time.util (0.31.0#ESMERALDA)', () => {
  // El backend devuelve siempre un ISO-8601 con el offset real de
  // Europe/Madrid para esa fecha (ver utils/zonedTime.js en la API):
  // "+02:00" en horario de verano, "+01:00" en horario de invierno.
  const veranoIso = '2026-09-21T18:00:00Z'; // 20:00 local Madrid (CEST, +02:00)
  const inviernoIso = '2026-01-15T19:00:00Z'; // 20:00 local Madrid (CET, +01:00)

  it('toMadridDateTimeInputValue muestra la hora local de Madrid, no la del navegador ni la UTC cruda (verano)', () => {
    expect(toMadridDateTimeInputValue(veranoIso)).toBe('2026-09-21T20:00');
  });

  it('toMadridDateTimeInputValue muestra la hora local de Madrid, no la del navegador ni la UTC cruda (invierno)', () => {
    expect(toMadridDateTimeInputValue(inviernoIso)).toBe('2026-01-15T20:00');
  });

  it('toMadridDateTimeInputValue tambien funciona sobre el ISO con offset que ya devuelve la API directamente', () => {
    expect(toMadridDateTimeInputValue('2026-09-21T20:00:00+02:00')).toBe('2026-09-21T20:00');
    expect(toMadridDateTimeInputValue('2026-01-15T20:00:00+01:00')).toBe('2026-01-15T20:00');
  });

  it('toMadridDateTimeInputValue sin valor no fabrica una fecha', () => {
    expect(toMadridDateTimeInputValue(null)).toBe('');
    expect(toMadridDateTimeInputValue(undefined)).toBe('');
  });

  it('madridDateOnly extrae el dia de calendario de Madrid, incluso cuando difiere del dia UTC', () => {
    // 00:30 del 15 de enero en Madrid (CET, +01:00) es 23:30 del 14 en UTC.
    expect(madridDateOnly('2026-01-15T00:30:00+01:00')).toBe('2026-01-15');
  });

  it('formatMadridDate soporta los patrones usados por las plantillas del calendario', () => {
    expect(formatMadridDate(veranoIso, 'dd/MM/y')).toBe('21/09/2026');
    expect(formatMadridDate(veranoIso, 'HH:mm')).toBe('20:00');
    expect(formatMadridDate(veranoIso, 'dd/MM/y HH:mm')).toBe('21/09/2026 20:00');
  });
});

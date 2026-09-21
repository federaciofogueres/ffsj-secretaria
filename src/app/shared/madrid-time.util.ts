// 0.31.0#ESMERALDA: contrato temporal para fecha/hora de Actividades.
//
// El backend expone `fechaInicio`/`fechaFin` como ISO-8601 con el offset
// real de Europe/Madrid para esa fecha (`+02:00` en verano, `+01:00` en
// invierno, ver utils/zonedTime.js en ffsj-secretaria-api). `new Date(iso)`
// ya parsea correctamente ese instante (trae offset explicito), pero
// mostrarlo o volcarlo a un <input type="datetime-local"> usando los
// getters LOCALES del navegador (`getHours()`, el pipe `date` de Angular
// sin zona, etc.) lo reconvertiria a la zona del navegador de quien mire
// la pantalla, no a la de Madrid. Estas utilidades extraen siempre los
// componentes en Europe/Madrid via `Intl`, sea cual sea la zona del
// navegador.

export const TIME_ZONE = 'Europe/Madrid';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

interface ZonedComponents {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
}

function zonedComponents(date: Date, timeZone: string = TIME_ZONE): ZonedComponents {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
  return {
    year: get('year'), month: get('month'), day: get('day'),
    hour: get('hour'), minute: get('minute'), second: get('second')
  };
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Valor para <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") mostrando
// la hora local de Madrid, no la del navegador.
export function toMadridDateTimeInputValue(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '';
  const zoned = zonedComponents(date);
  return `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)}T${pad(zoned.hour)}:${pad(zoned.minute)}`;
}

// Fecha "YYYY-MM-DD" en Madrid para un instante, usada para saber en que
// dia del calendario cae una actividad (nunca el dia segun el navegador).
export function madridDateOnly(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '';
  const zoned = zonedComponents(date);
  return `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)}`;
}

// Formato legible en Madrid. Solo soporta los patrones que usan las
// plantillas de este modulo (no es un formateador generico de fechas).
export function formatMadridDate(value: string | null | undefined, pattern: 'dd/MM/y' | 'dd/MM/y HH:mm' | 'HH:mm'): string {
  const date = parseDate(value);
  if (!date) return '';
  const zoned = zonedComponents(date);
  const datePart = `${pad(zoned.day)}/${pad(zoned.month)}/${zoned.year}`;
  const timePart = `${pad(zoned.hour)}:${pad(zoned.minute)}`;
  if (pattern === 'dd/MM/y') return datePart;
  if (pattern === 'HH:mm') return timePart;
  return `${datePart} ${timePart}`;
}

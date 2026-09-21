import { Pipe, PipeTransform } from '@angular/core';
import { formatMadridDate } from './madrid-time.util';

// 0.31.0#ESMERALDA: sustituye al pipe `date` de Angular para fecha/hora de
// Actividades. El pipe `date` reconvierte a la zona del navegador (o a un
// offset fijo si se le pasa `timezone`, sin tener en cuenta el horario de
// verano/invierno); este pipe siempre muestra la hora local de Madrid.
@Pipe({ name: 'madridDate', standalone: true, pure: true })
export class MadridDatePipe implements PipeTransform {
  transform(value: string | null | undefined, pattern: 'dd/MM/y' | 'dd/MM/y HH:mm' | 'HH:mm' = 'dd/MM/y'): string {
    return formatMadridDate(value, pattern);
  }
}

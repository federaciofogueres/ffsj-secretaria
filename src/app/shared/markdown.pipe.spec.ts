import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  const pipe = new MarkdownPipe();

  it('convierte encabezados, negrita, listas y enlaces a HTML', () => {
    const html = pipe.transform('# Título\n\n**Importante**: trae el *DNI* y:\n\n- Uno\n- Dos\n\n[Más info](https://example.test)');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>Importante</strong>');
    expect(html).toContain('<em>DNI</em>');
    expect(html).toContain('<li>Uno</li>');
    expect(html).toContain('<a href="https://example.test">Más info</a>');
  });

  it('conserva los saltos de línea como párrafos separados', () => {
    const html = pipe.transform('Primer párrafo.\n\nSegundo párrafo.');
    expect(html).toContain('<p>Primer párrafo.</p>');
    expect(html).toContain('<p>Segundo párrafo.</p>');
  });

  it('devuelve una cadena vacía cuando no hay contenido (sin bloque vacío)', () => {
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('   ')).toBe('');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});

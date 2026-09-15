import packageMetadata from '../../../package.json';
import { APP_VERSION } from './app-version';

describe('APP_VERSION', () => {
  it('deriva la etiqueta mostrada desde la versión del paquete', () => {
    const [number, release] = packageMetadata.version.split('+', 2);
    const expected = release ? `${number}#${release.toUpperCase()}` : number;

    expect(APP_VERSION).toBe(expected);
  });
});

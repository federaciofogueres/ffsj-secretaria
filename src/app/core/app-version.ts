/** Fuente única de la versión mostrada por Secretaría. */
import packageMetadata from '../../../package.json';

const [number, release] = packageMetadata.version.split('+', 2);

/** Versión mostrada, derivada de package.json durante el build. */
export const APP_VERSION = release ? `${number}#${release.toUpperCase()}` : number;

'use strict';

const fs = require('fs');
const path = require('path');

const output = process.argv[2];
if (!output) {
  throw new Error('Uso: node scripts/write-runtime-config.js <archivo-destino>');
}

const config = {
  censoApiBasePath: process.env.FFSJ_CENSO_API_BASE_PATH,
  secretariaApiBasePath: process.env.FFSJ_SECRETARIA_API_BASE_PATH,
  filesBasePath: process.env.FFSJ_FILES_BASE_PATH
};

const variableNames = {
  censoApiBasePath: 'FFSJ_CENSO_API_BASE_PATH',
  secretariaApiBasePath: 'FFSJ_SECRETARIA_API_BASE_PATH',
  filesBasePath: 'FFSJ_FILES_BASE_PATH'
};

for (const [key, value] of Object.entries(config)) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Falta la Variable de GitHub ${variableNames[key]}`);
  }
  config[key] = value.trim().replace(/\/$/, '');
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(config, null, 2)}\n`);

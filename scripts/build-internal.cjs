/**
 * Script de empaquetado para distribución interna corporativa.
 * Inyecta temporalmente la configuración sensible en el paquete NSIS
 * asegurando que los instaladores queden 100% Plug & Play para la intranet/Teams
 * y limpiando el archivo temporal inmediatamente después para evitar fugas en Git.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const localConfigJson = path.join(rootDir, 'cmda.config.local.json');
const dotEnvPath = path.join(rootDir, '.env');
const embeddedConfigDest = path.join(rootDir, 'electron', 'embedded.config.json');

console.log('--- Iniciando empaquetado interno corporativo (Plug & Play) ---');

let masterConfig = null;

if (fs.existsSync(localConfigJson)) {
  console.log('✓ Detectada configuración local en cmda.config.local.json');
  masterConfig = JSON.parse(fs.readFileSync(localConfigJson, 'utf8'));
} else if (fs.existsSync(dotEnvPath)) {
  console.log('✓ Detectada configuración local en .env');
  const envContent = fs.readFileSync(dotEnvPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  const parsed = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      parsed[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  masterConfig = {
    dbServer: parsed.CMDA_DB_SERVER || '',
    dbDatabase: parsed.CMDA_DB_NAME || '',
    dbUser: parsed.CMDA_DB_USER || '',
    dbPassword: parsed.CMDA_DB_PASSWORD || '',
    dbPort: Number(parsed.CMDA_DB_PORT) || 1433,
    corporateDomain: parsed.CMDA_CORP_DOMAIN || '',
  };
}

let injected = false;
try {
  // Primero compilar Vite
  console.log('1. Compilando aplicación web con Vite...');
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

  if (masterConfig && masterConfig.dbServer) {
    console.log('2. Inyectando configuración maestra temporal en paquete...');
    fs.writeFileSync(embeddedConfigDest, JSON.stringify(masterConfig, null, 2), 'utf8');
    injected = true;
  } else {
    console.log('⚠️ No se encontró cmda.config.local.json ni .env con datos. Se empaquetará sin configuración predefinida.');
  }

  console.log('3. Generando ejecutables con electron-builder...');
  execSync('npx electron-builder --win -c.artifactName="${productName}-Corporativo-${version}.${ext}"', {
    stdio: 'inherit',
    cwd: rootDir,
  });

  console.log('✓ Empaquetado corporativo finalizado exitosamente.');
} finally {
  if (injected && fs.existsSync(embeddedConfigDest)) {
    fs.unlinkSync(embeddedConfigDest);
    console.log('✓ Archivo temporal de configuración sensible removido.');
  }
}

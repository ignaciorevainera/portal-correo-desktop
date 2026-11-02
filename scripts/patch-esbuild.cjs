const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'esbuild', 'lib', 'main.js');
if (fs.existsSync(target)) {
  try {
    let content = fs.readFileSync(target, 'utf8');
    if (content.includes('input.length > 1024 * 1024')) {
      content = content.replace('input.length > 1024 * 1024', 'input.length > 100 * 1024 * 1024');
      fs.writeFileSync(target, content, 'utf8');
    }
  } catch {
    // Si falla o no tiene permisos, no bloquear el flujo
  }
}

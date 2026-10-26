# Track: Importación de Configuración Corporativa en Ajustes, Autodescubrimiento en Arranque y Empaquetado Interno Plug & Play

## Descripción
Este track implementa la experiencia "Plug & Play" corporativa:
1. Autodescubrimiento en arranque mediante jerarquía (%APPDATA% -> carpeta ejecutable -> .env local).
2. Pestaña de "Conexión Corporativa" en el modal de Ajustes para importar, probar y eliminar configuraciones en 1 clic.
3. Pipeline de empaquetado dual con `npm run release:internal` para distribuir instaladores internos autoconfigurados sin comprometer las releases públicas en GitHub.

## Enlaces
- [metadata.json](./metadata.json)
- [spec.md](./spec.md)
- [plan.md](./plan.md)

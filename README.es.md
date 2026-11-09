# Personal Finance Hub

PWA de finanzas personales con Next.js, React y TypeScript. Por defecto es
una **demostración pública con datos ficticios**. No altera ninguna cuenta,
hoja de cálculo o calendario real.

## Funcionalidades

Panel, gastos, facturas, presupuestos, informes y vista previa del calendario.
Las operaciones de ejemplo requieren una vista previa y confirmación; solo
cambian datos temporales en el navegador. Las cuotas se atribuyen al mes de
vencimiento y las posibles transacciones duplicadas se señalan sin borrarlas.
Se ha implementado OAuth de Google con PKCE, acceso limitado a una identidad
verificada, sesiones cifradas en el servidor y un lector de Sheets **solo
lectura**. Este acceso está **desactivado por defecto y sin validación con
Google o una hoja real**. Las escrituras y Calendar siguen deshabilitados.

## Ejecución

Node.js 22+ y npm: `npm ci`, `npm run dev` y
`http://localhost:3000`. Pruebas: `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build` y `npm run test:e2e`.

Configuración privada: `docs/google-setup.md`. Seguridad:
`docs/security.md`. Mapeo: `docs/sheets-mapping.md`.
Tareas restantes: `docs/release-checklist.md`.

## PWA

La instalación requiere HTTPS y un navegador compatible.
Android permite instalar desde el navegador; en iPhone se utiliza
Safari → Compartir → Añadir a pantalla de inicio.
Las pruebas en dispositivos reales siguen pendientes.
No se almacenan datos financieros sin conexión. Licencia MIT.

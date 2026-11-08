# Personal Finance Hub

PWA de finanzas personales de código abierto con Next.js, React y TypeScript.
**Estado actual:** demostración con datos completamente ficticios.
No inicia sesión en Google ni modifica hojas o calendarios reales.

## Funciones disponibles

Panel financiero, gastos, facturas, presupuestos, informes, cálculos
deterministas y vista previa de eventos de calendario. Registrar gastos
y pagar facturas en la demo solo modifica el estado temporal en pantalla.
Existe un cliente de lectura para Sheets, pero OAuth no está activado.

## Ejecución y pruebas

Con Node.js 24 y npm: npm install, npm run dev y abrir
http://localhost:3000. Pruebas: npm test, npm run lint,
npm run typecheck, npm run build y npm run test:e2e.

Consulte docs/architecture.md, docs/sheets-mapping.md,
docs/security.md y docs/google-setup.md. No se publican datos reales.

## Instalación

En HTTPS, Android: opción de instalar desde el navegador.
En iPhone: Safari, Compartir, Añadir a pantalla de inicio.
La compatibilidad se deberá probar en dispositivos reales.
El modo sin conexión no almacena datos financieros.

**Pendiente:** OAuth seguro, integración real, copias de seguridad,
escritura idempotente, sincronización autorizada, despliegue manual
y revisión final. Licencia MIT.

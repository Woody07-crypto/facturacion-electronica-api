# Plataforma de Facturación Electrónica

API REST + interfaz web para la emisión, gestión y consulta de documentos tributarios electrónicos (facturas y notas de crédito), con control de series y correlativos, estados, conciliación de pagos y reportes de ventas.

## Stack

- **NestJS 10** + **TypeORM 0.3**
- **JWT** con control de acceso por roles (`ADMIN`, `VENTAS`)
- **class-validator / class-transformer** en todos los DTOs
- **Swagger / OpenAPI** en `/api/docs`
- **Jest + Supertest** (45 pruebas, cobertura ≈ 97% de líneas)
- Base de datos: **sql.js** (SQLite en WebAssembly, sin compilación nativa) por defecto; **PostgreSQL** para producción vía variables de entorno
- Interfaz: SPA en JavaScript puro servida por la misma API en `/`

## Instalación y ejecución

```bash
npm install
npm start
```

- Interfaz web: `http://localhost:3000/`
- Swagger: `http://localhost:3000/api/docs`

El **primer usuario registrado** recibe rol `ADMIN`; los siguientes, `VENTAS`. Desde la pantalla de login puede crearse el primer usuario.

### Pruebas y cobertura

```bash
npm test        # 45 pruebas (unitarias + e2e)
npm run test:cov  # reporte de cobertura en coverage/
```

### PostgreSQL (producción)

```bash
DB_TYPE=postgres DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASS=postgres DB_NAME=facturacion npm start
```

Con PostgreSQL, la asignación de correlativos usa bloqueo pesimista (`SELECT … FOR UPDATE`) además del índice único.

## Entidades (TypeORM, 8 relacionadas)

`Usuario`, `Cliente`, `Serie`, `Factura`, `LineaFactura`, `Pago`, `NotaCredito`, `Bitacora`

Índices únicos: `clientes.nit`, `series(tipoDocumento, prefijo)`, `facturas(serie, numero)`, `notas_credito(serie, numero)`.

## Reglas de negocio implementadas

- IVA 13% calculado automáticamente por línea y por documento; totales redondeados a 2 decimales.
- Correlativo único por serie garantizado con tres capas: mutex por serie en la aplicación, transacción con reintento ante violación de unicidad, e índice único en base de datos (más bloqueo pesimista en PostgreSQL).
- No se puede **anular** una factura con pagos registrados; la anulación exige razón (mínimo 5 caracteres).
- La suma de **notas de crédito** de una factura nunca puede superar su monto original.
- **Saldo pendiente** = total − pagos − notas de crédito; transiciones automáticas de estado `EMITIDA → PAGADA_PARCIAL → PAGADA` y `EMITIDA → ANULADA`.
- No se aceptan pagos mayores al saldo ni pagos sobre facturas anuladas.
- Toda transición de estado emite el evento `documento.transicion` (EventEmitter2) y queda registrada en la **bitácora** de auditoría.

## Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Registro y autenticación JWT |
| CRUD | `/clientes` | Clientes con NIT, NRC y giro (desactivar: solo ADMIN) |
| POST/GET | `/series` | Series y correlativos (crear: solo ADMIN) |
| POST/GET | `/facturas` | Emisión y consulta de facturas |
| GET | `/facturas/:id/saldo` | Saldo pendiente calculado |
| POST | `/facturas/:id/anular` | Anulación con razón (solo ADMIN) |
| POST/GET | `/facturas/:id/pagos` | Pagos parciales o totales |
| POST/GET | `/notas-credito` | Notas de crédito vinculadas a factura |
| GET | `/conciliacion` | Pendientes, vencidas y pagadas |
| GET | `/reportes/ventas?periodo=dia\|semana\|mes` | Ventas con totales por cliente |
| GET | `/bitacora?entidad=` | Auditoría (solo ADMIN) |

## Colección Postman

`postman_collection.json` contiene el flujo completo **emisión → pago → anulación** con variables (`baseUrl`, `token`) y scripts que capturan automáticamente el token y los IDs generados. Importar en Postman y ejecutar en orden (o con el Collection Runner).

## Interfaz web

SPA sin frameworks (tres archivos en `public/`): cliente HTTP con manejo de sesión y expiración, store con suscripciones, enrutador por hash, vistas conscientes del rol del usuario, cálculo de IVA en vivo idéntico al backend, panel de detalle con estética de documento tributario y gráfica de ventas en SVG puro.
# facturacion-electronica-api

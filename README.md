# Plataforma de Facturación Electrónica

API REST + interfaz web para la emisión, gestión y consulta de documentos tributarios electrónicos (facturas, notas de crédito y notas de débito), con control de series y correlativos, estados, conciliación de pagos y reportes de ventas.

## Stack

- **NestJS 10** + **TypeORM 0.3**
- **JWT** con control de acceso por roles (`ADMIN`, `VENTAS`)
- **class-validator / class-transformer** en todos los DTOs
- **Swagger / OpenAPI** en `/api/docs`
- **Jest + Supertest** (57 pruebas)
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
npm test        # 57 pruebas (unitarias + e2e)
npm run test:cov  # reporte de cobertura en coverage/
```

### PostgreSQL (producción)

```bash
DB_TYPE=postgres DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASS=postgres DB_NAME=facturacion npm start
```

Con PostgreSQL, la asignación de correlativos usa bloqueo pesimista (`SELECT … FOR UPDATE`) además del índice único.

## Entidades (TypeORM, 12 relacionadas)

`Usuario`, `Cliente`, `Emisor`, `Establecimiento`, `PuntoVenta`, `Serie`, `Factura`, `LineaFactura`, `Pago`, `NotaCredito`, `NotaDebito`, `Bitacora`

Índices únicos: `clientes.nit`, `emisores.nit`, `establecimientos(emisor, codigo)`, `puntos_venta(establecimiento, codigo)`, `series(tipoDocumento, prefijo)`, `facturas(serie, numero)`, `notas_credito(serie, numero)`, `notas_debito(serie, numero)`.

## DTE / Ministerio de Hacienda (Fase 1)

Módulo **aditivo** de emisor (contribuyente), establecimientos y puntos de venta. No altera el flujo de facturas/pagos/NC/ND.

- Roadmap y principios: [`docs/dte-mh/ROADMAP.md`](docs/dte-mh/ROADMAP.md)
- Ambiente por defecto: `DTE_AMBIENTE=00` (pruebas). Fases 2–15 **bloqueadas** hasta pegar JSON Schemas y CAT-XXX oficiales en `docs/dte-mh/`.

## Reglas de negocio implementadas

- IVA 13% calculado automáticamente por línea y por documento; totales redondeados a 2 decimales.
- Correlativo único por serie garantizado con tres capas: mutex por serie en la aplicación, transacción con reintento ante violación de unicidad, e índice único en base de datos (más bloqueo pesimista en PostgreSQL).
- No se puede **anular** una factura con pagos registrados; la anulación exige razón (mínimo 5 caracteres).
- La suma de **notas de crédito** de una factura nunca puede superar su monto original.
- Las **notas de débito** aumentan el saldo pendiente del cliente (cargos adicionales vinculados a la factura).
- **Saldo pendiente** = total + notas de débito − pagos − notas de crédito; transiciones automáticas de estado `EMITIDA → PAGADA_PARCIAL → PAGADA` y `EMITIDA → ANULADA`.
- No se aceptan pagos mayores al saldo ni pagos sobre facturas anuladas.
- Las series desactivadas no pueden usarse para emitir documentos.
- Un solo **emisor activo** a la vez; establecimientos y PV con códigos únicos por jerarquía.
- Toda transición de estado emite el evento `documento.transicion` (EventEmitter2) y queda registrada en la **bitácora** de auditoría.

## Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Registro y autenticación JWT |
| CRUD | `/clientes` | Clientes con NIT, NRC y giro (desactivar: solo ADMIN) |
| CRUD | `/emisor` … `/emisor/establecimientos` … `/puntos-venta` | Contribuyente emisor (Fase 1 DTE) |
| POST/GET/DELETE | `/series` | Series y correlativos (crear/desactivar: solo ADMIN) |
| POST/GET | `/facturas` | Emisión y consulta de facturas |
| GET | `/facturas/:id/saldo` | Saldo pendiente calculado |
| POST | `/facturas/:id/anular` | Anulación con razón (solo ADMIN) |
| POST/GET | `/facturas/:id/pagos` | Pagos parciales o totales |
| POST/GET | `/notas-credito` | Notas de crédito vinculadas a factura |
| POST/GET | `/notas-debito` | Notas de débito vinculadas a factura |
| GET | `/conciliacion` | Pendientes, vencidas y pagadas |
| GET | `/reportes/ventas?periodo=dia\|semana\|mes` | Ventas con totales por cliente |
| GET | `/bitacora?entidad=` | Auditoría (solo ADMIN) |

## Colección Postman

`postman_collection.json` contiene el flujo completo **emisión → pago → nota de crédito → nota de débito → anulación** con variables (`baseUrl`, `token`) y scripts que capturan automáticamente el token y los IDs generados. Importar en Postman y ejecutar en orden (o con el Collection Runner).

## Interfaz web

SPA sin frameworks (tres archivos en `public/`): cliente HTTP con manejo de sesión y expiración, store con suscripciones, enrutador por hash, vistas conscientes del rol del usuario, cálculo de IVA en vivo idéntico al backend, panel de detalle con estética de documento tributario y gráfica de ventas en SVG puro.

## Cómo usar la aplicación

Abra `http://localhost:3000/` en el navegador. Toda la operación diaria se hace desde esta interfaz; Swagger (`/api/docs`) es opcional para pruebas técnicas.

### 1. Primer acceso

1. En la pantalla de login, use **Crear el primer usuario (ADMIN)**.
2. Complete nombre, correo y contraseña (mínimo 6 caracteres) y registre.
3. Queda autenticado como `ADMIN`. Los usuarios que se registren después reciben rol `VENTAS`.

### 2. Configuración inicial (solo ADMIN)

Antes de emitir documentos:

1. **Series** → cree al menos una serie activa de cada tipo:
   - `FACTURA` (ej. prefijo `FAC-2027`)
   - `NOTA_CREDITO`
   - `NOTA_DEBITO`
2. **Clientes** → registre al menos un cliente (NIT, NRC, giro, etc.).

Sin series de factura o sin clientes, la emisión se bloquea y la UI lo indica.

### 3. Emitir una factura

1. Vaya a **Facturas** → **Emitir factura**.
2. Elija serie, cliente, fecha de vencimiento y líneas (descripción, cantidad, precio).
3. El IVA 13% y el total se calculan en vivo; confirme para emitir.
4. La factura queda en estado `EMITIDA` con número correlativo de la serie.

### 4. Cobrar / registrar un pago

Los pagos se registran desde el **detalle de la factura**, no desde una pantalla aparte:

1. En **Facturas** (o en el **Tablero**, en pendientes/vencidas), haga clic en la fila de la factura.
2. Si hay saldo pendiente y no está anulada, pulse **Registrar pago**.
3. Indique monto (puede ser parcial; no puede superar el saldo), método (`TRANSFERENCIA`, `EFECTIVO`, `TARJETA`, `CHEQUE`) y referencia opcional.
4. El estado pasa a `PAGADA_PARCIAL` o `PAGADA` según el saldo restante.

El efecto del cobro se ve en el **detalle** (pagado / saldo) y en el **Tablero** (conciliación). El **Reporte de ventas** no baja con un pago: mide **total facturado**, no lo cobrado.

### 5. Notas de crédito y débito

Desde el mismo detalle de la factura:

- **Nota de crédito** → reduce el saldo (no puede superar el total facturado menos NC ya emitidas). Requiere serie `NOTA_CREDITO`.
- **Nota de débito** → aumenta el saldo (cargo adicional vinculado). Requiere serie `NOTA_DEBITO`.

La vista **Notas** solo lista las ya emitidas; no sirve para crearlas.

### 6. Anular una factura (solo ADMIN)

En el detalle, **Anular** solo aparece si no hay pagos registrados. Debe indicar una razón (mínimo 5 caracteres).

### 7. Resto de pantallas

| Pantalla | Para qué sirve |
| --- | --- |
| **Tablero** | Conciliación: pendientes, vencidas y montos por cobrar |
| **Reportes** | Ventas del período (hoy / 7 días / mes) y total facturado por cliente |
| **Bitácora** | Auditoría de transiciones (solo ADMIN) |
| **Series / Clientes** | Maestros necesarios para emitir |

### Roles

| Acción | ADMIN | VENTAS |
| --- | --- | --- |
| Emitir facturas, pagos, notas | Sí | Sí |
| Crear / desactivar series | Sí | No |
| Desactivar clientes | Sí | No |
| Anular facturas | Sí | No |
| Ver bitácora | Sí | No |

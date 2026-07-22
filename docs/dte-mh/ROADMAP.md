# DTE — Ministerio de Hacienda (El Salvador)

## CONTEXTO (lo que ya existe y no se rompe)

La API académica de facturación ya cubre el ciclo interno de negocio:

- IVA 13 %, líneas de detalle y totales
- Series y numeración correlativa con unicidad bajo concurrencia
- Estados de factura: `EMITIDA`, `PAGADA_PARCIAL`, `PAGADA`, `ANULADA`
- Pagos parciales/totales, notas de crédito y notas de débito
- Saldo pendiente, conciliación y reportes de ventas
- JWT con roles `ADMIN` / `VENTAS` y bitácora por eventos
- Swagger, Postman y pruebas Jest/Supertest

Lo que **faltaba** para DTE oficial era el **contribuyente emisor** (hoy solo existían receptores en `/clientes`). La **Fase 1** agrega Emisor → Establecimientos → Puntos de venta de forma **aditiva**, sin vincular aún la emisión de facturas al MH.

---

## PRINCIPIOS

1. **No romper lo actual.** El flujo de facturas/pagos/NC/ND sigue intacto. DTE se construye en paralelo.
2. **Validar cada campo contra JSON Schemas oficiales del MH.** Hasta que existan archivos en `schemas/` y `catalogos/`, las fases 2–15 están **bloqueadas**.
3. **Ambiente de pruebas `00` por defecto** (`DTE_AMBIENTE=00`). Sin llamadas reales al MH en esta fase.
4. **Credenciales y certificados fuera del repo** (solo `.env` / rutas locales ignoradas por git).
5. **Idempotencia y pruebas por fase.** Cada fase debe traer sus tests antes de pasar a la siguiente.
6. **Si falta un esquema, URL o contrato del MH → detenerse y pedirlo.** No inventar nombres de campos ni rutas.

---

## Las 15 fases

| # | Fase | Estado |
|---|------|--------|
| 1 | Emisor, establecimientos y puntos de venta | **Hecha** (API + UI mínima) |
| 2 | Catálogo oficial de tipos de DTE (01, 03, 05/06, 07, 11, 14…) + CAT-XXX | **BLOQUEADO** — falta catálogo oficial |
| 3 | JSON oficial del DTE (identificación/emisor/receptor/cuerpo/resumen) por tipo | **BLOQUEADO** — faltan JSON Schemas |
| 4 | Código de generación (UUID) y número de control con formato oficial | **BLOQUEADO** — depende de schemas/CAT |
| 5 | Motor fiscal ampliado (gravado/exento/no sujeto, retenciones, monto en letras) | **BLOQUEADO** |
| 6 | Firma electrónica (firmador MH, abstraída para pruebas) | **BLOQUEADO** — falta URL/contrato firmador |
| 7 | Transmisión al MH (auth, recepción, sello, estados) | **BLOQUEADO** — faltan URLs oficiales |
| 8 | Contingencia (emisión diferida + transmisión posterior) | **BLOQUEADO** |
| 9 | Invalidación oficial ante el MH (reemplaza anulación interna a futuro) | **BLOQUEADO** |
| 10 | PDF con QR + envío JSON firmado y PDF al receptor | **BLOQUEADO** |
| 11 | Consulta/validación pública por código de generación | **BLOQUEADO** |
| 12 | Cola de transmisión, reintentos e idempotencia | **BLOQUEADO** |
| 13 | Libros de IVA (ventas contribuyente, CF, compras) | **BLOQUEADO** |
| 14 | Seguridad y roles (certificados cifrados, posible rol Contador) | **BLOQUEADO** |
| 15 | Pruebas e2e contra ambiente de pruebas MH por tipo y escenario | **BLOQUEADO** |

### Desbloqueo

Colocar en este directorio:

- `schemas/` — JSON Schemas oficiales por tipo de DTE y eventos (anexo al Manual Tecnológico)
- `catalogos/` — CAT-XXX vigentes (Excel/JSON/PDF oficial)

Luego continuar **solo con la Fase 2**.

---

## Criterios globales de aceptación

- La API de negocio existente permanece funcional y con tests en verde.
- Cada fase nueva es aditiva, documentada en Swagger y cubierta por pruebas.
- Ningún campo del JSON DTE se inventa: debe existir en schema oficial versionado en el repo.
- Ambiente por defecto `00`; producción `01` solo con configuración explícita.
- Secretos (API user MH, certificado `.p12`/`.crt`, contraseñas) nunca se suben al repositorio.
- Invalidación MH no elimina la anulación interna hasta que Fase 9 esté aceptada y migrada.

---

## Instrucción clave

**Trabajar una fase a la vez.** Si un esquema, URL o contrato del MH no está disponible, **detenerse y pedirlo** en vez de inventarlo.

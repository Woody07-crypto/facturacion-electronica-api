'use strict';

/* =========================================================
 * ICI Facturación Electrónica — SPA
 * Módulos: Api (HTTP), Store (estado), Ui (toasts/modales),
 * Router (hash) y Vistas (tablero, facturas, notas, clientes,
 * series, reportes, bitácora).
 * ========================================================= */

const IVA_RATE = 0.13;
const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const dinero = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });
const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-SV', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const fechaHora = (v) => (v ? new Date(v).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

/* ---------- Store ---------- */
const Store = (() => {
  const estado = { usuario: null, token: sessionStorage.getItem('ici_token') || null };
  const oyentes = new Set();
  const usuarioGuardado = sessionStorage.getItem('ici_usuario');
  if (usuarioGuardado) { try { estado.usuario = JSON.parse(usuarioGuardado); } catch { /* ignorar */ } }
  return {
    get: () => estado,
    esAdmin: () => estado.usuario?.rol === 'ADMIN',
    sesion(token, usuario) {
      estado.token = token; estado.usuario = usuario;
      sessionStorage.setItem('ici_token', token);
      sessionStorage.setItem('ici_usuario', JSON.stringify(usuario));
      oyentes.forEach((fn) => fn(estado));
    },
    limpiar() {
      estado.token = null; estado.usuario = null;
      sessionStorage.removeItem('ici_token');
      sessionStorage.removeItem('ici_usuario');
      oyentes.forEach((fn) => fn(estado));
    },
    suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); },
  };
})();

/* ---------- Api ---------- */
const Api = (() => {
  async function pedir(metodo, ruta, cuerpo) {
    const { token } = Store.get();
    const res = await fetch(ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    if (res.status === 401 && Store.get().token) {
      Store.limpiar();
      Ui.toast('La sesión expiró. Inicie sesión nuevamente.', 'error');
      Router.irA('#/login');
      throw new Error('Sesión expirada');
    }
    const datos = await res.json().catch(() => null);
    if (!res.ok) {
      const mensaje = Array.isArray(datos?.message) ? datos.message.join(' · ') : datos?.message || `Error ${res.status}`;
      const error = new Error(mensaje);
      error.status = res.status;
      throw error;
    }
    return datos;
  }
  return {
    get: (r) => pedir('GET', r),
    post: (r, c) => pedir('POST', r, c),
    patch: (r, c) => pedir('PATCH', r, c),
    del: (r) => pedir('DELETE', r),
  };
})();

/* ---------- Ui: toasts, modal, panel ---------- */
const Ui = (() => {
  function toast(mensaje, tipo = 'exito') {
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.textContent = mensaje;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function modal(html, alMontar) {
    $('#modal-contenido').innerHTML = html;
    $('#capa-modal').classList.remove('oculto');
    document.addEventListener('keydown', cerrarConEscape);
    if (alMontar) alMontar($('#modal-contenido'));
    const primerCampo = $('#modal-contenido input, #modal-contenido select, #modal-contenido textarea');
    if (primerCampo) primerCampo.focus();
  }
  function cerrarModal() {
    $('#capa-modal').classList.add('oculto');
    $('#modal-contenido').innerHTML = '';
    document.removeEventListener('keydown', cerrarConEscape);
  }
  function cerrarConEscape(e) { if (e.key === 'Escape') { cerrarModal(); cerrarPanel(); } }

  function panel(html, alMontar) {
    $('#panel-contenido').innerHTML = `<button class="panel-cerrar" aria-label="Cerrar">×</button>${html}`;
    $('#capa-panel').classList.remove('oculto');
    $('.panel-cerrar').addEventListener('click', cerrarPanel);
    document.addEventListener('keydown', cerrarConEscape);
    if (alMontar) alMontar($('#panel-contenido'));
  }
  function cerrarPanel() {
    $('#capa-panel').classList.add('oculto');
    $('#panel-contenido').innerHTML = '';
  }

  $('#capa-modal').addEventListener('click', (e) => { if (e.target.id === 'capa-modal') cerrarModal(); });
  $('#capa-panel').addEventListener('click', (e) => { if (e.target.id === 'capa-panel') cerrarPanel(); });

  function sello(estado, grande = false) {
    return `<span class="sello sello-${esc(estado)}${grande ? ' sello-grande' : ''}">${esc(estado).replace('_', ' ')}</span>`;
  }

  function conCarga(boton, fn) {
    return async (...args) => {
      const original = boton.textContent;
      boton.disabled = true; boton.textContent = 'Procesando…';
      try { await fn(...args); } finally { boton.disabled = false; boton.textContent = original; }
    };
  }

  return { toast, modal, cerrarModal, panel, cerrarPanel, sello, conCarga };
})();

/* ---------- Router ---------- */
const Router = (() => {
  const rutas = {};
  function registrar(nombre, vista) { rutas[nombre] = vista; }
  function irA(hash) { location.hash = hash; }
  async function resolver() {
    const nombre = (location.hash || '#/tablero').replace('#/', '') || 'tablero';
    const { token } = Store.get();
    if (!token) { mostrarLogin(); return; }
    mostrarApp();
    const vista = rutas[nombre] || rutas.tablero;
    if (vista.soloAdmin && !Store.esAdmin()) { irA('#/tablero'); return; }
    $$('#nav-principal a').forEach((a) => a.classList.toggle('activo', a.dataset.vista === nombre));
    $('#titulo-vista').textContent = vista.titulo;
    $('#acciones-vista').innerHTML = '';
    $('#vista').innerHTML = '<p class="tabla-vacia">Cargando…</p>';
    try { await vista.render(); } catch (e) { $('#vista').innerHTML = `<p class="tabla-vacia">${esc(e.message)}</p>`; }
  }
  window.addEventListener('hashchange', resolver);
  return { registrar, resolver, irA };
})();

function mostrarLogin() {
  $('#pantalla-login').classList.remove('oculto');
  $('#app').classList.add('oculto');
}
function mostrarApp() {
  $('#pantalla-login').classList.add('oculto');
  $('#app').classList.remove('oculto');
  const { usuario } = Store.get();
  $('#usuario-nombre').textContent = usuario?.nombre || '';
  $('#usuario-rol').textContent = usuario?.rol || '';
  $$('[data-solo-admin]').forEach((el) => el.classList.toggle('oculto', !Store.esAdmin()));
}

/* ---------- Autenticación ---------- */
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  try {
    const res = await Api.post('/auth/login', datos);
    Store.sesion(res.access_token, res.usuario);
    Router.irA('#/tablero');
    Router.resolver();
    Ui.toast(`Bienvenido, ${res.usuario.nombre}`);
  } catch (err) { Ui.toast(err.message, 'error'); }
});

$('#form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  try {
    await Api.post('/auth/register', datos);
    const res = await Api.post('/auth/login', { email: datos.email, password: datos.password });
    Store.sesion(res.access_token, res.usuario);
    Router.irA('#/tablero');
    Router.resolver();
    Ui.toast(`Usuario creado con rol ${res.usuario.rol}`);
  } catch (err) { Ui.toast(err.message, 'error'); }
});

$('#enlace-registro').addEventListener('click', (e) => { e.preventDefault(); $('#form-login').classList.add('oculto'); $('#form-registro').classList.remove('oculto'); });
$('#enlace-login').addEventListener('click', (e) => { e.preventDefault(); $('#form-registro').classList.add('oculto'); $('#form-login').classList.remove('oculto'); });
$('#btn-salir').addEventListener('click', () => { Store.limpiar(); Router.irA('#/login'); Router.resolver(); });

/* =========================================================
 * VISTAS
 * ========================================================= */

/* ---------- Tablero ---------- */
Router.registrar('tablero', {
  titulo: 'Tablero',
  async render() {
    const con = await Api.get('/conciliacion');
    const r = con.resumen;
    const vencidasMonto = round2(con.vencidas.reduce((a, f) => a + f.saldoPendiente, 0));
    $('#vista').innerHTML = `
      <div class="kpis">
        <div class="tarjeta kpi kpi-acento">
          <div class="kpi-etiqueta">Por cobrar</div>
          <div class="kpi-valor">${dinero.format(r.montoPorCobrar)}</div>
          <div class="kpi-detalle">${r.pendientesDeCobro + r.vencidas} facturas con saldo</div>
        </div>
        <div class="tarjeta kpi kpi-vencidas">
          <div class="kpi-etiqueta">Vencidas</div>
          <div class="kpi-valor">${r.vencidas}</div>
          <div class="kpi-detalle">${dinero.format(vencidasMonto)} en mora</div>
        </div>
        <div class="tarjeta kpi kpi-pendientes">
          <div class="kpi-etiqueta">Pendientes al día</div>
          <div class="kpi-valor">${r.pendientesDeCobro}</div>
          <div class="kpi-detalle">Dentro del plazo de crédito</div>
        </div>
        <div class="tarjeta kpi kpi-pagadas">
          <div class="kpi-etiqueta">Pagadas</div>
          <div class="kpi-valor">${r.pagadas}</div>
          <div class="kpi-detalle">De ${r.totalFacturas} facturas activas</div>
        </div>
      </div>
      <div class="dos-columnas">
        <div class="tarjeta">
          <div class="encabezado-seccion"><h3>Facturas vencidas</h3></div>
          ${tablaConciliacion(con.vencidas, 'Sin facturas vencidas. Buen trabajo de cobro.')}
        </div>
        <div class="tarjeta">
          <div class="encabezado-seccion"><h3>Pendientes de cobro</h3></div>
          ${tablaConciliacion(con.pendientes, 'No hay facturas pendientes dentro del plazo.')}
        </div>
      </div>`;
    conectarFilasFactura();
  },
});

function tablaConciliacion(filas, vacio) {
  if (!filas.length) return `<p class="tabla-vacia">${vacio}</p>`;
  return `<div class="tabla-envoltura"><table>
    <thead><tr><th>Documento</th><th>Cliente</th><th>Vence</th><th class="num">Saldo</th></tr></thead>
    <tbody>${filas.map((f) => `
      <tr class="clicable" data-factura="${f.id}">
        <td class="mono">${esc(f.numeroCompleto)}</td>
        <td>${esc(f.cliente)}</td>
        <td class="celda-secundaria">${fecha(f.fechaVencimiento)}</td>
        <td class="num">${dinero.format(f.saldoPendiente)}</td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

function conectarFilasFactura() {
  $$('[data-factura]').forEach((fila) => fila.addEventListener('click', () => abrirDetalleFactura(Number(fila.dataset.factura))));
}

/* ---------- Facturas ---------- */
Router.registrar('facturas', {
  titulo: 'Facturas',
  async render() {
    $('#acciones-vista').innerHTML = '<button class="btn btn-primario" id="btn-emitir">Emitir factura</button>';
    $('#btn-emitir').addEventListener('click', abrirFormularioFactura);

    const facturas = await Api.get('/facturas');
    if (!facturas.length) {
      $('#vista').innerHTML = '<div class="tarjeta"><p class="tabla-vacia">Aún no hay facturas. Emita la primera con el botón superior.</p></div>';
      return;
    }
    $('#vista').innerHTML = `<div class="tarjeta"><div class="tabla-envoltura"><table>
      <thead><tr><th>Documento</th><th>Cliente</th><th>Emisión</th><th>Estado</th><th class="num">Total</th></tr></thead>
      <tbody>${facturas.map((f) => `
        <tr class="clicable" data-factura="${f.id}">
          <td class="mono">${esc(f.numeroCompleto)}</td>
          <td>${esc(f.cliente?.nombre)}<div class="celda-secundaria">${esc(f.cliente?.nit)}</div></td>
          <td class="celda-secundaria">${fecha(f.fechaEmision)}</td>
          <td>${Ui.sello(f.estado)}</td>
          <td class="num">${dinero.format(f.total)}</td>
        </tr>`).join('')}
      </tbody></table></div></div>`;
    conectarFilasFactura();
  },
});

async function abrirFormularioFactura() {
  const [clientes, series] = await Promise.all([Api.get('/clientes'), Api.get('/series')]);
  const seriesFactura = series.filter((s) => s.tipoDocumento === 'FACTURA' && s.activa);
  if (!clientes.length) { Ui.toast('Primero registre un cliente.', 'error'); Router.irA('#/clientes'); return; }
  if (!seriesFactura.length) { Ui.toast('Primero cree una serie de tipo FACTURA.', 'error'); Router.irA('#/series'); return; }

  Ui.modal(`
    <h3>Emitir factura</h3>
    <p class="modal-sub">El IVA (13%) y el correlativo se calculan automáticamente.</p>
    <form id="form-factura">
      <div class="fila-doble">
        <label>Cliente
          <select name="clienteId" required>${clientes.map((c) => `<option value="${c.id}">${esc(c.nombre)} · ${esc(c.nit)}</option>`).join('')}</select>
        </label>
        <label>Serie
          <select name="serieId" required>${seriesFactura.map((s) => `<option value="${s.id}">${esc(s.prefijo)} (próx. ${String(s.correlativoActual + 1).padStart(6, '0')})</option>`).join('')}</select>
        </label>
      </div>
      <label>Días de crédito
        <input type="number" name="diasCredito" min="0" step="1" value="0">
      </label>
      <div class="lineas-editor" id="lineas-editor">
        <div class="linea-fila linea-cabecera"><span>Descripción</span><span>Cant.</span><span>Precio s/IVA</span><span style="text-align:right">Subtotal</span><span></span></div>
      </div>
      <button type="button" class="btn btn-secundario" id="btn-agregar-linea">+ Agregar línea</button>
      <div class="totales-vivo">
        <span>Subtotal: <span id="tot-sub">$0.00</span></span>
        <span>IVA 13%: <span id="tot-iva">$0.00</span></span>
        <span class="total-final">Total: <span id="tot-total">$0.00</span></span>
      </div>
      <div class="modal-pie">
        <button type="button" class="btn btn-secundario" id="btn-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primario">Emitir factura</button>
      </div>
    </form>`, (raiz) => {
    const editor = $('#lineas-editor', raiz);

    function agregarLinea() {
      const fila = document.createElement('div');
      fila.className = 'linea-fila';
      fila.innerHTML = `
        <input type="text" data-campo="descripcion" required placeholder="Producto o servicio">
        <input type="number" data-campo="cantidad" required min="0.01" step="0.01" value="1">
        <input type="number" data-campo="precioUnitario" required min="0.01" step="0.01" placeholder="0.00">
        <span class="linea-subtotal">$0.00</span>
        <button type="button" class="btn-quitar-linea" aria-label="Quitar línea">×</button>`;
      fila.querySelector('.btn-quitar-linea').addEventListener('click', () => {
        if (editor.querySelectorAll('.linea-fila:not(.linea-cabecera)').length > 1) { fila.remove(); recalcular(); }
      });
      fila.addEventListener('input', recalcular);
      editor.appendChild(fila);
    }

    function leerLineas() {
      return $$('.linea-fila:not(.linea-cabecera)', editor).map((fila) => ({
        fila,
        descripcion: fila.querySelector('[data-campo="descripcion"]').value.trim(),
        cantidad: parseFloat(fila.querySelector('[data-campo="cantidad"]').value) || 0,
        precioUnitario: parseFloat(fila.querySelector('[data-campo="precioUnitario"]').value) || 0,
      }));
    }

    function recalcular() {
      let sub = 0;
      for (const l of leerLineas()) {
        const s = round2(l.cantidad * l.precioUnitario);
        l.fila.querySelector('.linea-subtotal').textContent = dinero.format(s);
        sub = round2(sub + s);
      }
      const iva = round2(sub * IVA_RATE);
      $('#tot-sub', raiz).textContent = dinero.format(sub);
      $('#tot-iva', raiz).textContent = dinero.format(iva);
      $('#tot-total', raiz).textContent = dinero.format(round2(sub + iva));
    }

    $('#btn-agregar-linea', raiz).addEventListener('click', agregarLinea);
    $('#btn-cancelar', raiz).addEventListener('click', Ui.cerrarModal);
    agregarLinea();

    $('#form-factura', raiz).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const cuerpo = {
        clienteId: Number(fd.get('clienteId')),
        serieId: Number(fd.get('serieId')),
        diasCredito: Number(fd.get('diasCredito')) || 0,
        lineas: leerLineas().map(({ descripcion, cantidad, precioUnitario }) => ({ descripcion, cantidad, precioUnitario })),
      };
      const boton = e.target.querySelector('button[type="submit"]');
      await Ui.conCarga(boton, async () => {
        try {
          const f = await Api.post('/facturas', cuerpo);
          Ui.cerrarModal();
          Ui.toast(`Factura ${f.numeroCompleto} emitida por ${dinero.format(f.total)}`);
          Router.resolver();
        } catch (err) { Ui.toast(err.message, 'error'); }
      })();
    });
  });
}

async function abrirDetalleFactura(id) {
  const [f, saldo] = await Promise.all([Api.get(`/facturas/${id}`), Api.get(`/facturas/${id}/saldo`)]);
  const anulable = f.estado !== 'ANULADA' && (f.pagos || []).length === 0;
  const cobrable = f.estado !== 'ANULADA' && saldo.saldoPendiente > 0;
  const acreditable = f.estado !== 'ANULADA' && saldo.notasCredito < f.total;

  Ui.panel(`
    <div class="doc-cabecera">
      <div>
        <div class="doc-numero">${esc(f.numeroCompleto)}</div>
        <div class="doc-meta">Emitida el ${fecha(f.fechaEmision)} · Vence el ${fecha(f.fechaVencimiento)}</div>
      </div>
      ${Ui.sello(f.estado, true)}
    </div>

    <div class="doc-seccion">
      <h4>Receptor</h4>
      <div><strong>${esc(f.cliente?.nombre)}</strong></div>
      <div class="celda-secundaria">NIT ${esc(f.cliente?.nit)} · NRC ${esc(f.cliente?.nrc)} · ${esc(f.cliente?.giro)}</div>
    </div>

    <div class="doc-seccion">
      <h4>Detalle</h4>
      <table class="doc-tabla"><tbody>
        ${(f.lineas || []).map((l) => `<tr>
          <td>${esc(l.descripcion)}<div class="celda-secundaria">${l.cantidad} × ${dinero.format(l.precioUnitario)}</div></td>
          <td class="num mono">${dinero.format(l.total)}</td>
        </tr>`).join('')}
      </tbody></table>
      <div class="doc-totales">
        <span>Subtotal ${dinero.format(f.subtotal)}</span>
        <span>IVA 13% ${dinero.format(f.iva)}</span>
        <span><strong>Total ${dinero.format(f.total)}</strong></span>
        <span>Pagado ${dinero.format(saldo.pagado)} · Notas de crédito ${dinero.format(saldo.notasCredito)}</span>
        <span class="saldo ${saldo.saldoPendiente > 0 ? 'saldo-positivo' : 'saldo-cero'}">Saldo ${dinero.format(saldo.saldoPendiente)}</span>
      </div>
    </div>

    ${(f.pagos || []).length ? `<div class="doc-seccion"><h4>Pagos</h4><table class="doc-tabla"><tbody>
      ${f.pagos.map((p) => `<tr><td>${esc(p.metodo)}${p.referencia ? ` · ${esc(p.referencia)}` : ''}<div class="celda-secundaria">${fechaHora(p.fecha)}</div></td><td class="num mono">${dinero.format(p.monto)}</td></tr>`).join('')}
    </tbody></table></div>` : ''}

    ${(f.notasCredito || []).length ? `<div class="doc-seccion"><h4>Notas de crédito vinculadas</h4><table class="doc-tabla"><tbody>
      ${f.notasCredito.map((n) => `<tr><td><span class="mono">${esc(n.numeroCompleto)}</span><div class="celda-secundaria">${esc(n.razon)}</div></td><td class="num mono">−${dinero.format(n.monto)}</td></tr>`).join('')}
    </tbody></table></div>` : ''}

    ${f.estado === 'ANULADA' ? `<div class="doc-seccion"><h4>Razón de anulación</h4><p>${esc(f.razonAnulacion)}</p></div>` : ''}

    <div class="doc-acciones">
      ${cobrable ? '<button class="btn btn-primario" id="btn-pago">Registrar pago</button>' : ''}
      ${acreditable ? '<button class="btn btn-secundario" id="btn-nc">Nota de crédito</button>' : ''}
      ${anulable && Store.esAdmin() ? '<button class="btn btn-peligro" id="btn-anular">Anular</button>' : ''}
    </div>`, (raiz) => {
    $('#btn-pago', raiz)?.addEventListener('click', () => abrirFormularioPago(f, saldo));
    $('#btn-nc', raiz)?.addEventListener('click', () => abrirFormularioNota(f, saldo));
    $('#btn-anular', raiz)?.addEventListener('click', () => abrirFormularioAnulacion(f));
  });
}

function abrirFormularioPago(f, saldo) {
  Ui.modal(`
    <h3>Registrar pago</h3>
    <p class="modal-sub">Factura ${esc(f.numeroCompleto)} · Saldo pendiente ${dinero.format(saldo.saldoPendiente)}</p>
    <form id="form-pago">
      <div class="fila-doble">
        <label>Monto
          <input type="number" name="monto" required min="0.01" max="${saldo.saldoPendiente}" step="0.01" value="${saldo.saldoPendiente}">
        </label>
        <label>Método
          <select name="metodo">
            <option>TRANSFERENCIA</option><option>EFECTIVO</option><option>TARJETA</option><option>CHEQUE</option>
          </select>
        </label>
      </div>
      <label>Referencia (opcional)
        <input type="text" name="referencia" placeholder="N.º de comprobante">
      </label>
      <div class="modal-pie">
        <button type="button" class="btn btn-secundario" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-primario">Registrar pago</button>
      </div>
    </form>`, (raiz) => {
    raiz.querySelector('[data-cerrar]').addEventListener('click', Ui.cerrarModal);
    $('#form-pago', raiz).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const cuerpo = { monto: Number(fd.get('monto')), metodo: fd.get('metodo') };
      const referencia = fd.get('referencia');
      if (referencia) cuerpo.referencia = referencia;
      try {
        const res = await Api.post(`/facturas/${f.id}/pagos`, cuerpo);
        Ui.cerrarModal(); Ui.cerrarPanel();
        Ui.toast(`Pago registrado. Estado: ${res.estado.replace('_', ' ')} · Saldo ${dinero.format(res.saldoPendiente)}`);
        Router.resolver();
      } catch (err) { Ui.toast(err.message, 'error'); }
    });
  });
}

async function abrirFormularioNota(f, saldo) {
  const series = (await Api.get('/series')).filter((s) => s.tipoDocumento === 'NOTA_CREDITO' && s.activa);
  if (!series.length) { Ui.toast('Primero cree una serie de tipo NOTA_CREDITO.', 'error'); return; }
  const disponible = round2(f.total - saldo.notasCredito);
  Ui.modal(`
    <h3>Emitir nota de crédito</h3>
    <p class="modal-sub">Vinculada a ${esc(f.numeroCompleto)} · Máximo acreditable ${dinero.format(disponible)}</p>
    <form id="form-nc">
      <div class="fila-doble">
        <label>Serie
          <select name="serieId">${series.map((s) => `<option value="${s.id}">${esc(s.prefijo)}</option>`).join('')}</select>
        </label>
        <label>Monto
          <input type="number" name="monto" required min="0.01" max="${disponible}" step="0.01">
        </label>
      </div>
      <label>Razón
        <input type="text" name="razon" required minlength="5" placeholder="Ej. Devolución de mercadería dañada">
      </label>
      <div class="modal-pie">
        <button type="button" class="btn btn-secundario" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-primario">Emitir nota</button>
      </div>
    </form>`, (raiz) => {
    raiz.querySelector('[data-cerrar]').addEventListener('click', Ui.cerrarModal);
    $('#form-nc', raiz).addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const nc = await Api.post('/notas-credito', {
          facturaId: f.id,
          serieId: Number(fd.get('serieId')),
          monto: Number(fd.get('monto')),
          razon: fd.get('razon'),
        });
        Ui.cerrarModal(); Ui.cerrarPanel();
        Ui.toast(`Nota de crédito ${nc.numeroCompleto} emitida por ${dinero.format(nc.monto)}`);
        Router.resolver();
      } catch (err) { Ui.toast(err.message, 'error'); }
    });
  });
}

function abrirFormularioAnulacion(f) {
  Ui.modal(`
    <h3>Anular factura</h3>
    <p class="modal-sub">${esc(f.numeroCompleto)} quedará anulada de forma permanente y se registrará en bitácora.</p>
    <form id="form-anular">
      <label>Razón de anulación
        <textarea name="razon" required minlength="5" rows="3" placeholder="Describa el motivo (mínimo 5 caracteres)"></textarea>
      </label>
      <div class="modal-pie">
        <button type="button" class="btn btn-secundario" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-peligro">Anular factura</button>
      </div>
    </form>`, (raiz) => {
    raiz.querySelector('[data-cerrar]').addEventListener('click', Ui.cerrarModal);
    $('#form-anular', raiz).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await Api.post(`/facturas/${f.id}/anular`, { razon: new FormData(e.target).get('razon') });
        Ui.cerrarModal(); Ui.cerrarPanel();
        Ui.toast(`Factura ${f.numeroCompleto} anulada`);
        Router.resolver();
      } catch (err) { Ui.toast(err.message, 'error'); }
    });
  });
}

/* ---------- Notas de crédito ---------- */
Router.registrar('notas', {
  titulo: 'Notas de crédito',
  async render() {
    const notas = await Api.get('/notas-credito');
    if (!notas.length) {
      $('#vista').innerHTML = '<div class="tarjeta"><p class="tabla-vacia">No hay notas de crédito. Se emiten desde el detalle de una factura.</p></div>';
      return;
    }
    $('#vista').innerHTML = `<div class="tarjeta"><div class="tabla-envoltura"><table>
      <thead><tr><th>Documento</th><th>Factura original</th><th>Razón</th><th>Fecha</th><th class="num">Monto</th></tr></thead>
      <tbody>${notas.map((n) => `
        <tr class="clicable" data-factura="${n.factura?.id}">
          <td class="mono">${esc(n.numeroCompleto)}</td>
          <td class="mono">${esc(n.factura?.numeroCompleto)}</td>
          <td>${esc(n.razon)}</td>
          <td class="celda-secundaria">${fecha(n.fechaEmision)}</td>
          <td class="num">−${dinero.format(n.monto)}</td>
        </tr>`).join('')}
      </tbody></table></div></div>`;
    conectarFilasFactura();
  },
});

/* ---------- Clientes ---------- */
Router.registrar('clientes', {
  titulo: 'Clientes',
  async render() {
    $('#acciones-vista').innerHTML = '<button class="btn btn-primario" id="btn-nuevo-cliente">Nuevo cliente</button>';
    $('#btn-nuevo-cliente').addEventListener('click', () => abrirFormularioCliente());

    const clientes = await Api.get('/clientes');
    if (!clientes.length) {
      $('#vista').innerHTML = '<div class="tarjeta"><p class="tabla-vacia">Sin clientes registrados. Cree el primero para poder facturar.</p></div>';
      return;
    }
    $('#vista').innerHTML = `<div class="tarjeta"><div class="tabla-envoltura"><table>
      <thead><tr><th>Cliente</th><th>NIT</th><th>NRC</th><th>Giro</th><th></th></tr></thead>
      <tbody>${clientes.map((c) => `
        <tr>
          <td><strong>${esc(c.nombre)}</strong>${c.direccion ? `<div class="celda-secundaria">${esc(c.direccion)}</div>` : ''}</td>
          <td class="mono">${esc(c.nit)}</td>
          <td class="mono">${esc(c.nrc)}</td>
          <td>${esc(c.giro)}</td>
          <td class="num">
            <button class="btn btn-secundario" data-editar="${c.id}">Editar</button>
            ${Store.esAdmin() ? `<button class="btn btn-peligro" data-borrar="${c.id}">Desactivar</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody></table></div></div>`;

    $$('[data-editar]').forEach((b) => b.addEventListener('click', () => {
      abrirFormularioCliente(clientes.find((c) => c.id === Number(b.dataset.editar)));
    }));
    $$('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      const c = clientes.find((x) => x.id === Number(b.dataset.borrar));
      Ui.modal(`
        <h3>Desactivar cliente</h3>
        <p class="modal-sub">${esc(c.nombre)} dejará de estar disponible para facturación. Sus facturas históricas se conservan.</p>
        <div class="modal-pie">
          <button class="btn btn-secundario" data-cerrar>Cancelar</button>
          <button class="btn btn-peligro" data-confirmar>Desactivar</button>
        </div>`, (raiz) => {
        raiz.querySelector('[data-cerrar]').addEventListener('click', Ui.cerrarModal);
        raiz.querySelector('[data-confirmar]').addEventListener('click', async () => {
          try {
            await Api.del(`/clientes/${c.id}`);
            Ui.cerrarModal(); Ui.toast('Cliente desactivado'); Router.resolver();
          } catch (err) { Ui.toast(err.message, 'error'); }
        });
      });
    }));
  },
});

function abrirFormularioCliente(cliente) {
  const editando = Boolean(cliente);
  Ui.modal(`
    <h3>${editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
    <p class="modal-sub">Datos fiscales del receptor del documento tributario.</p>
    <form id="form-cliente">
      <label>Nombre o razón social
        <input type="text" name="nombre" required value="${esc(cliente?.nombre || '')}">
      </label>
      <div class="fila-doble">
        <label>NIT
          <input type="text" name="nit" required pattern="\\d{4}-\\d{6}-\\d{3}-\\d" placeholder="0614-123456-101-2" value="${esc(cliente?.nit || '')}">
        </label>
        <label>NRC
          <input type="text" name="nrc" required placeholder="123456-7" value="${esc(cliente?.nrc || '')}">
        </label>
      </div>
      <label>Giro
        <input type="text" name="giro" required placeholder="Actividad económica" value="${esc(cliente?.giro || '')}">
      </label>
      <label>Dirección (opcional)
        <input type="text" name="direccion" value="${esc(cliente?.direccion || '')}">
      </label>
      <label>Correo (opcional)
        <input type="email" name="correo" value="${esc(cliente?.correo || '')}">
      </label>
      <div class="modal-pie">
        <button type="button" class="btn btn-secundario" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-primario">${editando ? 'Guardar cambios' : 'Crear cliente'}</button>
      </div>
    </form>`, (raiz) => {
    raiz.querySelector('[data-cerrar]').addEventListener('click', Ui.cerrarModal);
    $('#form-cliente', raiz).addEventListener('submit', async (e) => {
      e.preventDefault();
      const datos = Object.fromEntries(new FormData(e.target));
      if (!datos.direccion) delete datos.direccion;
      if (!datos.correo) delete datos.correo;
      try {
        if (editando) await Api.patch(`/clientes/${cliente.id}`, datos);
        else await Api.post('/clientes', datos);
        Ui.cerrarModal();
        Ui.toast(editando ? 'Cliente actualizado' : 'Cliente creado');
        Router.resolver();
      } catch (err) { Ui.toast(err.message, 'error'); }
    });
  });
}

/* ---------- Series ---------- */
Router.registrar('series', {
  titulo: 'Series y correlativos',
  async render() {
    if (Store.esAdmin()) {
      $('#acciones-vista').innerHTML = '<button class="btn btn-primario" id="btn-nueva-serie">Nueva serie</button>';
      $('#btn-nueva-serie').addEventListener('click', abrirFormularioSerie);
    }
    const series = await Api.get('/series');
    if (!series.length) {
      $('#vista').innerHTML = `<div class="tarjeta"><p class="tabla-vacia">Sin series configuradas.${Store.esAdmin() ? ' Cree una serie FACTURA y una NOTA_CREDITO para comenzar a emitir.' : ' Solicite a un administrador que las configure.'}</p></div>`;
      return;
    }
    $('#vista').innerHTML = `<div class="tarjeta"><div class="tabla-envoltura"><table>
      <thead><tr><th>Tipo de documento</th><th>Prefijo</th><th class="num">Correlativo actual</th><th class="num">Próximo número</th></tr></thead>
      <tbody>${series.map((s) => `
        <tr>
          <td>${esc(s.tipoDocumento.replace('_', ' '))}</td>
          <td class="mono">${esc(s.prefijo)}</td>
          <td class="num">${s.correlativoActual}</td>
          <td class="num mono">${esc(s.prefijo)}-${String(s.correlativoActual + 1).padStart(6, '0')}</td>
        </tr>`).join('')}
      </tbody></table></div></div>`;
  },
});

function abrirFormularioSerie() {
  Ui.modal(`
    <h3>Nueva serie</h3>
    <p class="modal-sub">La combinación de tipo y prefijo es única; el correlativo inicia en 000001.</p>
    <form id="form-serie">
      <div class="fila-doble">
        <label>Tipo de documento
          <select name="tipoDocumento"><option>FACTURA</option><option>NOTA_CREDITO</option><option>NOTA_DEBITO</option></select>
        </label>
        <label>Prefijo
          <input type="text" name="prefijo" required placeholder="FAC-2026">
        </label>
      </div>
      <div class="modal-pie">
        <button type="button" class="btn btn-secundario" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-primario">Crear serie</button>
      </div>
    </form>`, (raiz) => {
    raiz.querySelector('[data-cerrar]').addEventListener('click', Ui.cerrarModal);
    $('#form-serie', raiz).addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await Api.post('/series', Object.fromEntries(new FormData(e.target)));
        Ui.cerrarModal(); Ui.toast('Serie creada'); Router.resolver();
      } catch (err) { Ui.toast(err.message, 'error'); }
    });
  });
}

/* ---------- Reportes ---------- */
Router.registrar('reportes', {
  titulo: 'Reporte de ventas',
  async render() {
    let periodo = 'dia';
    async function pintar() {
      const r = await Api.get(`/reportes/ventas?periodo=${periodo}`);
      const maximo = Math.max(...r.porCliente.map((c) => c.total), 1);
      $('#zona-reporte').innerHTML = `
        <div class="kpis">
          <div class="tarjeta kpi kpi-acento">
            <div class="kpi-etiqueta">Ventas del período</div>
            <div class="kpi-valor">${dinero.format(r.granTotal)}</div>
            <div class="kpi-detalle">${fecha(r.desde)} — ${fecha(r.hasta)}</div>
          </div>
          <div class="tarjeta kpi">
            <div class="kpi-etiqueta">Facturas emitidas</div>
            <div class="kpi-valor">${r.totalFacturas}</div>
            <div class="kpi-detalle">Excluye anuladas</div>
          </div>
          <div class="tarjeta kpi">
            <div class="kpi-etiqueta">Clientes facturados</div>
            <div class="kpi-valor">${r.porCliente.length}</div>
            <div class="kpi-detalle">Con al menos un documento</div>
          </div>
        </div>
        <div class="tarjeta grafica-envoltura">
          <div class="grafica-titulo">Total facturado por cliente</div>
          ${r.porCliente.length ? r.porCliente.map((c) => `
            <div class="barra-fila">
              <span class="barra-nombre" title="${esc(c.cliente)}">${esc(c.cliente)}</span>
              <div class="barra-pista"><div class="barra-valor" style="width:${Math.max((c.total / maximo) * 100, 2)}%"></div></div>
              <span class="barra-monto">${dinero.format(c.total)} <span class="celda-secundaria">(${c.cantidadFacturas})</span></span>
            </div>`).join('') : '<p class="tabla-vacia">Sin ventas registradas en este período.</p>'}
        </div>`;
    }
    $('#vista').innerHTML = `
      <div class="filtros">
        <div class="segmentos" id="seg-periodo">
          <button data-p="dia" class="activo">Hoy</button>
          <button data-p="semana">Últimos 7 días</button>
          <button data-p="mes">Este mes</button>
        </div>
      </div>
      <div id="zona-reporte" class="pila"></div>`;
    $$('#seg-periodo button').forEach((b) => b.addEventListener('click', () => {
      periodo = b.dataset.p;
      $$('#seg-periodo button').forEach((x) => x.classList.toggle('activo', x === b));
      pintar();
    }));
    await pintar();
  },
});

/* ---------- Bitácora ---------- */
Router.registrar('bitacora', {
  titulo: 'Bitácora de auditoría',
  soloAdmin: true,
  async render() {
    let entidad = '';
    async function pintar() {
      const registros = await Api.get(`/bitacora${entidad ? `?entidad=${entidad}` : ''}`);
      $('#zona-bitacora').innerHTML = registros.length ? `<div class="tarjeta"><div class="tabla-envoltura"><table>
        <thead><tr><th>Fecha</th><th>Entidad</th><th>Acción</th><th>Transición</th><th>Detalle</th><th>Usuario</th></tr></thead>
        <tbody>${registros.map((b) => `
          <tr>
            <td class="celda-secundaria">${fechaHora(b.fecha)}</td>
            <td class="mono">${esc(b.entidad)} #${b.entidadId}</td>
            <td>${esc(b.accion)}</td>
            <td>${b.estadoAnterior ? `${Ui.sello(b.estadoAnterior)} → ` : ''}${b.estadoNuevo ? Ui.sello(b.estadoNuevo) : '—'}</td>
            <td class="celda-secundaria">${esc(b.detalle || '')}</td>
            <td class="celda-secundaria">${esc(b.usuario || '—')}</td>
          </tr>`).join('')}
        </tbody></table></div></div>` : '<div class="tarjeta"><p class="tabla-vacia">Sin registros de auditoría para el filtro seleccionado.</p></div>';
    }
    $('#vista').innerHTML = `
      <div class="filtros">
        <label>Filtrar por entidad
          <select id="filtro-entidad">
            <option value="">Todas</option>
            <option value="FACTURA">FACTURA</option>
            <option value="PAGO">PAGO</option>
            <option value="NOTA_CREDITO">NOTA_CREDITO</option>
          </select>
        </label>
      </div>
      <div id="zona-bitacora"></div>`;
    $('#filtro-entidad').addEventListener('change', (e) => { entidad = e.target.value; pintar(); });
    await pintar();
  },
});

/* ---------- Arranque ---------- */
Router.resolver();

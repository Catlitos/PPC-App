// ─────────────────────────────────────────────
// js/render.js
// Todas las funciones que generan HTML.
// REGLA: Solo lee estado, nunca lo muta.
// Nunca llama a Store.save(). Solo pinta.
// ─────────────────────────────────────────────

import { HORARIOS, DIAS, MAX_POR_SLOT } from './constants.js';
import { getDB, getSession, getWeekOffset, getFilter, getPuntoFilter, isLoggedIn } from './state.js';
import { escHtml, isoToday, switchTab } from './ui.js';

// ── Orquestador ──────────────────────────────

/** Re-renderiza todos los paneles de la app. */
export function renderAll() {
  renderStats();
  renderBoard();
  renderHermanos();
  renderReservaForm();
  if (isLoggedIn()) renderAdmin();
}

// ── Stats ─────────────────────────────────────

export function renderStats() {
  const db     = getDB();
  const semana = getWeekDates(getWeekOffset());
  const turnosSemana = db.turnos.filter(t => semana.some(d => d.iso === t.fecha));

  let libres = 0, parciales = 0, completos = 0;
  db.puntos.forEach(p => {
    HORARIOS.forEach(h => {
      semana.forEach(d => {
        const n = turnosSemana.filter(t => t.punto === p && t.hora === h && t.fecha === d.iso).length;
        if (n === 0)              libres++;
        else if (n < MAX_POR_SLOT) parciales++;
        else                       completos++;
      });
    });
  });

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card teal"><div class="stat-num">${db.hermanos.length}</div><div class="stat-label">Participantes</div></div>
    <div class="stat-card ink"> <div class="stat-num">${db.puntos.length}</div>   <div class="stat-label">Puntos</div></div>
    <div class="stat-card amber"><div class="stat-num">${parciales}</div>         <div class="stat-label">Turnos Parciales</div></div>
    <div class="stat-card rose"><div class="stat-num">${completos}</div>          <div class="stat-label">Turnos Completos</div></div>
  `;
}

// ── Board ─────────────────────────────────────

/**
 * Calcula las 7 fechas de la semana según el offset.
 * @param {number} offset semanas desde la actual (0 = esta semana)
 * @returns {Array<{iso: string, label: string, shortDate: string}>}
 */
export function getWeekDates(offset = 0) {
  const now    = new Date();
  const day    = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      iso:       d.toISOString().split('T')[0],
      label:     DIAS[i],
      shortDate: `${d.getDate()}/${d.getMonth() + 1}`,
    };
  });
}

export function renderBoard() {
  const db            = getDB();
  const activeFilter  = getFilter();
  const puntoFilter   = getPuntoFilter();
  const semana        = getWeekDates(getWeekOffset());
  const d0 = semana[0], d6 = semana[6];

  document.getElementById('weekLabel').textContent = `${d0.shortDate} — ${d6.shortDate}`;

  // Chips de filtro por punto
  const pf = document.getElementById('puntoFilter');
  pf.innerHTML =
    `<button class="punto-chip ${puntoFilter === 'all' ? 'active' : ''}"
       onclick="App.setPuntoFilter(this, 'all')">Todos los puntos</button>` +
    db.puntos.map(p =>
      `<button class="punto-chip ${puntoFilter === p ? 'active' : ''}"
         onclick="App.setPuntoFilter(this, '${escHtml(p)}')">${escHtml(p)}</button>`
    ).join('');

  const puntos = puntoFilter === 'all' ? db.puntos : db.puntos.filter(p => p === puntoFilter);

  // Encabezado de la tabla
  document.getElementById('boardHead').innerHTML = `<tr>
    <th class="col-punto" style="min-width:110px">Punto / Horario</th>
    ${semana.map(d =>
      `<th class="day-th">${d.label}<br><span style="font-size:0.7rem;opacity:.6">${d.shortDate}</span></th>`
    ).join('')}
  </tr>`;

  // Filas de la tabla
  let html = '';
  puntos.forEach(punto => {
    HORARIOS.forEach((hora, hi) => {
      html += '<tr>';
      html += `<td class="punto-cell">
        ${hi === 0 ? `<b>${escHtml(punto)}</b><br>` : ''}
        <span class="hora-label">${hora}</span>
      </td>`;

      semana.forEach(dia => {
        const asignados = db.turnos.filter(
          t => t.punto === punto && t.hora === hora && t.fecha === dia.iso
        );
        const count = asignados.length;
        const cls   = count === 0 ? 'libre' : count < MAX_POR_SLOT ? 'parcial' : 'completo';
        const badge = count === 0 ? 'Disponible' : count < MAX_POR_SLOT ? `${count}/3 Parcial` : '3/3 Completo';

        // Si hay filtro activo y no coincide, mostrar neutral
        if (activeFilter !== 'all' && activeFilter !== cls) {
          html += `<td class="slot slot-neutral"><div class="slot-inner" style="opacity:.2">—</div></td>`;
          return;
        }

        const names = asignados.map(t => t.hermanoNombre).join('<br>');
        html += `<td class="slot slot-${cls}"
          onclick="App.openSlotModal('${escHtml(punto)}','${dia.iso}','${hora}')">
          <div class="slot-inner">
            <span class="slot-badge">${badge}</span>
            ${names ? `<span class="slot-hermanos">${names}</span>` : ''}
          </div>
        </td>`;
      });

      html += '</tr>';
    });
    // Separador visual entre puntos
    html += `<tr style="height:6px;background:var(--warm)"><td colspan="8"></td></tr>`;
  });

  document.getElementById('boardBody').innerHTML = html;
}

// ── Hermanos ──────────────────────────────────

export function renderHermanos() {
  const db      = getDB();
  const session = getSession();
  const wrap    = document.getElementById('hermanosTableWrap');
  const hoy     = isoToday();

  if (!db.hermanos.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="icon">👥</div>
        <p>No hay participantes registrados.</p>
        <p style="font-size:0.85rem;margin-top:8px">Haz clic en "+ Agregar" para comenzar.</p>
      </div>`;
    return;
  }

  const rows = db.hermanos.map(h => {
    const count = db.turnos.filter(t => t.hermanoId === h.id && t.fecha >= hoy).length;
    return `<tr>
      <td><strong>${escHtml(h.nombre)}</strong></td>
      <td>${escHtml(h.tel)}</td>
      <td><span class="badge badge-teal">${count} turno${count !== 1 ? 's' : ''} activos</span></td>
      <td>
        ${session ? `<button class="btn btn-sm btn-danger" onclick="App.deleteHermano(${h.id})">Eliminar</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="ptable">
      <thead><tr><th>Nombre</th><th>Teléfono</th><th>Turnos Activos</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Reserva form ──────────────────────────────

export function renderReservaForm() {
  const db     = getDB();
  const semana = getWeekDates(getWeekOffset());

  // Selector de hermanos
  const selH = document.getElementById('resNombre');
  const curH = selH.value;
  selH.innerHTML = '<option value="">— Selecciona tu nombre —</option>' +
    db.hermanos.map(h => `<option value="${h.id}">${escHtml(h.nombre)}</option>`).join('');
  if (curH) selH.value = curH;

  // Selector de puntos
  const selP = document.getElementById('resPunto');
  selP.innerHTML = '<option value="">— Selecciona un punto —</option>' +
    db.puntos.map(p => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');

  // Selector de días
  document.getElementById('resDia').innerHTML =
    semana.map(d => `<option value="${d.iso}">${d.label} ${d.shortDate}</option>`).join('');

  // Conectar cambios al info en vivo
  ['resNombre', 'resPunto', 'resDia', 'resHora'].forEach(id => {
    document.getElementById(id).onchange = updateResSlotInfo;
  });
  updateResSlotInfo();
}

/** Actualiza el cuadro de info del slot seleccionado en el form de reserva. */
export function updateResSlotInfo() {
  const db    = getDB();
  const punto = document.getElementById('resPunto').value;
  const dia   = document.getElementById('resDia').value;
  const hora  = document.getElementById('resHora').value;
  const box   = document.getElementById('resSlotInfo');

  if (!punto || !dia || !hora) { box.innerHTML = ''; return; }

  const asignados = db.turnos.filter(t => t.punto === punto && t.fecha === dia && t.hora === hora);
  const count = asignados.length;

  if (count >= MAX_POR_SLOT) {
    box.innerHTML = `<div class="alert alert-error">❌ Este turno ya está completo (3/3 hermanos).</div>`;
  } else {
    const names  = asignados.map(t => t.hermanoNombre).join(', ');
    const status = count === 0 ? 'Necesita al menos 2.' : count === 1 ? 'Falta 1 más para el mínimo.' : 'Turno puede completarse.';
    box.innerHTML = `<div class="alert alert-info">
      👥 ${count}/3 hermanos asignados${names ? `: ${names}` : ''}. ${status}
    </div>`;
  }
}

// ── Admin ─────────────────────────────────────

export function renderAdmin() {
  const db      = getDB();
  const session = getSession();
  const hoy     = isoToday();

  // Lista de encargados
  document.getElementById('adminUsuariosList').innerHTML = db.usuarios.map(u => {
    const esMio = u.user === session?.user;
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--warm);border-radius:10px;margin-bottom:8px">
      <div>
        <strong>${escHtml(u.nombre)}</strong>
        <span style="margin-left:8px;font-size:0.78rem;color:var(--ink-soft)">@${escHtml(u.user)}</span>
        ${esMio ? `<span class="badge badge-teal" style="margin-left:8px">Tú</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="badge badge-gold">Encargado</span>
        ${!esMio && db.usuarios.length > 1
          ? `<button class="btn btn-sm btn-danger" onclick="App.deleteUsuario(${u.id})">Eliminar</button>`
          : ''}
      </div>
    </div>`;
  }).join('');

  // Lista de puntos
  document.getElementById('adminPuntosList').innerHTML = db.puntos.map((p, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--warm);border-radius:8px;margin-bottom:6px">
      <span>📍 ${escHtml(p)}</span>
      <button class="btn btn-sm btn-danger" onclick="App.deletePunto(${i})">Eliminar</button>
    </div>`).join('');

  // Turnos próximos
  const upcoming = db.turnos
    .filter(t => t.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const tl = document.getElementById('adminTurnosList');
  tl.innerHTML = upcoming.length
    ? upcoming.map(t => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border)">
        <div>
          <strong>${escHtml(t.hermanoNombre)}</strong>
          <span style="margin:0 6px;color:var(--ink-soft)">→</span>
          ${escHtml(t.punto)}
          <small style="display:block;color:var(--ink-soft)">${t.fecha} · ${t.hora}</small>
        </div>
        <button class="btn btn-sm btn-danger" onclick="App.adminDeleteTurno(${t.id})">Eliminar</button>
      </div>`).join('')
    : `<p class="empty-state" style="padding:20px">No hay turnos próximos.</p>`;

  // Auditoría
  document.getElementById('adminAuditoria').innerHTML =
    (db.auditoria || []).slice(0, 20).map(a => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:0.82rem">
      <strong>${a.accion}</strong>
      <span style="color:var(--ink-soft);margin-left:8px">${new Date(a.timestamp).toLocaleString('es-AR')}</span>
      <br><small style="color:var(--ink-soft)">${JSON.stringify(a.datos).slice(0, 80)}</small>
    </div>`).join('')
    || '<p style="color:var(--ink-soft);font-size:0.85rem">Sin registros.</p>';
}

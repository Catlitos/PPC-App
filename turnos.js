// ─────────────────────────────────────────────
// js/turnos.js
// Gestión de turnos: reservar, cancelar,
// modal de detalle del slot.
// ─────────────────────────────────────────────

import { MAX_POR_SLOT, DIAS }             from './constants.js';
import { Store }                          from './store.js';
import { getDB, getSlotContext, setSlotContext, getWeekOffset } from './state.js';
import { toast, openModal, closeModal, escHtml, switchTab } from './ui.js';
import { renderAll, getWeekDates, updateResSlotInfo } from './render.js';

// ── Modal de slot ─────────────────────────────

/**
 * Abre el modal de detalle de un slot.
 * @param {string} punto
 * @param {string} isoDate  fecha en formato YYYY-MM-DD
 * @param {string} hora
 */
export function openSlotModal(punto, isoDate, hora) {
  setSlotContext({ punto, isoDate, hora });

  const db         = getDB();
  const diaNombre  = DIAS[new Date(isoDate + 'T12:00:00').getDay() - 1] || 'Domingo';
  const asignados  = db.turnos.filter(t => t.punto === punto && t.fecha === isoDate && t.hora === hora);
  const count      = asignados.length;
  const estado     = count === 0 ? 'Disponible' : count < MAX_POR_SLOT ? 'Parcial' : 'Completo';

  document.getElementById('slotModalTitle').textContent = `${punto} — ${diaNombre}`;
  document.getElementById('slotModalSub').textContent   = hora;

  document.getElementById('slotInfoBox').innerHTML = `
    <div class="info-item"><div class="info-label">Estado</div>${estado}</div>
    <div class="info-item"><div class="info-label">Hermanos</div>${count}/3</div>
    <div class="info-item"><div class="info-label">Fecha</div>${isoDate}</div>
    <div class="info-item"><div class="info-label">Mínimo</div>2 hermanos</div>
  `;

  // Lista de hermanos asignados
  const lista = document.getElementById('slotHermanosList');
  lista.innerHTML = count === 0
    ? `<div style="text-align:center;color:var(--ink-soft);padding:16px;font-size:0.9rem">Sin hermanos asignados</div>`
    : asignados.map(t => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;margin-bottom:6px">
        <strong>${escHtml(t.hermanoNombre)}</strong>
        <button class="btn btn-sm btn-danger" onclick="App.cancelarTurnoDesdeSlot(${t.id})">Anular</button>
      </div>`).join('');

  // Alerta si está completo
  document.getElementById('slotModalAlert').innerHTML = count >= MAX_POR_SLOT
    ? `<div class="alert alert-error">Turno completo.</div>`
    : '';

  // Footer con acciones disponibles
  document.getElementById('slotModalFooter').innerHTML = count < MAX_POR_SLOT
    ? `<button class="btn btn-ghost" onclick="App.closeModal('slotModal')">Cerrar</button>
       <button class="btn btn-teal"  onclick="App.closeModal('slotModal');App.openReservaFromSlot()">+ Agregar Hermano</button>`
    : `<button class="btn btn-ghost" onclick="App.closeModal('slotModal')">Cerrar</button>`;

  openModal('slotModal');
}

/**
 * Cancela un turno desde el modal de slot.
 * @param {number} id
 */
export function cancelarTurnoDesdeSlot(id) {
  const db = getDB();
  const t  = db.turnos.find(x => x.id === id);
  if (!t) return;
  if (!confirm(`¿Anular el turno de ${t.hermanoNombre}?`)) return;

  db.turnos = db.turnos.filter(x => x.id !== id);
  Store.audit(db, 'cancelar_turno', { hermano: t.hermanoNombre, punto: t.punto, hora: t.hora, fecha: t.fecha });
  Store.save(db);
  toast(`Turno de ${t.hermanoNombre} anulado`, 'success');
  closeModal('slotModal');
  renderAll();
}

/**
 * Navega al tab de reservar y pre-llena los
 * campos con el contexto del slot seleccionado.
 */
export function openReservaFromSlot() {
  const ctx = getSlotContext();
  switchTab('reservar');
  if (!ctx) return;

  document.getElementById('resPunto').value = ctx.punto;
  document.getElementById('resDia').value   = ctx.isoDate;
  document.getElementById('resHora').value  = ctx.hora;
  updateResSlotInfo();
}

// ── Confirmar reserva ─────────────────────────

/**
 * Valida y crea un nuevo turno.
 * Validaciones:
 *   - Todos los campos requeridos
 *   - Slot no completo
 *   - Hermano no duplicado en el mismo slot
 *   - Sin conflicto de horario (mismo hermano, misma hora)
 */
export function confirmarReserva() {
  const db    = getDB();
  const hId   = parseInt(document.getElementById('resNombre').value);
  const punto = document.getElementById('resPunto').value;
  const dia   = document.getElementById('resDia').value;
  const hora  = document.getElementById('resHora').value;

  if (!hId || !punto || !dia || !hora) return toast('Completá todos los campos', 'error');

  const hermano = db.hermanos.find(h => h.id === hId);
  if (!hermano) return toast('Hermano no encontrado', 'error');

  const asignados = db.turnos.filter(t => t.punto === punto && t.fecha === dia && t.hora === hora);
  if (asignados.length >= MAX_POR_SLOT) return toast('Este turno ya está completo', 'error');

  if (asignados.find(t => t.hermanoId === hId)) {
    return toast(`${hermano.nombre} ya está en este turno`, 'error');
  }

  // Conflicto de horario en otro punto
  const conflicto = db.turnos.find(t => t.hermanoId === hId && t.fecha === dia && t.hora === hora);
  if (conflicto) {
    return toast(`${hermano.nombre} ya tiene turno en ${conflicto.punto} a esa hora`, 'error');
  }

  db.turnos.push({
    id:            Date.now() + Math.floor(Math.random() * 1000),
    punto,
    fecha:         dia,
    hora,
    hermanoId:     hId,
    hermanoNombre: hermano.nombre,
    createdAt:     new Date().toISOString(),
  });

  Store.audit(db, 'reservar_turno', { hermano: hermano.nombre, punto, hora, fecha: dia });
  Store.save(db);
  toast(`✅ Turno reservado para ${hermano.nombre}`, 'success');
  renderAll();
}

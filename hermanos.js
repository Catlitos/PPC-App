// ─────────────────────────────────────────────
// js/hermanos.js
// Gestión de participantes (hermanos):
// agregar, eliminar, validar.
// ─────────────────────────────────────────────

import { Store }            from './store.js';
import { getDB }            from './state.js';
import { toast, openModal, closeModal } from './ui.js';
import { renderAll }        from './render.js';

/**
 * Abre el modal para agregar un hermano,
 * limpiando los campos primero.
 */
export function openAddHermanoModal() {
  document.getElementById('hNombre').value = '';
  document.getElementById('hTel').value    = '';
  openModal('addHermanoModal');
}

/**
 * Valida y guarda un nuevo hermano.
 * Reglas:
 *   - Nombre requerido
 *   - Debe tener nombre Y apellido (al menos un espacio)
 *   - No puede duplicarse
 */
export function saveHermano() {
  const nombre = document.getElementById('hNombre').value.trim();
  const tel    = document.getElementById('hTel').value.trim();

  if (!nombre)              return toast('El nombre es requerido', 'error');
  if (!nombre.includes(' '))return toast('Ingresa nombre y apellido', 'error');

  const db  = getDB();
  const dup = db.hermanos.find(h => h.nombre.toLowerCase() === nombre.toLowerCase());
  if (dup) return toast('Ya existe un participante con ese nombre', 'error');

  db.hermanos.push({
    id:        Date.now(),
    nombre,
    tel,
    createdAt: new Date().toISOString(),
  });

  Store.audit(db, 'agregar_hermano', { nombre });
  Store.save(db);
  closeModal('addHermanoModal');
  toast(`${nombre} agregado`, 'success');
  renderAll();
}

/**
 * Elimina un hermano y todos sus turnos asociados.
 * @param {number} id
 */
export function deleteHermano(id) {
  const db = getDB();
  const h  = db.hermanos.find(x => x.id === id);
  if (!h) return;
  if (!confirm(`¿Eliminar a ${h.nombre}? También se eliminarán sus turnos.`)) return;

  db.hermanos = db.hermanos.filter(x => x.id !== id);
  db.turnos   = db.turnos.filter(t => t.hermanoId !== id);

  Store.audit(db, 'eliminar_hermano', { nombre: h.nombre });
  Store.save(db);
  toast(`${h.nombre} eliminado`, 'success');
  renderAll();
}

// ─────────────────────────────────────────────
// js/ui.js
// Helpers de interfaz puros.
// No mutan el estado de la app.
// No tienen lógica de negocio.
// ─────────────────────────────────────────────

/**
 * Muestra un toast de notificación.
 * @param {string} msg
 * @param {'success'|'error'|''} type
 */
export function toast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

/**
 * Abre un modal por su ID.
 * Registra el handler de Escape (solo una vez).
 * @param {string} id
 */
export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.addEventListener('keydown', _escHandler);
}

/**
 * Cierra un modal por su ID.
 * @param {string} id
 */
export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

/** Handler interno para cerrar con Escape */
function _escHandler(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open')
      .forEach(m => m.classList.remove('open'));
    document.removeEventListener('keydown', _escHandler);
  }
}

/**
 * Escapa caracteres HTML para evitar XSS.
 * Usar siempre al inyectar datos del usuario en innerHTML.
 * @param {string} s
 * @returns {string}
 */
export function escHtml(s) {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/**
 * Retorna la fecha de hoy en formato ISO (YYYY-MM-DD).
 * @returns {string}
 */
export const isoToday = () => new Date().toISOString().split('T')[0];

/**
 * Promesa que resuelve después de `ms` milisegundos.
 * Usada para timing-safe en login.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Cambia el tab activo de la app.
 * @param {string} name  nombre del panel (ej: 'tablero')
 */
export function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(name));
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + name);
  });
}

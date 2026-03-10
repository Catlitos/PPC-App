// ─────────────────────────────────────────────
// js/app.js
// Punto de entrada de la aplicación.
//
// Responsabilidades:
//   1. Inicializar DB y sesión
//   2. Exponer funciones al HTML via window.App
//   3. Registrar event listeners globales
//
// NO tiene lógica de negocio propia.
// ─────────────────────────────────────────────

import { SESSION_TTL }                         from './constants.js';
import { Store, defaultDB }                    from './store.js';
import { setDB, setSession, setFilter, setPuntoFilter, changeWeek } from './state.js';
import { openModal, closeModal, switchTab, toast } from './ui.js';
import { renderAll, renderAdmin }              from './render.js';
import { openLoginModal, doLogin, logout, onSessionRestored } from './auth.js';
import { openAddHermanoModal, saveHermano, deleteHermano } from './hermanos.js';
import { openSlotModal, cancelarTurnoDesdeSlot, openReservaFromSlot, confirmarReserva } from './turnos.js';
import { addPunto, deletePunto, adminDeleteTurno, openAddUsuarioModal, saveUsuario, deleteUsuario, cambiarPassword } from './admin.js';

// ── Inicialización ────────────────────────────

async function init() {
  // 1. Cargar o crear base de datos
  let db = Store.load();
  if (!db) {
    db = await defaultDB();
    Store.save(db);
  }
  setDB(db);

  // 2. Restaurar sesión si sigue vigente
  try {
    const raw = sessionStorage.getItem('predic_session');
    if (raw) {
      const s = JSON.parse(raw);
      if (Date.now() - s.loginTime < SESSION_TTL) {
        setSession(s);
        onSessionRestored();
      } else {
        sessionStorage.removeItem('predic_session');
      }
    }
  } catch { /* sesión corrupta, ignorar */ }

  // 3. Primer render
  renderAll();
}

// ── Event listeners globales ──────────────────

// Cerrar modales al hacer click fuera
document.querySelectorAll('.modal-backdrop').forEach(m => {
  m.addEventListener('click', e => {
    if (e.target === m) m.classList.remove('open');
  });
});

// Login con Enter
document.getElementById('loginPass')
  .addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ── API pública para el HTML ──────────────────
// El HTML usa onclick="App.xxx()" en lugar de
// funciones globales sueltas. Así todo queda
// explícito y rastreable.

window.App = {
  // UI
  openModal,
  closeModal,
  switchTab: (name) => {
    switchTab(name);
    // Efectos secundarios al cambiar de tab
    if (name === 'admin') renderAdmin();
  },
  changeWeek: (delta) => {
    changeWeek(delta);
    renderAll();
  },
  setFilter: (el, f) => {
    setFilter(f);
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderAll();
  },
  setPuntoFilter: (el, p) => {
    setPuntoFilter(p);
    document.querySelectorAll('.punto-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderAll();
  },

  // Auth
  openLoginModal,
  doLogin,
  logout,

  // Hermanos
  openAddHermanoModal,
  saveHermano,
  deleteHermano,

  // Turnos
  openSlotModal,
  cancelarTurnoDesdeSlot,
  openReservaFromSlot,
  confirmarReserva,

  // Admin
  addPunto,
  deletePunto,
  adminDeleteTurno,
  openAddUsuarioModal,
  saveUsuario,
  deleteUsuario,
  cambiarPassword,
};

// ── Arrancar ──────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

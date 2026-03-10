// ─────────────────────────────────────────────
// js/auth.js
// Autenticación: login, logout, sesión.
// ─────────────────────────────────────────────

import { Crypto }                          from './crypto.js';
import { Store }                           from './store.js';
import { getDB, getSession, setSession, clearSession } from './state.js';
import { toast, openModal, closeModal, sleep, switchTab } from './ui.js';
import { renderAll }                       from './render.js';

/**
 * Muestra el modal de login.
 */
export function openLoginModal() {
  openModal('loginModal');
}

/**
 * Procesa el formulario de login.
 * Hace un delay timing-safe si el usuario no existe
 * para no revelar información.
 */
export async function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;

  if (!user || !pass) return toast('Completá usuario y contraseña', 'error');

  const db    = getDB();
  const found = db.usuarios.find(u => u.user === user);

  if (!found) {
    await sleep(400); // timing-safe: no revelar si el usuario existe
    return toast('Credenciales incorrectas', 'error');
  }

  const ok = await Crypto.verify(pass, found.passHash);
  if (!ok) return toast('Credenciales incorrectas', 'error');

  const newSession = {
    user:      found.user,
    nombre:    found.nombre,
    rol:       found.rol,
    loginTime: Date.now(),
    token:     Crypto.token(),
  };

  setSession(newSession);
  sessionStorage.setItem('predic_session', JSON.stringify(newSession));
  Store.audit(db, 'login', { user: found.user });
  Store.save(db);

  document.getElementById('loginPass').value = '';
  closeModal('loginModal');
  onSessionRestored();
  toast(`Bienvenido, ${found.nombre}`, 'success');
  renderAll();
}

/**
 * Cierra la sesión del usuario actual.
 */
export function logout() {
  if (!confirm('¿Cerrar sesión?')) return;

  const db = getDB();
  Store.audit(db, 'logout', { user: getSession()?.user });
  Store.save(db);

  clearSession();
  sessionStorage.removeItem('predic_session');
  _updateNavForLogout();
  switchTab('tablero');
  renderAll();
  toast('Sesión cerrada', 'success');
}

/**
 * Actualiza la UI cuando una sesión es restaurada o
 * cuando el usuario hace login exitoso.
 */
export function onSessionRestored() {
  const session = getSession();
  const navUser = document.getElementById('navUser');
  navUser.style.display = 'block';
  navUser.textContent   = '👤 ' + session.nombre;
  document.getElementById('btnLoginNav').style.display  = 'none';
  document.getElementById('btnLogoutNav').style.display = 'block';
  document.body.classList.add('admin-mode');

  // Mostrar tab de admin
  const adminTab = document.querySelector('[onclick*="admin"]');
  if (adminTab) adminTab.style.display = '';
}

/** Revierte la UI al estado de visitante. */
function _updateNavForLogout() {
  document.getElementById('navUser').style.display    = 'none';
  document.getElementById('btnLoginNav').style.display  = '';
  document.getElementById('btnLogoutNav').style.display = 'none';
  document.body.classList.remove('admin-mode');

  const adminTab = document.querySelector('[onclick*="admin"]');
  if (adminTab) adminTab.style.display = 'none';
}

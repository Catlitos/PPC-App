// ─────────────────────────────────────────────
// js/admin.js
// Acciones del panel de encargado:
// gestión de puntos, usuarios y contraseñas.
// ─────────────────────────────────────────────

import { Crypto }                          from './crypto.js';
import { Store }                           from './store.js';
import { getDB, getSession }               from './state.js';
import { toast, openModal, closeModal }    from './ui.js';
import { renderAll, renderAdmin }          from './render.js';

// ── Puntos ────────────────────────────────────

/**
 * Agrega un nuevo punto de predicación.
 */
export function addPunto() {
  const db  = getDB();
  const val = document.getElementById('newPuntoInput').value.trim();
  if (!val)                  return toast('Ingresa un nombre', 'error');
  if (db.puntos.includes(val)) return toast('Ese punto ya existe', 'error');

  db.puntos.push(val);
  Store.audit(db, 'agregar_punto', { punto: val });
  Store.save(db);
  document.getElementById('newPuntoInput').value = '';
  toast(`Punto "${val}" agregado`, 'success');
  renderAll();
  renderAdmin();
}

/**
 * Elimina un punto y todos sus turnos asociados.
 * @param {number} idx índice en db.puntos
 */
export function deletePunto(idx) {
  const db = getDB();
  const p  = db.puntos[idx];
  if (!confirm(`¿Eliminar el punto "${p}"? Se perderán sus turnos.`)) return;

  db.puntos.splice(idx, 1);
  db.turnos = db.turnos.filter(t => t.punto !== p);
  Store.audit(db, 'eliminar_punto', { punto: p });
  Store.save(db);
  toast(`Punto "${p}" eliminado`, 'success');
  renderAll();
  renderAdmin();
}

/**
 * Elimina un turno desde el panel de admin.
 * @param {number} id
 */
export function adminDeleteTurno(id) {
  const db = getDB();
  const t  = db.turnos.find(x => x.id === id);
  if (!t) return;
  if (!confirm(`¿Eliminar turno de ${t.hermanoNombre}?`)) return;

  db.turnos = db.turnos.filter(x => x.id !== id);
  Store.audit(db, 'admin_eliminar_turno', {
    hermano: t.hermanoNombre, punto: t.punto, hora: t.hora, fecha: t.fecha,
  });
  Store.save(db);
  toast('Turno eliminado', 'success');
  renderAll();
  renderAdmin();
}

// ── Usuarios ──────────────────────────────────

/**
 * Abre el modal de nuevo encargado, limpiando campos.
 */
export function openAddUsuarioModal() {
  ['uNombre', 'uUser', 'uPass', 'uPassConfirm']
    .forEach(id => { document.getElementById(id).value = ''; });
  openModal('addUsuarioModal');
}

/**
 * Valida y crea un nuevo encargado.
 * Validaciones:
 *   - Nombre requerido
 *   - Usuario ≥ 3 chars, solo letras/números/- _
 *   - Usuario no duplicado
 *   - Contraseña ≥ 6 chars
 *   - Contraseñas coinciden
 */
export async function saveUsuario() {
  const nombre = document.getElementById('uNombre').value.trim();
  const user   = document.getElementById('uUser').value.trim().toLowerCase();
  const pass   = document.getElementById('uPass').value;
  const conf   = document.getElementById('uPassConfirm').value;

  if (!nombre)                          return toast('El nombre es requerido', 'error');
  if (!user || user.length < 3)         return toast('El usuario debe tener al menos 3 caracteres', 'error');
  if (!/^[a-z0-9_-]+$/.test(user))     return toast('El usuario solo puede tener letras, números, - y _', 'error');

  const db = getDB();
  if (db.usuarios.find(u => u.user === user)) return toast('Ese nombre de usuario ya existe', 'error');
  if (!pass || pass.length < 6)         return toast('La contraseña debe tener al menos 6 caracteres', 'error');
  if (pass !== conf)                    return toast('Las contraseñas no coinciden', 'error');

  const passHash = await Crypto.hashPassword(pass);
  db.usuarios.push({
    id:        Date.now(),
    user,
    passHash,
    nombre,
    rol:       'encargado',
    createdAt: new Date().toISOString(),
  });

  Store.audit(db, 'crear_usuario', { user, nombre });
  Store.save(db);
  closeModal('addUsuarioModal');
  toast(`Encargado "${nombre}" creado correctamente`, 'success');
  renderAdmin();
}

/**
 * Elimina un encargado.
 * No permite eliminar al usuario de la sesión actual
 * ni dejar la lista vacía.
 * @param {number} id
 */
export function deleteUsuario(id) {
  const db      = getDB();
  const session = getSession();
  const u       = db.usuarios.find(x => x.id === id);
  if (!u) return;
  if (u.user === session?.user)  return toast('No puedes eliminarte a ti mismo', 'error');
  if (db.usuarios.length <= 1)   return toast('Debe existir al menos un encargado', 'error');
  if (!confirm(`¿Eliminar al encargado "${u.nombre}" (@${u.user})?`)) return;

  db.usuarios = db.usuarios.filter(x => x.id !== id);
  Store.audit(db, 'eliminar_usuario', { user: u.user, nombre: u.nombre });
  Store.save(db);
  toast(`Encargado "${u.nombre}" eliminado`, 'success');
  renderAdmin();
}

// ── Contraseña ────────────────────────────────

/**
 * Cambia la contraseña del encargado actualmente logueado.
 */
export async function cambiarPassword() {
  const actual  = document.getElementById('pwActual').value;
  const nueva   = document.getElementById('pwNueva').value;
  const confirm = document.getElementById('pwConfirm').value;

  if (!actual || !nueva || !confirm) return toast('Completá todos los campos', 'error');
  if (nueva.length < 6)             return toast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
  if (nueva !== confirm)            return toast('Las contraseñas nuevas no coinciden', 'error');

  const db = getDB();
  const u  = db.usuarios.find(x => x.user === getSession().user);
  if (!u) return toast('Usuario no encontrado', 'error');

  const ok = await Crypto.verify(actual, u.passHash);
  if (!ok) return toast('La contraseña actual es incorrecta', 'error');

  u.passHash = await Crypto.hashPassword(nueva);
  Store.audit(db, 'cambiar_password', { user: u.user });
  Store.save(db);

  ['pwActual', 'pwNueva', 'pwConfirm'].forEach(id => {
    document.getElementById(id).value = '';
  });
  toast('✅ Contraseña actualizada correctamente', 'success');
}

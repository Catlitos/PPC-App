// ─────────────────────────────────────────────
// js/store.js
// Capa de persistencia: solo habla con
// localStorage. No toca el DOM. No sabe de UI.
// ─────────────────────────────────────────────

import { DB_KEY }  from './constants.js';
import { Crypto }  from './crypto.js';

/**
 * Genera la base de datos inicial con un
 * usuario admin por defecto.
 * @returns {Promise<Object>}
 */
export async function defaultDB() {
  const adminHash = await Crypto.hashPassword('admin123');
  return {
    version:   2,
    usuarios: [{
      id: 1,
      user: 'encargado',
      passHash: adminHash,
      nombre: 'Encargado',
      rol: 'encargado',
      createdAt: new Date().toISOString(),
    }],
    puntos:    ['San Martin', '5 y 6', 'Familia Rua', 'Salón del Reino', 'Familia Molina'],
    hermanos:  [],
    turnos:    [],
    auditoria: [],
  };
}

export const Store = {
  /**
   * Carga la DB desde localStorage.
   * Retorna null si no existe o es incompatible.
   * @returns {Object|null}
   */
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Migraciones: rechazar versiones viejas
      if (!parsed.version || parsed.version < 2) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  /**
   * Persiste la DB en localStorage.
   * @param {Object} db
   * @returns {boolean} éxito
   */
  save(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      console.error('[Store] Error al guardar:', e);
      return false;
    }
  },

  /**
   * Registra una acción en la auditoría.
   * Mantiene un máximo de 200 entradas.
   * @param {Object} db
   * @param {string} accion
   * @param {Object} datos
   */
  audit(db, accion, datos = {}) {
    db.auditoria ??= [];
    db.auditoria.unshift({
      id:        Date.now(),
      accion,
      timestamp: new Date().toISOString(),
      datos,
    });
    if (db.auditoria.length > 200) {
      db.auditoria = db.auditoria.slice(0, 200);
    }
  },
};

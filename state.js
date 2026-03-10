// ─────────────────────────────────────────────
// js/state.js
// Única fuente de verdad del estado de la app.
//
// REGLA: Nadie toca _state directamente.
// Todos los módulos leen con getters
// y escriben con setters.
// ─────────────────────────────────────────────

const _state = {
  db:               null,
  session:          null,
  weekOffset:       0,
  activeFilter:     'all',
  activePuntoFilter:'all',
  slotContext:      null, // { punto, isoDate, hora }
};

// ── Getters ──────────────────────────────────
export const getDB            = ()  => _state.db;
export const getSession       = ()  => _state.session;
export const getWeekOffset    = ()  => _state.weekOffset;
export const getFilter        = ()  => _state.activeFilter;
export const getPuntoFilter   = ()  => _state.activePuntoFilter;
export const getSlotContext   = ()  => _state.slotContext;
export const isLoggedIn       = ()  => _state.session !== null;
export const isAdmin          = ()  => _state.session?.rol === 'encargado';

// ── Setters ──────────────────────────────────
export function setDB(db)                { _state.db = db; }
export function setSession(s)            { _state.session = s; }
export function clearSession()           { _state.session = null; }
export function setWeekOffset(n)         { _state.weekOffset = n; }
export function changeWeek(delta)        { _state.weekOffset += delta; }
export function setFilter(f)             { _state.activeFilter = f; }
export function setPuntoFilter(p)        { _state.activePuntoFilter = p; }
export function setSlotContext(ctx)      { _state.slotContext = ctx; }

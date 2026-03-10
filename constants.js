// ─────────────────────────────────────────────
// js/constants.js
// Datos fijos de la app. Sin lógica, sin imports.
// Si cambian, se edita aquí y se propaga solo.
// ─────────────────────────────────────────────

export const DB_KEY      = 'predicapp_v2';
export const SESSION_TTL = 60 * 60 * 1000; // 1 hora en ms
export const MAX_POR_SLOT = 3;

export const HORARIOS = [
  '7:00 – 9:00',
  '9:00 – 11:00',
  '11:00 – 1:00',
  '1:00 – 3:00',
  '3:00 – 5:00',
  '5:00 – 7:00',
];

export const DIAS = [
  'Lunes', 'Martes', 'Miércoles',
  'Jueves', 'Viernes', 'Sábado', 'Domingo',
];

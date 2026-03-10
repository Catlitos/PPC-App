// ─────────────────────────────────────────────
// js/crypto.js
// Utilidades criptográficas puras.
// No sabe nada de la app, no tiene imports.
// Podría copiarse a cualquier otro proyecto.
// ─────────────────────────────────────────────

export const Crypto = {
  /**
   * Hashea una contraseña con SHA-256.
   * @param {string} pwd
   * @returns {Promise<string>} hex string
   */
  async hashPassword(pwd) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(pwd));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Verifica que una contraseña coincide con su hash.
   * @param {string} pwd
   * @param {string} hash
   * @returns {Promise<boolean>}
   */
  async verify(pwd, hash) {
    return (await this.hashPassword(pwd)) === hash;
  },

  /**
   * Genera un token aleatorio de 16 bytes (hex).
   * @returns {string}
   */
  token() {
    return crypto.getRandomValues(new Uint8Array(16))
      .reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
  },
};

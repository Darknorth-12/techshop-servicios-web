/**
 * Emisión y verificación de tokens JWT (JSON Web Token).
 *
 * El token es una credencial firmada que el servidor entrega al iniciar
 * sesión. El cliente lo envía en cada petición protegida con el encabezado:
 *   Authorization: Bearer <token>
 * El servidor comprueba la firma, así no necesita guardar sesiones.
 */
const jwt = require('jsonwebtoken');

const DURACION_POR_DEFECTO = '2h';

/**
 * @param {string} secreto Clave con la que se firman los tokens.
 * @param {string} [duracion] Tiempo de vida del token (por ejemplo '2h').
 */
const crearGestorTokens = (secreto, duracion = DURACION_POR_DEFECTO) => {
  /** Genera un token con los datos mínimos necesarios del usuario. */
  const generar = (usuario) => jwt.sign(
    { sub: usuario.id, usuario: usuario.usuario, rol: usuario.rol },
    secreto,
    { expiresIn: duracion },
  );

  /**
   * Verifica la firma y la vigencia.
   * @returns {object|null} Los datos del token, o null si es inválido o venció.
   */
  const verificar = (token) => {
    try {
      return jwt.verify(token, secreto);
    } catch (error) {
      return null;
    }
  };

  return { generar, verificar };
};

module.exports = { crearGestorTokens };

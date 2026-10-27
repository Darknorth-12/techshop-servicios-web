/**
 * Repositorio de usuarios (capa de acceso a datos).
 *
 * Cada usuario tiene la forma:
 * { id, usuario, contrasenaHash, rol, fechaRegistro }
 * donde rol es 'cliente' (por defecto) o 'admin'.
 */
const { crearAlmacenJson } = require('./almacen-json');

/**
 * @param {string} rutaArchivo Archivo JSON donde se guardan los usuarios.
 */
const crearRepositorioUsuarios = (rutaArchivo) => {
  const almacen = crearAlmacenJson(rutaArchivo);

  /** Busca por nombre de usuario sin distinguir mayúsculas de minúsculas. */
  const buscarPorUsuario = (usuario) => {
    const buscado = usuario.trim().toLowerCase();
    return almacen.leer().find((u) => u.usuario.toLowerCase() === buscado) || null;
  };

  const buscarPorId = (id) => almacen.leer().find((u) => u.id === id) || null;

  /**
   * Guarda un usuario nuevo y le asigna id y fecha de registro.
   * @returns {object} El usuario guardado (incluye el hash de la contraseña).
   */
  const guardar = ({ usuario, contrasenaHash, rol = 'cliente' }) => {
    const lista = almacen.leer();
    const nuevo = {
      id: almacen.siguienteId(lista),
      usuario: usuario.trim(),
      contrasenaHash,
      rol,
      fechaRegistro: new Date().toISOString(),
    };
    almacen.escribir([...lista, nuevo]);
    return nuevo;
  };

  return { buscarPorUsuario, buscarPorId, guardar };
};

module.exports = { crearRepositorioUsuarios };

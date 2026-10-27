/**
 * Servicio de autenticación: reglas de negocio de registro, inicio de sesión
 * y consulta del perfil.
 *
 * Las contraseñas NUNCA se guardan en texto plano: se almacena únicamente el
 * hash generado con bcrypt (algoritmo lento y con "sal" aleatoria, diseñado
 * para proteger contraseñas).
 */
const bcrypt = require('bcryptjs');
const { ErrorHttp } = require('../utils/errores');

const RONDAS_POR_DEFECTO = 10;

/** Devuelve solo los datos públicos del usuario: nunca el hash. */
const datosPublicos = (usuario) => ({
  id: usuario.id,
  usuario: usuario.usuario,
  rol: usuario.rol,
});

/**
 * @param {object} repositorio Repositorio de usuarios.
 * @param {number} [rondas] Costo de bcrypt; las pruebas usan un valor bajo para ir rápido.
 */
const crearServicioAuth = (repositorio, rondas = RONDAS_POR_DEFECTO) => {
  // Hash de relleno: permite comparar contra algo aunque el usuario no exista,
  // de modo que la respuesta tarde parecido y no delate qué usuarios existen.
  const hashRelleno = bcrypt.hashSync('relleno-no-valido', rondas);

  /**
   * Registra un usuario nuevo. El rol por defecto es 'cliente'.
   * @throws {ErrorHttp} 409 si el nombre de usuario ya existe.
   */
  const registrar = async (usuario, contrasena, rol = 'cliente') => {
    if (repositorio.buscarPorUsuario(usuario)) {
      throw new ErrorHttp(409, 'El usuario ya está registrado');
    }

    const contrasenaHash = await bcrypt.hash(contrasena, rondas);
    return datosPublicos(repositorio.guardar({ usuario, contrasenaHash, rol }));
  };

  /**
   * Verifica las credenciales.
   * @returns {Promise<object|null>} Datos públicos del usuario si son correctas; si no, null.
   */
  const autenticar = async (usuario, contrasena) => {
    const encontrado = repositorio.buscarPorUsuario(usuario);
    const hash = encontrado ? encontrado.contrasenaHash : hashRelleno;
    const coincide = await bcrypt.compare(contrasena, hash);

    return encontrado && coincide ? datosPublicos(encontrado) : null;
  };

  /**
   * Devuelve el perfil de un usuario ya autenticado.
   * @throws {ErrorHttp} 404 si el usuario ya no existe.
   */
  const obtenerPerfil = (id) => {
    const encontrado = repositorio.buscarPorId(id);
    if (!encontrado) throw new ErrorHttp(404, 'Usuario no encontrado');

    return { ...datosPublicos(encontrado), fechaRegistro: encontrado.fechaRegistro };
  };

  return { registrar, autenticar, obtenerPerfil };
};

module.exports = { crearServicioAuth };

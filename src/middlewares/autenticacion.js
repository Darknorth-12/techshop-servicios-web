/**
 * Middlewares de seguridad: autenticación (¿quién es?) y autorización
 * (¿qué puede hacer?).
 */
const { ErrorHttp } = require('../utils/errores');

/**
 * @param {{verificar: Function}} gestorTokens Gestor de tokens JWT.
 */
const crearMiddlewaresSeguridad = (gestorTokens) => {
  /**
   * Exige un token válido en el encabezado Authorization (Bearer).
   * Si es válido, deja los datos del usuario en req.usuario.
   */
  const autenticar = (req, res, next) => {
    const encabezado = req.headers.authorization || '';
    const [tipo, token] = encabezado.split(' ');
    const datos = tipo === 'Bearer' && token ? gestorTokens.verificar(token) : null;

    if (!datos) {
      return next(new ErrorHttp(401, 'No autenticado: se requiere un token válido'));
    }

    req.usuario = { id: datos.sub, usuario: datos.usuario, rol: datos.rol };
    return next();
  };

  /**
   * Exige que el usuario autenticado tenga alguno de los roles indicados.
   * Debe usarse después de autenticar.
   */
  const exigirRol = (...roles) => (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new ErrorHttp(403, 'No tiene permisos para realizar esta operación'));
    }
    return next();
  };

  return { autenticar, exigirRol };
};

module.exports = { crearMiddlewaresSeguridad };

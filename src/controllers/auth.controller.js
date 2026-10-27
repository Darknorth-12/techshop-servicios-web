/**
 * Controlador de autenticación: traduce las peticiones HTTP a llamadas al
 * servicio y arma las respuestas JSON. No contiene reglas de negocio.
 *
 * Formato de respuesta (todas las respuestas lo siguen):
 * { "exito": boolean, "mensaje": string, ...datos opcionales }
 */
const { validarRegistro, hayCredenciales } = require('../utils/validaciones');
const { envolver } = require('../utils/envolver');

/**
 * @param {object} servicio Servicio de autenticación.
 * @param {{generar: Function}} gestorTokens Gestor de tokens JWT.
 */
const crearControladorAuth = (servicio, gestorTokens) => {
  /**
   * POST /api/registro
   * Cuerpo: { "usuario": "...", "contrasena": "..." }
   * 201 si se registra, 400 si los datos no son válidos, 409 si ya existe.
   * Todo usuario nuevo se crea con el rol 'cliente'.
   */
  const registrar = envolver(async (req, res) => {
    const datos = req.body || {};
    const errores = validarRegistro(datos);

    if (errores.length > 0) {
      res.status(400).json({ exito: false, mensaje: 'Datos de registro inválidos', errores });
      return;
    }

    const usuario = await servicio.registrar(datos.usuario, datos.contrasena);
    res.status(201).json({ exito: true, mensaje: 'Usuario registrado correctamente', usuario });
  });

  /**
   * POST /api/login
   * Cuerpo: { "usuario": "...", "contrasena": "..." }
   * 200 con "Autenticación satisfactoria" y un token JWT si las credenciales
   * son correctas; 401 con "Error en la autenticación" si no lo son (mismo
   * mensaje tanto si el usuario no existe como si la contraseña es incorrecta).
   */
  const iniciarSesion = envolver(async (req, res) => {
    const datos = req.body || {};

    if (!hayCredenciales(datos)) {
      res.status(400).json({ exito: false, mensaje: 'Debe enviar usuario y contraseña' });
      return;
    }

    const usuario = await servicio.autenticar(datos.usuario, datos.contrasena);

    if (!usuario) {
      res.status(401).json({ exito: false, mensaje: 'Error en la autenticación' });
      return;
    }

    res.status(200).json({
      exito: true,
      mensaje: 'Autenticación satisfactoria',
      token: gestorTokens.generar(usuario),
      usuario,
    });
  });

  /** GET /api/perfil (requiere token): datos del usuario autenticado. */
  const perfil = envolver(async (req, res) => {
    res.status(200).json({ exito: true, usuario: servicio.obtenerPerfil(req.usuario.id) });
  });

  return { registrar, iniciarSesion, perfil };
};

module.exports = { crearControladorAuth };

/**
 * Envuelve un manejador de ruta para que cualquier error (síncrono o de una
 * promesa rechazada) llegue al middleware central de errores de app.js, sin
 * repetir try/catch en cada controlador.
 */
const envolver = (manejador) => async (req, res, next) => {
  try {
    await manejador(req, res);
  } catch (error) {
    next(error);
  }
};

module.exports = { envolver };

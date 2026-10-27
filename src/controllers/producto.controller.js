/**
 * Controlador de productos: peticiones y respuestas HTTP del catálogo.
 */
const { validarProducto, leerId } = require('../utils/validaciones');
const { envolver } = require('../utils/envolver');
const { ErrorHttp } = require('../utils/errores');

/** Lee y valida el id de la URL; lanza 400 si no es un entero positivo. */
const idDeLaUrl = (req) => {
  const id = leerId(req.params.id);
  if (id === null) throw new ErrorHttp(400, 'El id debe ser un entero positivo');
  return id;
};

/**
 * @param {object} servicio Servicio de productos.
 */
const crearControladorProductos = (servicio) => {
  /** GET /api/productos?buscar=&pagina=&limite= (público) */
  const listar = envolver(async (req, res) => {
    const resultado = servicio.listar({
      buscar: typeof req.query.buscar === 'string' ? req.query.buscar : '',
      pagina: Number.parseInt(req.query.pagina, 10),
      limite: Number.parseInt(req.query.limite, 10),
    });
    res.status(200).json({ exito: true, ...resultado });
  });

  /** GET /api/productos/:id (público) */
  const obtener = envolver(async (req, res) => {
    res.status(200).json({ exito: true, producto: servicio.obtener(idDeLaUrl(req)) });
  });

  /** POST /api/productos (solo admin) */
  const crear = envolver(async (req, res) => {
    const datos = req.body || {};
    const errores = validarProducto(datos);

    if (errores.length > 0) {
      res.status(400).json({ exito: false, mensaje: 'Datos de producto inválidos', errores });
      return;
    }

    res.status(201).json({
      exito: true,
      mensaje: 'Producto creado correctamente',
      producto: servicio.crear(datos),
    });
  });

  /** PUT /api/productos/:id (solo admin): reemplaza todos los datos */
  const actualizar = envolver(async (req, res) => {
    const id = idDeLaUrl(req);
    const datos = req.body || {};
    const errores = validarProducto(datos);

    if (errores.length > 0) {
      res.status(400).json({ exito: false, mensaje: 'Datos de producto inválidos', errores });
      return;
    }

    res.status(200).json({
      exito: true,
      mensaje: 'Producto actualizado correctamente',
      producto: servicio.actualizar(id, datos),
    });
  });

  /** DELETE /api/productos/:id (solo admin) */
  const eliminar = envolver(async (req, res) => {
    servicio.eliminar(idDeLaUrl(req));
    res.status(200).json({ exito: true, mensaje: 'Producto eliminado correctamente' });
  });

  return {
    listar, obtener, crear, actualizar, eliminar,
  };
};

module.exports = { crearControladorProductos };

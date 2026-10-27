/**
 * Controlador de pedidos: peticiones y respuestas HTTP de las compras.
 * Todas las rutas exigen un usuario autenticado (req.usuario).
 */
const {
  validarPedido, validarEstado, leerId, ESTADOS_PEDIDO,
} = require('../utils/validaciones');
const { envolver } = require('../utils/envolver');
const { ErrorHttp } = require('../utils/errores');

const idDeLaUrl = (req) => {
  const id = leerId(req.params.id);
  if (id === null) throw new ErrorHttp(400, 'El id debe ser un entero positivo');
  return id;
};

/**
 * @param {object} servicio Servicio de pedidos.
 */
const crearControladorPedidos = (servicio) => {
  /** POST /api/pedidos: crea un pedido con los productos y cantidades enviados. */
  const crear = envolver(async (req, res) => {
    const datos = req.body || {};
    const errores = validarPedido(datos);

    if (errores.length > 0) {
      res.status(400).json({ exito: false, mensaje: 'Datos de pedido inválidos', errores });
      return;
    }

    res.status(201).json({
      exito: true,
      mensaje: 'Pedido creado correctamente',
      pedido: servicio.crear(req.usuario, datos.items),
    });
  });

  /** GET /api/pedidos?estado=: lista los pedidos propios (el admin ve todos). */
  const listar = envolver(async (req, res) => {
    const { estado } = req.query;
    if (estado !== undefined && !ESTADOS_PEDIDO.includes(estado)) {
      throw new ErrorHttp(400, 'Filtro inválido', validarEstado(estado));
    }

    const pedidos = servicio.listar(req.usuario, estado);
    res.status(200).json({ exito: true, total: pedidos.length, pedidos });
  });

  /** GET /api/pedidos/:id */
  const obtener = envolver(async (req, res) => {
    res.status(200).json({ exito: true, pedido: servicio.obtener(req.usuario, idDeLaUrl(req)) });
  });

  /** PATCH /api/pedidos/:id/cancelar: cancela un pedido pendiente. */
  const cancelar = envolver(async (req, res) => {
    res.status(200).json({
      exito: true,
      mensaje: 'Pedido cancelado correctamente',
      pedido: servicio.cancelar(req.usuario, idDeLaUrl(req)),
    });
  });

  /** PATCH /api/pedidos/:id/estado (solo admin): cuerpo { "estado": "enviado" } */
  const cambiarEstado = envolver(async (req, res) => {
    const id = idDeLaUrl(req);
    const errores = validarEstado((req.body || {}).estado);

    if (errores.length > 0) {
      res.status(400).json({ exito: false, mensaje: 'Estado inválido', errores });
      return;
    }

    res.status(200).json({
      exito: true,
      mensaje: 'Estado del pedido actualizado',
      pedido: servicio.cambiarEstado(id, req.body.estado),
    });
  });

  return {
    crear, listar, obtener, cancelar, cambiarEstado,
  };
};

module.exports = { crearControladorPedidos };

/**
 * Rutas de pedidos. Todas exigen un usuario autenticado; cambiar el estado
 * es exclusivo del admin.
 */
const express = require('express');

/**
 * @param {object} controlador Controlador de pedidos.
 * @param {{autenticar: Function, exigirRol: Function}} seguridad Middlewares de seguridad.
 */
const crearRutasPedidos = (controlador, seguridad) => {
  const router = express.Router();

  router.use(seguridad.autenticar);

  router.post('/', controlador.crear);
  router.get('/', controlador.listar);
  router.get('/:id', controlador.obtener);
  router.patch('/:id/cancelar', controlador.cancelar);
  router.patch('/:id/estado', seguridad.exigirRol('admin'), controlador.cambiarEstado);

  return router;
};

module.exports = { crearRutasPedidos };

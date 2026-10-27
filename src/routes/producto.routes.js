/**
 * Rutas del catálogo de productos.
 * Consultar es público; crear, modificar y eliminar son solo del admin.
 */
const express = require('express');

/**
 * @param {object} controlador Controlador de productos.
 * @param {{autenticar: Function, exigirRol: Function}} seguridad Middlewares de seguridad.
 */
const crearRutasProductos = (controlador, seguridad) => {
  const router = express.Router();
  const soloAdmin = [seguridad.autenticar, seguridad.exigirRol('admin')];

  router.get('/', controlador.listar);
  router.get('/:id', controlador.obtener);
  router.post('/', ...soloAdmin, controlador.crear);
  router.put('/:id', ...soloAdmin, controlador.actualizar);
  router.delete('/:id', ...soloAdmin, controlador.eliminar);

  return router;
};

module.exports = { crearRutasProductos };

/**
 * Rutas de autenticación: registro, inicio de sesión y perfil.
 */
const express = require('express');

/**
 * @param {object} controlador Controlador de autenticación.
 * @param {{autenticar: Function}} seguridad Middlewares de seguridad.
 */
const crearRutasAuth = (controlador, seguridad) => {
  const router = express.Router();

  router.post('/registro', controlador.registrar);
  router.post('/login', controlador.iniciarSesion);
  router.get('/perfil', seguridad.autenticar, controlador.perfil);

  return router;
};

module.exports = { crearRutasAuth };

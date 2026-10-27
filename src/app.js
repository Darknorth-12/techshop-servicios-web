/**
 * Construcción de la aplicación Express (sin arrancar el servidor).
 *
 * Se separa de server.js para poder crear la app con repositorios de prueba
 * y ejecutar las pruebas automáticas sin ocupar un puerto fijo.
 *
 * Servicios (la documentación completa está en docs/ y en /api/docs):
 *   Autenticación:  POST /api/registro, POST /api/login, GET /api/perfil
 *   Productos:      GET/POST /api/productos, GET/PUT/DELETE /api/productos/:id
 *   Pedidos:        GET/POST /api/pedidos, GET /api/pedidos/:id,
 *                   PATCH /api/pedidos/:id/cancelar, PATCH /api/pedidos/:id/estado
 *   Utilidades:     GET /api/salud, GET /api/docs, GET /api/openapi.json
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const { crearGestorTokens } = require('./utils/tokens');
const { crearMiddlewaresSeguridad } = require('./middlewares/autenticacion');
const { crearServicioAuth } = require('./services/auth.service');
const { crearServicioProductos } = require('./services/producto.service');
const { crearServicioPedidos } = require('./services/pedido.service');
const { crearControladorAuth } = require('./controllers/auth.controller');
const { crearControladorProductos } = require('./controllers/producto.controller');
const { crearControladorPedidos } = require('./controllers/pedido.controller');
const { crearRutasAuth } = require('./routes/auth.routes');
const { crearRutasProductos } = require('./routes/producto.routes');
const { crearRutasPedidos } = require('./routes/pedido.routes');

const RUTA_OPENAPI = path.join(__dirname, '..', 'docs', 'openapi.yaml');

/**
 * @param {object} opciones
 * @param {{usuarios: object, productos: object, pedidos: object}} opciones.repositorios
 * @param {string} opciones.secretoJwt Clave para firmar los tokens.
 * @param {number} [opciones.rondas] Costo de bcrypt (opcional; las pruebas usan un valor bajo).
 * @returns {import('express').Express} Aplicación lista para escuchar.
 */
const crearApp = ({ repositorios, secretoJwt, rondas }) => {
  const app = express();

  const gestorTokens = crearGestorTokens(secretoJwt);
  const seguridad = crearMiddlewaresSeguridad(gestorTokens);

  const servicioAuth = crearServicioAuth(repositorios.usuarios, rondas);
  const servicioProductos = crearServicioProductos(repositorios.productos);
  const servicioPedidos = crearServicioPedidos(repositorios.pedidos, repositorios.productos);

  // Lee cuerpos JSON; se limita el tamaño para evitar peticiones gigantes
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/salud', (req, res) => {
    res.status(200).json({ exito: true, mensaje: 'Servicio activo' });
  });

  // Documentación interactiva (Swagger UI) y especificación OpenAPI
  const especificacion = YAML.parse(fs.readFileSync(RUTA_OPENAPI, 'utf8'));
  app.get('/api/openapi.json', (req, res) => res.status(200).json(especificacion));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(especificacion));

  app.use('/api', crearRutasAuth(crearControladorAuth(servicioAuth, gestorTokens), seguridad));
  app.use('/api/productos', crearRutasProductos(crearControladorProductos(servicioProductos), seguridad));
  app.use('/api/pedidos', crearRutasPedidos(crearControladorPedidos(servicioPedidos), seguridad));

  // Ruta no encontrada
  app.use((req, res) => {
    res.status(404).json({ exito: false, mensaje: 'Ruta no encontrada' });
  });

  // Manejo central de errores (el cuarto parámetro identifica este middleware)
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    // JSON mal formado en el cuerpo de la petición
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ exito: false, mensaje: 'El cuerpo no es un JSON válido' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ exito: false, mensaje: 'El cuerpo de la petición es demasiado grande' });
    }

    // Errores esperados del negocio (usuario duplicado, sin permisos, etc.)
    if (error.estado) {
      return res.status(error.estado).json({
        exito: false,
        mensaje: error.message,
        ...(error.errores && error.errores.length > 0 ? { errores: error.errores } : {}),
      });
    }

    // Error inesperado: se registra en el servidor pero no se detalla al cliente
    console.error(error);
    return res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
  });

  return app;
};

module.exports = { crearApp };

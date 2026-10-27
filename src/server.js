/**
 * Punto de entrada: crea los repositorios, la aplicación y pone el servidor
 * a escuchar. Se configura con variables de entorno opcionales:
 *   PORT        -> puerto (por defecto 3000)
 *   DATA_DIR    -> carpeta de los archivos JSON (por defecto ./data)
 *   JWT_SECRET  -> clave para firmar los tokens (OBLIGATORIA en producción)
 *   NODE_ENV    -> 'production' exige definir JWT_SECRET
 */
const path = require('path');
const { crearApp } = require('./app');
const { crearRepositorioUsuarios } = require('./repositories/usuario.repository');
const { crearRepositorioProductos } = require('./repositories/producto.repository');
const { crearRepositorioPedidos } = require('./repositories/pedido.repository');

const PUERTO = process.env.PORT || 3000;
const CARPETA_DATOS = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SECRETO_DESARROLLO = 'secreto-solo-para-desarrollo-techshop';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Falta la variable de entorno JWT_SECRET (obligatoria en producción).');
  process.exit(1);
}

const app = crearApp({
  repositorios: {
    usuarios: crearRepositorioUsuarios(path.join(CARPETA_DATOS, 'usuarios.json')),
    productos: crearRepositorioProductos(path.join(CARPETA_DATOS, 'productos.json')),
    pedidos: crearRepositorioPedidos(path.join(CARPETA_DATOS, 'pedidos.json')),
  },
  secretoJwt: process.env.JWT_SECRET || SECRETO_DESARROLLO,
});

app.listen(PUERTO, () => {
  console.log(`Servicios web TechShop escuchando en http://localhost:${PUERTO}`);
  console.log(`Documentación interactiva en http://localhost:${PUERTO}/api/docs`);
});

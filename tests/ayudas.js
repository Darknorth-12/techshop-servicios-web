/**
 * Funciones de apoyo compartidas por las pruebas de la API.
 *
 * Cada archivo de pruebas levanta su propio servidor en un puerto libre y
 * usa una carpeta temporal para los datos, de modo que no tocan los datos
 * reales ni interfieren entre sí.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { crearApp } = require('../src/app');
const { crearRepositorioUsuarios } = require('../src/repositories/usuario.repository');
const { crearRepositorioProductos } = require('../src/repositories/producto.repository');
const { crearRepositorioPedidos } = require('../src/repositories/pedido.repository');
const { crearServicioAuth } = require('../src/services/auth.service');

const SECRETO_PRUEBAS = 'secreto-solo-para-pruebas';
// Costo bajo de bcrypt para que las pruebas corran rápido
const RONDAS_PRUEBA = 4;

/** Crea una carpeta temporal vacía para los archivos de datos. */
const crearCarpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'techshop-'));

/** Levanta la API sobre la carpeta de datos indicada, en un puerto libre. */
const iniciarServidor = (carpeta) => new Promise((resolve) => {
  const app = crearApp({
    repositorios: {
      usuarios: crearRepositorioUsuarios(path.join(carpeta, 'usuarios.json')),
      productos: crearRepositorioProductos(path.join(carpeta, 'productos.json')),
      pedidos: crearRepositorioPedidos(path.join(carpeta, 'pedidos.json')),
    },
    secretoJwt: SECRETO_PRUEBAS,
    rondas: RONDAS_PRUEBA,
  });
  const servidor = app.listen(0, () => resolve(servidor));
});

/**
 * Devuelve una función para llamar a la API:
 *   api(metodo, ruta, cuerpo, token) -> { estado, cuerpo }
 * Si el cuerpo es texto se envía tal cual (sirve para probar JSON mal formado).
 */
const crearCliente = (baseUrl) => async (metodo, ruta, cuerpo, token) => {
  const encabezados = { 'Content-Type': 'application/json' };
  if (token) encabezados.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method: metodo,
    headers: encabezados,
    body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)), // eslint-disable-line no-nested-ternary
  });
  const texto = await respuesta.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch (error) {
    json = null;
  }
  return { estado: respuesta.status, cuerpo: json, texto };
};

/** Registra un cliente, inicia sesión y devuelve su token. */
const registrarYEntrar = async (api, usuario, contrasena = 'Clave1234') => {
  await api('POST', '/api/registro', { usuario, contrasena });
  const { cuerpo } = await api('POST', '/api/login', { usuario, contrasena });
  return cuerpo.token;
};

/**
 * Crea un administrador directamente en los datos (como lo hace
 * npm run crear-admin) y devuelve su token.
 */
const crearAdminYEntrar = async (api, carpeta, usuario = 'admin.test', contrasena = 'Admin1234') => {
  const servicio = crearServicioAuth(
    crearRepositorioUsuarios(path.join(carpeta, 'usuarios.json')),
    RONDAS_PRUEBA,
  );
  await servicio.registrar(usuario, contrasena, 'admin');
  const { cuerpo } = await api('POST', '/api/login', { usuario, contrasena });
  return cuerpo.token;
};

module.exports = {
  SECRETO_PRUEBAS,
  crearCarpetaTemporal,
  iniciarServidor,
  crearCliente,
  registrarYEntrar,
  crearAdminYEntrar,
};

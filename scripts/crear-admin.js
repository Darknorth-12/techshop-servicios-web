/**
 * Crea un usuario con rol 'admin'.
 *
 * El registro público (POST /api/registro) solo crea clientes; el
 * administrador se crea desde el servidor con este script:
 *   npm run crear-admin -- <usuario> <contraseña>
 * Usa la misma carpeta de datos que el servidor (DATA_DIR o ./data).
 */
const path = require('path');
const { crearRepositorioUsuarios } = require('../src/repositories/usuario.repository');
const { crearServicioAuth } = require('../src/services/auth.service');
const { validarRegistro } = require('../src/utils/validaciones');

const [usuario, contrasena] = process.argv.slice(2);

if (!usuario || !contrasena) {
  console.error('Uso: npm run crear-admin -- <usuario> <contraseña>');
  process.exit(1);
}

const errores = validarRegistro({ usuario, contrasena });
if (errores.length > 0) {
  console.error(`Datos inválidos:\n - ${errores.join('\n - ')}`);
  process.exit(1);
}

const carpeta = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const servicio = crearServicioAuth(crearRepositorioUsuarios(path.join(carpeta, 'usuarios.json')));

servicio.registrar(usuario, contrasena, 'admin')
  .then((creado) => console.log(`Administrador creado: ${creado.usuario} (id ${creado.id})`))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });

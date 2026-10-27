/**
 * Pruebas de la API de registro e inicio de sesión.
 *
 * Usan el ejecutor integrado de Node (node:test) y fetch, sin librerías
 * extra. Cada prueba levanta el servidor en un puerto libre y usa un archivo
 * de datos temporal, así que no tocan los datos reales.
 *
 * Ejecutar con: npm test
 */
const {
  describe, it, before, after,
} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { crearCarpetaTemporal, iniciarServidor, crearCliente } = require('./ayudas');

let servidor;
let baseUrl;
let carpeta;
let api;

/** Envía un POST con cuerpo JSON y devuelve estado y cuerpo de la respuesta. */
const enviar = (ruta, cuerpo) => api('POST', ruta, cuerpo);

describe('API de autenticación TechShop', () => {
  before(async () => {
    carpeta = crearCarpetaTemporal();
    servidor = await iniciarServidor(carpeta);
    baseUrl = `http://localhost:${servidor.address().port}`;
    api = crearCliente(baseUrl);
  });

  after(() => {
    servidor.close();
  });

  describe('Registro (POST /api/registro)', () => {
    it('A-01 registra un usuario válido y no devuelve la contraseña ni el hash', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', { usuario: 'elkin.g', contrasena: 'Clave1234' });
      assert.strictEqual(estado, 201);
      assert.strictEqual(cuerpo.exito, true);
      assert.strictEqual(cuerpo.mensaje, 'Usuario registrado correctamente');
      assert.strictEqual(cuerpo.usuario.usuario, 'elkin.g');
      assert.ok(!JSON.stringify(cuerpo).includes('Clave1234'));
      assert.ok(!('contrasenaHash' in cuerpo.usuario));
    });

    it('A-02 rechaza un usuario duplicado (409), sin importar mayúsculas', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', { usuario: 'ELKIN.G', contrasena: 'Otra12345' });
      assert.strictEqual(estado, 409);
      assert.strictEqual(cuerpo.exito, false);
      assert.strictEqual(cuerpo.mensaje, 'El usuario ya está registrado');
    });

    it('A-03 rechaza un usuario demasiado corto (400)', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', { usuario: 'ab', contrasena: 'Clave1234' });
      assert.strictEqual(estado, 400);
      assert.ok(cuerpo.errores.some((e) => e.includes('entre 3 y 20')));
    });

    it('A-04 rechaza un usuario con caracteres especiales (400)', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', { usuario: 'mal@usuario!', contrasena: 'Clave1234' });
      assert.strictEqual(estado, 400);
      assert.ok(cuerpo.errores.some((e) => e.includes('solo admite')));
    });

    it('A-05 rechaza una contraseña corta (400)', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', { usuario: 'usuario5', contrasena: 'Ab1' });
      assert.strictEqual(estado, 400);
      assert.ok(cuerpo.errores.some((e) => e.includes('entre 8 y 64')));
    });

    it('A-06 rechaza una contraseña sin números (400)', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', { usuario: 'usuario6', contrasena: 'SoloLetras' });
      assert.strictEqual(estado, 400);
      assert.ok(cuerpo.errores.some((e) => e.includes('una letra y un número')));
    });

    it('A-07 rechaza un cuerpo vacío y informa todos los errores (400)', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', {});
      assert.strictEqual(estado, 400);
      assert.strictEqual(cuerpo.errores.length, 2);
    });

    it('A-08 rechaza datos que no son texto (400)', async () => {
      const { estado } = await enviar('/api/registro', { usuario: 12345, contrasena: ['Clave1234'] });
      assert.strictEqual(estado, 400);
    });

    it('A-09 rechaza un JSON mal formado (400)', async () => {
      const { estado, cuerpo } = await enviar('/api/registro', '{"usuario": "x", ');
      assert.strictEqual(estado, 400);
      assert.strictEqual(cuerpo.mensaje, 'El cuerpo no es un JSON válido');
    });

    it('A-10 la contraseña se guarda cifrada (bcrypt), nunca en texto plano', () => {
      const contenido = fs.readFileSync(path.join(carpeta, 'usuarios.json'), 'utf8');
      assert.ok(!contenido.includes('Clave1234'));
      assert.ok(contenido.includes('$2'));
    });
  });

  describe('Inicio de sesión (POST /api/login)', () => {
    it('A-11 credenciales correctas: autenticación satisfactoria (200)', async () => {
      const { estado, cuerpo } = await enviar('/api/login', { usuario: 'elkin.g', contrasena: 'Clave1234' });
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.exito, true);
      assert.strictEqual(cuerpo.mensaje, 'Autenticación satisfactoria');
    });

    it('A-12 el usuario no distingue mayúsculas de minúsculas', async () => {
      const { estado } = await enviar('/api/login', { usuario: 'ELKIN.G', contrasena: 'Clave1234' });
      assert.strictEqual(estado, 200);
    });

    it('A-13 contraseña incorrecta: error en la autenticación (401)', async () => {
      const { estado, cuerpo } = await enviar('/api/login', { usuario: 'elkin.g', contrasena: 'ClaveMala1' });
      assert.strictEqual(estado, 401);
      assert.strictEqual(cuerpo.exito, false);
      assert.strictEqual(cuerpo.mensaje, 'Error en la autenticación');
    });

    it('A-14 la contraseña distingue mayúsculas de minúsculas (401)', async () => {
      const { estado } = await enviar('/api/login', { usuario: 'elkin.g', contrasena: 'clave1234' });
      assert.strictEqual(estado, 401);
    });

    it('A-15 usuario inexistente: mismo error que contraseña incorrecta (401)', async () => {
      const { estado, cuerpo } = await enviar('/api/login', { usuario: 'fantasma', contrasena: 'Clave1234' });
      assert.strictEqual(estado, 401);
      assert.strictEqual(cuerpo.mensaje, 'Error en la autenticación');
    });

    it('A-16 sin usuario o sin contraseña (400)', async () => {
      const sinClave = await enviar('/api/login', { usuario: 'elkin.g' });
      const sinUsuario = await enviar('/api/login', { contrasena: 'Clave1234' });
      assert.strictEqual(sinClave.estado, 400);
      assert.strictEqual(sinUsuario.estado, 400);
      assert.strictEqual(sinClave.cuerpo.mensaje, 'Debe enviar usuario y contraseña');
    });

    it('A-17 un intento de inyección en el usuario no autentica (401)', async () => {
      const { estado } = await enviar('/api/login', { usuario: "' OR '1'='1", contrasena: "' OR '1'='1" });
      assert.strictEqual(estado, 401);
    });
  });

  describe('Otras rutas y persistencia', () => {
    it('A-18 GET /api/salud responde que el servicio está activo', async () => {
      const respuesta = await fetch(`${baseUrl}/api/salud`);
      assert.strictEqual(respuesta.status, 200);
      assert.strictEqual((await respuesta.json()).mensaje, 'Servicio activo');
    });

    it('A-19 una ruta inexistente responde 404', async () => {
      const respuesta = await fetch(`${baseUrl}/api/no-existe`);
      assert.strictEqual(respuesta.status, 404);
    });

    it('A-20 los usuarios persisten: un servidor nuevo sobre el mismo archivo los reconoce', async () => {
      const segundo = await iniciarServidor(carpeta);
      const url = `http://localhost:${segundo.address().port}/api/login`;
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'elkin.g', contrasena: 'Clave1234' }),
      });
      segundo.close();
      assert.strictEqual(respuesta.status, 200);
    });
  });
});

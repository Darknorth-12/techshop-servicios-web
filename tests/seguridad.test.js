/**
 * Pruebas de seguridad: token JWT, perfil y control de roles.
 * Ejecutar con: npm test
 */
const {
  describe, it, before, after,
} = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const {
  SECRETO_PRUEBAS, crearCarpetaTemporal, iniciarServidor, crearCliente,
  registrarYEntrar, crearAdminYEntrar,
} = require('./ayudas');

let servidor;
let api;
let carpeta;

describe('Seguridad: token, perfil y roles', () => {
  before(async () => {
    carpeta = crearCarpetaTemporal();
    servidor = await iniciarServidor(carpeta);
    api = crearCliente(`http://localhost:${servidor.address().port}`);
  });

  after(() => servidor.close());

  it('S-01 el login entrega un token y los datos públicos (sin hash)', async () => {
    await api('POST', '/api/registro', { usuario: 'ana.lopez', contrasena: 'Clave1234' });
    const { estado, cuerpo } = await api('POST', '/api/login', { usuario: 'ana.lopez', contrasena: 'Clave1234' });
    assert.strictEqual(estado, 200);
    assert.strictEqual(typeof cuerpo.token, 'string');
    assert.strictEqual(cuerpo.usuario.rol, 'cliente');
    assert.ok(!JSON.stringify(cuerpo).includes('$2'));
  });

  it('S-02 un login fallido no entrega token', async () => {
    const { estado, cuerpo } = await api('POST', '/api/login', { usuario: 'ana.lopez', contrasena: 'Equivocada1' });
    assert.strictEqual(estado, 401);
    assert.ok(!('token' in cuerpo));
  });

  it('S-03 el registro ignora un "rol" enviado por el cliente (siempre es cliente)', async () => {
    const { estado, cuerpo } = await api('POST', '/api/registro', {
      usuario: 'intruso', contrasena: 'Clave1234', rol: 'admin',
    });
    assert.strictEqual(estado, 201);
    assert.strictEqual(cuerpo.usuario.rol, 'cliente');
  });

  it('S-04 GET /api/perfil con token devuelve el perfil', async () => {
    const token = await registrarYEntrar(api, 'perfil.ok');
    const { estado, cuerpo } = await api('GET', '/api/perfil', undefined, token);
    assert.strictEqual(estado, 200);
    assert.strictEqual(cuerpo.usuario.usuario, 'perfil.ok');
    assert.strictEqual(cuerpo.usuario.rol, 'cliente');
    assert.ok(cuerpo.usuario.fechaRegistro);
    assert.ok(!JSON.stringify(cuerpo).includes('contrasena'));
  });

  it('S-05 GET /api/perfil sin token responde 401', async () => {
    const { estado, cuerpo } = await api('GET', '/api/perfil');
    assert.strictEqual(estado, 401);
    assert.strictEqual(cuerpo.exito, false);
  });

  it('S-06 un token inventado responde 401', async () => {
    const { estado } = await api('GET', '/api/perfil', undefined, 'esto.no.es.un.token');
    assert.strictEqual(estado, 401);
  });

  it('S-07 un token firmado con otra clave responde 401', async () => {
    const falso = jwt.sign({ sub: 1, usuario: 'x', rol: 'admin' }, 'otra-clave-distinta');
    const { estado } = await api('GET', '/api/perfil', undefined, falso);
    assert.strictEqual(estado, 401);
  });

  it('S-08 un token vencido responde 401', async () => {
    const vencido = jwt.sign({ sub: 1, usuario: 'x', rol: 'cliente' }, SECRETO_PRUEBAS, { expiresIn: -10 });
    const { estado } = await api('GET', '/api/perfil', undefined, vencido);
    assert.strictEqual(estado, 401);
  });

  it('S-09 un encabezado Authorization sin "Bearer" responde 401', async () => {
    const token = await registrarYEntrar(api, 'sin.bearer');
    const respuesta = await fetch(`http://localhost:${servidor.address().port}/api/perfil`, {
      headers: { Authorization: token },
    });
    assert.strictEqual(respuesta.status, 401);
  });

  it('S-10 un cliente no puede usar servicios de admin (403)', async () => {
    const token = await registrarYEntrar(api, 'cliente.normal');
    const { estado, cuerpo } = await api('POST', '/api/productos', {
      nombre: 'Mouse', precio: 1000, stock: 1,
    }, token);
    assert.strictEqual(estado, 403);
    assert.strictEqual(cuerpo.mensaje, 'No tiene permisos para realizar esta operación');
  });

  it('S-11 el admin sí pasa el control de roles', async () => {
    const token = await crearAdminYEntrar(api, carpeta);
    const { estado } = await api('POST', '/api/productos', {
      nombre: 'Mouse', precio: 1000, stock: 1,
    }, token);
    assert.strictEqual(estado, 201);
  });
});

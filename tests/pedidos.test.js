/**
 * Pruebas de los servicios de pedidos: creación, stock, permisos y estados.
 * Ejecutar con: npm test
 */
const {
  describe, it, before, after,
} = require('node:test');
const assert = require('node:assert');
const {
  crearCarpetaTemporal, iniciarServidor, crearCliente, registrarYEntrar, crearAdminYEntrar,
} = require('./ayudas');

let servidor;
let api;
let admin;
let ana;
let beto;

/** Consulta el stock actual de un producto. */
const stockDe = async (id) => (await api('GET', `/api/productos/${id}`)).cuerpo.producto.stock;

/** Crea un pedido del usuario con los items indicados. */
const pedir = (token, items) => api('POST', '/api/pedidos', { items }, token);

describe('Servicios de pedidos', () => {
  before(async () => {
    const carpeta = crearCarpetaTemporal();
    servidor = await iniciarServidor(carpeta);
    api = crearCliente(`http://localhost:${servidor.address().port}`);
    admin = await crearAdminYEntrar(api, carpeta);
    ana = await registrarYEntrar(api, 'ana.cliente');
    beto = await registrarYEntrar(api, 'beto.cliente');

    // Catálogo de prueba:
    //   1 = Mouse (35000, stock 10)  2 = Teclado (120000, stock 3)
    //   3 = Cable (9999.99, stock 100)
    await api('POST', '/api/productos', { nombre: 'Mouse inalámbrico', precio: 35000, stock: 10 }, admin);
    await api('POST', '/api/productos', { nombre: 'Teclado mecánico', precio: 120000, stock: 3 }, admin);
    await api('POST', '/api/productos', { nombre: 'Cable especial', precio: 9999.99, stock: 100 }, admin);
  });

  after(() => servidor.close());

  describe('Crear (POST /api/pedidos)', () => {
    it('D-01 sin token responde 401', async () => {
      const { estado } = await api('POST', '/api/pedidos', { items: [{ productoId: 1, cantidad: 1 }] });
      assert.strictEqual(estado, 401);
    });

    it('D-02 crea el pedido: total calculado, estado pendiente y stock descontado', async () => {
      const { estado, cuerpo } = await pedir(ana, [
        { productoId: 1, cantidad: 2 },
        { productoId: 2, cantidad: 1 },
      ]);
      assert.strictEqual(estado, 201);
      assert.strictEqual(cuerpo.pedido.estado, 'pendiente');
      assert.strictEqual(cuerpo.pedido.total, 190000);
      assert.strictEqual(cuerpo.pedido.items[0].subtotal, 70000);
      assert.strictEqual(await stockDe(1), 8);
      assert.strictEqual(await stockDe(2), 2);
    });

    it('D-03 el servidor ignora un precio enviado por el cliente', async () => {
      const { cuerpo } = await api('POST', '/api/pedidos', {
        items: [{
          productoId: 1, cantidad: 1, precio: 1, precioUnitario: 1,
        }],
      }, ana);
      assert.strictEqual(cuerpo.pedido.items[0].precioUnitario, 35000);
      assert.strictEqual(cuerpo.pedido.total, 35000);
    });

    it('D-04 los totales con decimales se redondean bien (9999.99 x 3)', async () => {
      const { cuerpo } = await pedir(ana, [{ productoId: 3, cantidad: 3 }]);
      assert.strictEqual(cuerpo.pedido.total, 29999.97);
    });

    it('D-05 un producto inexistente responde 400 y no descuenta nada', async () => {
      const antes = await stockDe(1);
      const { estado, cuerpo } = await pedir(ana, [
        { productoId: 1, cantidad: 1 },
        { productoId: 999, cantidad: 1 },
      ]);
      assert.strictEqual(estado, 400);
      assert.ok(cuerpo.errores[0].includes('999'));
      assert.strictEqual(await stockDe(1), antes);
    });

    it('D-06 stock insuficiente responde 409 y no descuenta ningún producto', async () => {
      const stock1 = await stockDe(1);
      const { estado, cuerpo } = await pedir(ana, [
        { productoId: 1, cantidad: 1 },
        { productoId: 2, cantidad: 50 },
      ]);
      assert.strictEqual(estado, 409);
      assert.ok(cuerpo.errores[0].includes('Teclado mecánico'));
      assert.strictEqual(await stockDe(1), stock1);
    });

    const invalidos = [
      ['D-07 items vacío', { items: [] }],
      ['D-08 sin items', {}],
      ['D-09 cantidad cero', { items: [{ productoId: 1, cantidad: 0 }] }],
      ['D-10 cantidad decimal', { items: [{ productoId: 1, cantidad: 1.5 }] }],
      ['D-11 cantidad sobre el máximo', { items: [{ productoId: 1, cantidad: 101 }] }],
      ['D-12 productoId en texto', { items: [{ productoId: '1', cantidad: 1 }] }],
      ['D-13 producto repetido', { items: [{ productoId: 1, cantidad: 1 }, { productoId: 1, cantidad: 2 }] }],
      ['D-14 ítem que no es objeto', { items: [null] }],
    ];
    invalidos.forEach(([nombre, cuerpo]) => {
      it(`${nombre} responde 400`, async () => {
        const { estado } = await api('POST', '/api/pedidos', cuerpo, ana);
        assert.strictEqual(estado, 400);
      });
    });
  });

  describe('Consultar y permisos', () => {
    let pedidoDeBeto;

    before(async () => {
      pedidoDeBeto = (await pedir(beto, [{ productoId: 3, cantidad: 1 }])).cuerpo.pedido;
    });

    it('D-15 un cliente solo ve sus propios pedidos', async () => {
      const { cuerpo } = await api('GET', '/api/pedidos', undefined, beto);
      assert.strictEqual(cuerpo.total, 1);
      assert.strictEqual(cuerpo.pedidos[0].id, pedidoDeBeto.id);
    });

    it('D-16 el admin ve los pedidos de todos', async () => {
      const { cuerpo } = await api('GET', '/api/pedidos', undefined, admin);
      const duenos = new Set(cuerpo.pedidos.map((p) => p.usuarioId));
      assert.ok(cuerpo.total >= 4);
      assert.ok(duenos.size >= 2, 'el admin debe ver pedidos de más de un usuario');
    });

    it('D-17 el filtro por estado funciona y uno inválido responde 400', async () => {
      const bueno = await api('GET', '/api/pedidos?estado=pendiente', undefined, beto);
      const malo = await api('GET', '/api/pedidos?estado=inventado', undefined, beto);
      assert.strictEqual(bueno.estado, 200);
      assert.strictEqual(malo.estado, 400);
    });

    it('D-18 un cliente consulta su pedido por id', async () => {
      const { estado, cuerpo } = await api('GET', `/api/pedidos/${pedidoDeBeto.id}`, undefined, beto);
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.pedido.usuarioId, pedidoDeBeto.usuarioId);
    });

    it('D-19 consultar el pedido de otra persona responde 404 (no revela que existe)', async () => {
      const { estado } = await api('GET', `/api/pedidos/${pedidoDeBeto.id}`, undefined, ana);
      assert.strictEqual(estado, 404);
    });

    it('D-20 el admin consulta cualquier pedido', async () => {
      const { estado } = await api('GET', `/api/pedidos/${pedidoDeBeto.id}`, undefined, admin);
      assert.strictEqual(estado, 200);
    });

    it('D-21 un id inexistente responde 404 y uno inválido responde 400', async () => {
      assert.strictEqual((await api('GET', '/api/pedidos/9999', undefined, admin)).estado, 404);
      assert.strictEqual((await api('GET', '/api/pedidos/abc', undefined, admin)).estado, 400);
    });

    it('D-22 sin token no se puede listar (401)', async () => {
      assert.strictEqual((await api('GET', '/api/pedidos')).estado, 401);
    });

    it('D-23 el pedido conserva el precio histórico si el catálogo cambia después', async () => {
      await api('PUT', '/api/productos/3', { nombre: 'Cable especial', precio: 50000, stock: 90 }, admin);
      const { cuerpo } = await api('GET', `/api/pedidos/${pedidoDeBeto.id}`, undefined, beto);
      assert.strictEqual(cuerpo.pedido.items[0].precioUnitario, 9999.99);
    });
  });

  describe('Cancelar y cambiar estado', () => {
    it('D-24 cancelar un pedido pendiente devuelve el stock', async () => {
      const antes = await stockDe(2);
      const { pedido } = (await pedir(ana, [{ productoId: 2, cantidad: 1 }])).cuerpo;
      assert.strictEqual(await stockDe(2), antes - 1);

      const { estado, cuerpo } = await api('PATCH', `/api/pedidos/${pedido.id}/cancelar`, undefined, ana);
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.pedido.estado, 'cancelado');
      assert.strictEqual(await stockDe(2), antes);
    });

    it('D-25 cancelar dos veces responde 409 y no duplica la devolución de stock', async () => {
      const { pedido } = (await pedir(ana, [{ productoId: 1, cantidad: 1 }])).cuerpo;
      await api('PATCH', `/api/pedidos/${pedido.id}/cancelar`, undefined, ana);
      const stockTrasCancelar = await stockDe(1);

      const { estado } = await api('PATCH', `/api/pedidos/${pedido.id}/cancelar`, undefined, ana);
      assert.strictEqual(estado, 409);
      assert.strictEqual(await stockDe(1), stockTrasCancelar);
    });

    it('D-26 un cliente no puede cancelar el pedido de otro (404)', async () => {
      const { pedido } = (await pedir(beto, [{ productoId: 1, cantidad: 1 }])).cuerpo;
      const { estado } = await api('PATCH', `/api/pedidos/${pedido.id}/cancelar`, undefined, ana);
      assert.strictEqual(estado, 404);
    });

    it('D-27 un cliente no puede cambiar el estado (403)', async () => {
      const { estado } = await api('PATCH', '/api/pedidos/1/estado', { estado: 'enviado' }, ana);
      assert.strictEqual(estado, 403);
    });

    it('D-28 el admin recorre pendiente, enviado y entregado', async () => {
      const { pedido } = (await pedir(ana, [{ productoId: 3, cantidad: 1 }])).cuerpo;
      const enviado = await api('PATCH', `/api/pedidos/${pedido.id}/estado`, { estado: 'enviado' }, admin);
      const entregado = await api('PATCH', `/api/pedidos/${pedido.id}/estado`, { estado: 'entregado' }, admin);
      assert.strictEqual(enviado.cuerpo.pedido.estado, 'enviado');
      assert.strictEqual(entregado.cuerpo.pedido.estado, 'entregado');
    });

    it('D-29 una transición no permitida responde 409 (entregado a enviado)', async () => {
      const { pedido } = (await pedir(ana, [{ productoId: 3, cantidad: 1 }])).cuerpo;
      await api('PATCH', `/api/pedidos/${pedido.id}/estado`, { estado: 'enviado' }, admin);
      await api('PATCH', `/api/pedidos/${pedido.id}/estado`, { estado: 'entregado' }, admin);
      const { estado } = await api('PATCH', `/api/pedidos/${pedido.id}/estado`, { estado: 'enviado' }, admin);
      assert.strictEqual(estado, 409);
    });

    it('D-30 un pedido enviado ya no se puede cancelar (409)', async () => {
      const { pedido } = (await pedir(ana, [{ productoId: 3, cantidad: 1 }])).cuerpo;
      await api('PATCH', `/api/pedidos/${pedido.id}/estado`, { estado: 'enviado' }, admin);
      const { estado } = await api('PATCH', `/api/pedidos/${pedido.id}/cancelar`, undefined, ana);
      assert.strictEqual(estado, 409);
    });

    it('D-31 un estado inexistente responde 400', async () => {
      const { estado } = await api('PATCH', '/api/pedidos/1/estado', { estado: 'volando' }, admin);
      assert.strictEqual(estado, 400);
    });

    it('D-32 cancelar desde el admin también devuelve el stock', async () => {
      const antes = await stockDe(1);
      const { pedido } = (await pedir(ana, [{ productoId: 1, cantidad: 2 }])).cuerpo;
      await api('PATCH', `/api/pedidos/${pedido.id}/estado`, { estado: 'cancelado' }, admin);
      assert.strictEqual(await stockDe(1), antes);
    });

    it('D-33 cancelar un pedido cuyo producto fue eliminado no falla', async () => {
      const nuevo = (await api('POST', '/api/productos', { nombre: 'Descontinuado', precio: 1000, stock: 5 }, admin)).cuerpo.producto;
      const { pedido } = (await pedir(ana, [{ productoId: nuevo.id, cantidad: 1 }])).cuerpo;
      await api('DELETE', `/api/productos/${nuevo.id}`, undefined, admin);
      const { estado } = await api('PATCH', `/api/pedidos/${pedido.id}/cancelar`, undefined, ana);
      assert.strictEqual(estado, 200);
    });
  });
});

/**
 * Pruebas de los servicios de productos (catálogo).
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
let cliente;

const mouse = {
  nombre: 'Mouse inalámbrico', descripcion: 'Mouse óptico USB 2.4GHz', precio: 35000, stock: 20,
};

describe('Servicios de productos', () => {
  before(async () => {
    const carpeta = crearCarpetaTemporal();
    servidor = await iniciarServidor(carpeta);
    api = crearCliente(`http://localhost:${servidor.address().port}`);
    admin = await crearAdminYEntrar(api, carpeta);
    cliente = await registrarYEntrar(api, 'cliente.prod');
  });

  after(() => servidor.close());

  describe('Crear (POST /api/productos)', () => {
    it('P-01 sin token responde 401', async () => {
      const { estado } = await api('POST', '/api/productos', mouse);
      assert.strictEqual(estado, 401);
    });

    it('P-02 como cliente responde 403', async () => {
      const { estado } = await api('POST', '/api/productos', mouse, cliente);
      assert.strictEqual(estado, 403);
    });

    it('P-03 como admin crea el producto (201) con id', async () => {
      const { estado, cuerpo } = await api('POST', '/api/productos', mouse, admin);
      assert.strictEqual(estado, 201);
      assert.strictEqual(cuerpo.producto.id, 1);
      assert.strictEqual(cuerpo.producto.nombre, 'Mouse inalámbrico');
      assert.strictEqual(cuerpo.producto.precio, 35000);
    });

    it('P-04 la descripción es opcional y queda vacía', async () => {
      const { estado, cuerpo } = await api('POST', '/api/productos', { nombre: 'Teclado mecánico', precio: 120000, stock: 10 }, admin);
      assert.strictEqual(estado, 201);
      assert.strictEqual(cuerpo.producto.descripcion, '');
    });

    const invalidos = [
      ['P-05 nombre vacío', { ...mouse, nombre: '' }, 'obligatorio'],
      ['P-06 nombre de 2 caracteres', { ...mouse, nombre: 'ab' }, 'entre 3 y 50'],
      ['P-07 nombre de 51 caracteres', { ...mouse, nombre: 'a'.repeat(51) }, 'entre 3 y 50'],
      ['P-08 nombre con caracteres especiales', { ...mouse, nombre: 'Mouse@#$%' }, 'solo admite'],
      ['P-09 nombre con etiqueta HTML', { ...mouse, nombre: '<script>alert(1)</script>' }, 'solo admite'],
      ['P-10 descripción de 151 caracteres', { ...mouse, descripcion: 'a'.repeat(151) }, 'no puede superar 150'],
      ['P-11 precio en texto', { ...mouse, precio: '35000' }, 'debe ser un número'],
      ['P-12 precio cero', { ...mouse, precio: 0 }, 'mayor a cero'],
      ['P-13 precio negativo', { ...mouse, precio: -5 }, 'mayor a cero'],
      ['P-14 precio con 3 decimales', { ...mouse, precio: 10.999 }, 'máximo 2 decimales'],
      ['P-15 precio sobre el máximo', { ...mouse, precio: 100000000 }, 'no puede superar'],
      ['P-16 stock decimal', { ...mouse, stock: 2.5 }, 'número entero'],
      ['P-17 stock negativo', { ...mouse, stock: -1 }, 'no puede ser negativo'],
      ['P-18 stock sobre el máximo', { ...mouse, stock: 100001 }, 'no puede superar'],
      ['P-19 stock en texto', { ...mouse, stock: '10' }, 'número entero'],
    ];
    invalidos.forEach(([nombre, datos, fragmento]) => {
      it(`${nombre} responde 400`, async () => {
        const { estado, cuerpo } = await api('POST', '/api/productos', datos, admin);
        assert.strictEqual(estado, 400);
        assert.ok(cuerpo.errores.join(' ').includes(fragmento), `errores: ${cuerpo.errores}`);
      });
    });

    it('P-20 un cuerpo vacío informa todos los errores (400)', async () => {
      const { estado, cuerpo } = await api('POST', '/api/productos', {}, admin);
      assert.strictEqual(estado, 400);
      assert.strictEqual(cuerpo.errores.length, 3);
    });
  });

  describe('Consultar (GET /api/productos)', () => {
    before(async () => {
      await api('POST', '/api/productos', { nombre: 'Monitor 24 pulgadas', precio: 480000, stock: 5 }, admin);
      await api('POST', '/api/productos', { nombre: 'Cable USB-C 2.0', precio: 15000, stock: 50 }, admin);
    });

    it('P-21 el listado es público (sin token)', async () => {
      const { estado, cuerpo } = await api('GET', '/api/productos');
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.total, 4);
      assert.strictEqual(cuerpo.pagina, 1);
    });

    it('P-22 busca por nombre sin distinguir mayúsculas', async () => {
      // El nombre es "Cable USB-C 2.0"; se busca en minúsculas a propósito
      const { cuerpo } = await api('GET', '/api/productos?buscar=usb');
      assert.strictEqual(cuerpo.total, 1);
      assert.strictEqual(cuerpo.productos[0].nombre, 'Cable USB-C 2.0');
    });

    it('P-23 una búsqueda sin coincidencias devuelve lista vacía', async () => {
      const { estado, cuerpo } = await api('GET', '/api/productos?buscar=zzz');
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.total, 0);
      assert.deepStrictEqual(cuerpo.productos, []);
    });

    it('P-24 pagina los resultados', async () => {
      // Hay 4 productos: con límite 3, la página 1 trae 3 y la página 2 trae 1
      const primera = await api('GET', '/api/productos?limite=3&pagina=1');
      const segunda = await api('GET', '/api/productos?limite=3&pagina=2');
      assert.strictEqual(primera.cuerpo.productos.length, 3);
      assert.strictEqual(primera.cuerpo.total, 4);
      assert.strictEqual(segunda.cuerpo.productos.length, 1);
    });

    it('P-25 un límite excesivo se reduce a 50', async () => {
      const { cuerpo } = await api('GET', '/api/productos?limite=9999');
      assert.strictEqual(cuerpo.limite, 50);
    });

    it('P-26 una página inválida se corrige a 1', async () => {
      const { cuerpo } = await api('GET', '/api/productos?pagina=-4&limite=abc');
      assert.strictEqual(cuerpo.pagina, 1);
      assert.strictEqual(cuerpo.limite, 10);
    });

    it('P-27 consulta un producto por id (público)', async () => {
      const { estado, cuerpo } = await api('GET', '/api/productos/1');
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.producto.nombre, 'Mouse inalámbrico');
    });

    it('P-28 un id inexistente responde 404', async () => {
      const { estado, cuerpo } = await api('GET', '/api/productos/9999');
      assert.strictEqual(estado, 404);
      assert.strictEqual(cuerpo.mensaje, 'Producto no encontrado');
    });

    it('P-29 un id no numérico responde 400', async () => {
      const { estado } = await api('GET', '/api/productos/abc');
      assert.strictEqual(estado, 400);
    });

    it('P-30 un intento de inyección en el id responde 400', async () => {
      const { estado } = await api('GET', '/api/productos/1%20OR%201=1');
      assert.strictEqual(estado, 400);
    });
  });

  describe('Actualizar y eliminar', () => {
    it('P-31 PUT como admin reemplaza los datos (200)', async () => {
      const { estado, cuerpo } = await api('PUT', '/api/productos/1', { ...mouse, precio: 38000, stock: 18 }, admin);
      assert.strictEqual(estado, 200);
      assert.strictEqual(cuerpo.producto.precio, 38000);
      const consulta = await api('GET', '/api/productos/1');
      assert.strictEqual(consulta.cuerpo.producto.stock, 18);
    });

    it('P-32 PUT como cliente responde 403', async () => {
      const { estado } = await api('PUT', '/api/productos/1', mouse, cliente);
      assert.strictEqual(estado, 403);
    });

    it('P-33 PUT con datos inválidos responde 400', async () => {
      const { estado } = await api('PUT', '/api/productos/1', { ...mouse, precio: -1 }, admin);
      assert.strictEqual(estado, 400);
    });

    it('P-34 PUT sobre un id inexistente responde 404 y no lo crea', async () => {
      const { estado } = await api('PUT', '/api/productos/777', mouse, admin);
      assert.strictEqual(estado, 404);
      assert.strictEqual((await api('GET', '/api/productos/777')).estado, 404);
    });

    it('P-35 DELETE como cliente responde 403', async () => {
      const { estado } = await api('DELETE', '/api/productos/2', undefined, cliente);
      assert.strictEqual(estado, 403);
    });

    it('P-36 DELETE como admin elimina el producto (200)', async () => {
      const { estado } = await api('DELETE', '/api/productos/2', undefined, admin);
      assert.strictEqual(estado, 200);
      assert.strictEqual((await api('GET', '/api/productos/2')).estado, 404);
    });

    it('P-37 DELETE sobre un id inexistente responde 404', async () => {
      const { estado } = await api('DELETE', '/api/productos/2', undefined, admin);
      assert.strictEqual(estado, 404);
    });
  });
});

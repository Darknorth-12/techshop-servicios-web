/**
 * Pruebas de la documentación: la especificación OpenAPI debe ser válida, se
 * debe poder ver en /api/docs y TODOS los servicios documentados deben existir
 * de verdad en la API (la documentación no puede quedar desactualizada).
 * Ejecutar con: npm test
 */
const {
  describe, it, before, after,
} = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const YAML = require('yaml');
const { crearCarpetaTemporal, iniciarServidor, crearCliente } = require('./ayudas');

const RUTA_OPENAPI = path.join(__dirname, '..', 'docs', 'openapi.yaml');

let servidor;
let baseUrl;
let api;

describe('Documentación de la API', () => {
  before(async () => {
    servidor = await iniciarServidor(crearCarpetaTemporal());
    baseUrl = `http://localhost:${servidor.address().port}`;
    api = crearCliente(baseUrl);
  });

  after(() => servidor.close());

  it('O-01 la especificación OpenAPI es válida', async () => {
    const especificacion = await SwaggerParser.validate(RUTA_OPENAPI);
    assert.strictEqual(especificacion.openapi, '3.0.3');
  });

  it('O-02 la documentación interactiva se sirve en /api/docs', async () => {
    const respuesta = await fetch(`${baseUrl}/api/docs/`);
    assert.strictEqual(respuesta.status, 200);
    assert.ok((await respuesta.text()).toLowerCase().includes('swagger'));
  });

  it('O-03 la especificación se descarga en /api/openapi.json', async () => {
    const { estado, cuerpo } = await api('GET', '/api/openapi.json');
    assert.strictEqual(estado, 200);
    assert.strictEqual(cuerpo.info.title, 'TechShop - Servicios web');
  });

  it('O-04 cada servicio documentado existe en la API', async () => {
    const especificacion = YAML.parse(fs.readFileSync(RUTA_OPENAPI, 'utf8'));
    const metodos = ['get', 'post', 'put', 'patch', 'delete'];

    // Lista de operaciones documentadas: [método, ruta]
    const operaciones = Object.entries(especificacion.paths).flatMap(([ruta, definicion]) => (
      metodos.filter((m) => definicion[m]).map((m) => [m.toUpperCase(), ruta])
    ));

    const respuestas = await Promise.all(operaciones.map(([metodo, ruta]) => {
      // Se reemplaza {id} por 1; sin token, las rutas protegidas responden 401 (no 404)
      const cuerpo = metodo === 'GET' ? undefined : {};
      return api(metodo, ruta.replace('{id}', '1'), cuerpo);
    }));

    respuestas.forEach(({ cuerpo }, posicion) => {
      const [metodo, ruta] = operaciones[posicion];
      assert.notStrictEqual(
        cuerpo && cuerpo.mensaje,
        'Ruta no encontrada',
        `${metodo} ${ruta} está documentado pero no existe`,
      );
    });
    assert.ok(operaciones.length >= 14, `Se verificaron ${operaciones.length} servicios`);
  });
});

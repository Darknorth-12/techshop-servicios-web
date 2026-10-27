/**
 * Servicio de productos: reglas de negocio del catálogo.
 */
const { ErrorHttp } = require('../utils/errores');

const LIMITE_MAXIMO = 50;

/** Deja el producto en su forma almacenada (texto limpio, descripción vacía por defecto). */
const normalizar = (datos) => ({
  nombre: datos.nombre.trim(),
  descripcion: (datos.descripcion || '').trim(),
  precio: datos.precio,
  stock: datos.stock,
});

/**
 * @param {object} repositorio Repositorio de productos.
 */
const crearServicioProductos = (repositorio) => {
  /**
   * Lista productos con búsqueda y paginación.
   * @param {{buscar?: string, pagina?: number, limite?: number}} consulta
   */
  const listar = ({ buscar, pagina, limite }) => {
    const paginaSegura = Math.max(1, pagina || 1);
    const limiteSeguro = Math.min(LIMITE_MAXIMO, Math.max(1, limite || 10));
    const { total, items } = repositorio.listar({
      buscar: buscar || '',
      pagina: paginaSegura,
      limite: limiteSeguro,
    });

    return {
      total,
      pagina: paginaSegura,
      limite: limiteSeguro,
      productos: items,
    };
  };

  /** @throws {ErrorHttp} 404 si el producto no existe. */
  const obtener = (id) => {
    const producto = repositorio.obtenerPorId(id);
    if (!producto) throw new ErrorHttp(404, 'Producto no encontrado');
    return producto;
  };

  const crear = (datos) => repositorio.guardar(normalizar(datos));

  /** Reemplaza todos los datos del producto. @throws {ErrorHttp} 404 si no existe. */
  const actualizar = (id, datos) => {
    const guardado = repositorio.guardar({ ...normalizar(datos), id });
    if (!guardado) throw new ErrorHttp(404, 'Producto no encontrado');
    return guardado;
  };

  /** @throws {ErrorHttp} 404 si el producto no existe. */
  const eliminar = (id) => {
    if (!repositorio.eliminar(id)) throw new ErrorHttp(404, 'Producto no encontrado');
  };

  return {
    listar, obtener, crear, actualizar, eliminar,
  };
};

module.exports = { crearServicioProductos };

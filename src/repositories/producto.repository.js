/**
 * Repositorio de productos (capa de acceso a datos).
 *
 * Cada producto tiene la forma:
 * { id, nombre, descripcion, precio, stock }
 * (la misma entidad Producto de los módulos Java, Android y web del proyecto).
 */
const { crearAlmacenJson } = require('./almacen-json');

/**
 * @param {string} rutaArchivo Archivo JSON donde se guardan los productos.
 */
const crearRepositorioProductos = (rutaArchivo) => {
  const almacen = crearAlmacenJson(rutaArchivo);

  /**
   * Lista productos con búsqueda por nombre y paginación.
   * @param {{buscar?: string, pagina?: number, limite?: number}} opciones
   * @returns {{total: number, items: object[]}} Total de coincidencias y la página pedida.
   */
  const listar = ({ buscar = '', pagina = 1, limite = 10 } = {}) => {
    const texto = buscar.trim().toLowerCase();
    const coincidencias = almacen.leer()
      .filter((p) => texto === '' || p.nombre.toLowerCase().includes(texto));
    const inicio = (pagina - 1) * limite;

    return { total: coincidencias.length, items: coincidencias.slice(inicio, inicio + limite) };
  };

  const obtenerPorId = (id) => almacen.leer().find((p) => p.id === id) || null;

  /**
   * Inserta (sin id) o actualiza (con id) un producto.
   * @returns {object|null} El producto guardado, o null si el id a actualizar no existe.
   */
  const guardar = (producto) => {
    const lista = almacen.leer();

    if (!producto.id) {
      const nuevo = { ...producto, id: almacen.siguienteId(lista) };
      almacen.escribir([...lista, nuevo]);
      return nuevo;
    }

    const posicion = lista.findIndex((p) => p.id === producto.id);
    if (posicion === -1) return null;

    lista[posicion] = producto;
    almacen.escribir(lista);
    return producto;
  };

  /** @returns {boolean} true si el producto existía y fue eliminado. */
  const eliminar = (id) => {
    const lista = almacen.leer();
    const restantes = lista.filter((p) => p.id !== id);
    if (restantes.length === lista.length) return false;

    almacen.escribir(restantes);
    return true;
  };

  return {
    listar, obtenerPorId, guardar, eliminar,
  };
};

module.exports = { crearRepositorioProductos };

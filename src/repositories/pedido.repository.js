/**
 * Repositorio de pedidos (capa de acceso a datos).
 *
 * Cada pedido tiene la forma:
 * { id, usuarioId, items: [{productoId, nombre, precioUnitario, cantidad, subtotal}],
 *   total, estado, fechaCreacion }
 *
 * El nombre y el precio de cada producto se guardan dentro del pedido (copia
 * histórica), de modo que un cambio posterior en el catálogo no altera
 * pedidos ya hechos.
 */
const { crearAlmacenJson } = require('./almacen-json');

/**
 * @param {string} rutaArchivo Archivo JSON donde se guardan los pedidos.
 */
const crearRepositorioPedidos = (rutaArchivo) => {
  const almacen = crearAlmacenJson(rutaArchivo);

  /**
   * Lista pedidos, opcionalmente solo los de un usuario y/o con un estado.
   * @param {{usuarioId?: number, estado?: string}} filtros
   */
  const listar = ({ usuarioId, estado } = {}) => almacen.leer()
    .filter((p) => usuarioId === undefined || p.usuarioId === usuarioId)
    .filter((p) => estado === undefined || p.estado === estado);

  const obtenerPorId = (id) => almacen.leer().find((p) => p.id === id) || null;

  /** Inserta (sin id) o actualiza (con id) un pedido. */
  const guardar = (pedido) => {
    const lista = almacen.leer();

    if (!pedido.id) {
      const nuevo = { ...pedido, id: almacen.siguienteId(lista) };
      almacen.escribir([...lista, nuevo]);
      return nuevo;
    }

    const posicion = lista.findIndex((p) => p.id === pedido.id);
    if (posicion === -1) return null;

    lista[posicion] = pedido;
    almacen.escribir(lista);
    return pedido;
  };

  return { listar, obtenerPorId, guardar };
};

module.exports = { crearRepositorioPedidos };

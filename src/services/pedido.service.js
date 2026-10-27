/**
 * Servicio de pedidos: reglas de negocio de las compras en TechShop.
 *
 * Reglas principales:
 *  - Los precios los toma SIEMPRE el servidor del catálogo; nunca se aceptan
 *    precios enviados por el cliente.
 *  - Al crear un pedido se descuenta el stock; al cancelarlo se devuelve.
 *  - Un cliente solo ve y cancela sus propios pedidos; el admin ve todos.
 *
 * Ciclo de vida del estado:
 *   pendiente -> enviado -> entregado
 *   pendiente -> cancelado
 */
const { ErrorHttp } = require('../utils/errores');

// Transiciones de estado permitidas (estado actual -> estados siguientes)
const TRANSICIONES = {
  pendiente: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

/** Redondea a 2 decimales para evitar errores de coma flotante (0.1 + 0.2). */
const redondear = (valor) => Math.round(valor * 100) / 100;

/**
 * @param {object} repoPedidos Repositorio de pedidos.
 * @param {object} repoProductos Repositorio de productos.
 */
const crearServicioPedidos = (repoPedidos, repoProductos) => {
  /** Devuelve el stock de las líneas de un pedido al inventario. */
  const devolverStock = (pedido) => {
    pedido.items.forEach((linea) => {
      const producto = repoProductos.obtenerPorId(linea.productoId);
      // Si el producto fue eliminado del catálogo, no hay stock que devolver
      if (producto) {
        repoProductos.guardar({ ...producto, stock: producto.stock + linea.cantidad });
      }
    });
  };

  /**
   * Un cliente solo puede acceder a sus pedidos. Si el pedido es de otra
   * persona se responde 404 (y no 403) para no revelar que existe.
   */
  const buscarAccesible = (usuario, id) => {
    const pedido = repoPedidos.obtenerPorId(id);
    if (!pedido || (usuario.rol !== 'admin' && pedido.usuarioId !== usuario.id)) {
      throw new ErrorHttp(404, 'Pedido no encontrado');
    }
    return pedido;
  };

  /**
   * Crea un pedido para el usuario.
   * @param {{id: number}} usuario Usuario autenticado.
   * @param {{productoId: number, cantidad: number}[]} items Productos pedidos.
   * @throws {ErrorHttp} 400 si algún producto no existe; 409 si falta stock.
   */
  const crear = (usuario, items) => {
    // Paso 1: todos los productos deben existir
    const inexistentes = items
      .filter((item) => !repoProductos.obtenerPorId(item.productoId))
      .map((item) => `El producto ${item.productoId} no existe`);
    if (inexistentes.length > 0) {
      throw new ErrorHttp(400, 'Pedido inválido', inexistentes);
    }

    // Paso 2: debe haber stock suficiente de todos antes de descontar nada
    const lineas = items.map((item) => {
      const producto = repoProductos.obtenerPorId(item.productoId);
      return { producto, cantidad: item.cantidad };
    });
    const sinStock = lineas
      .filter(({ producto, cantidad }) => producto.stock < cantidad)
      .map(({ producto }) => `Stock insuficiente de "${producto.nombre}": disponible ${producto.stock}`);
    if (sinStock.length > 0) {
      throw new ErrorHttp(409, 'No hay stock suficiente para completar el pedido', sinStock);
    }

    // Paso 3: se descuenta el stock y se guarda el pedido con copia de nombre y precio
    const detalle = lineas.map(({ producto, cantidad }) => {
      repoProductos.guardar({ ...producto, stock: producto.stock - cantidad });
      return {
        productoId: producto.id,
        nombre: producto.nombre,
        precioUnitario: producto.precio,
        cantidad,
        subtotal: redondear(producto.precio * cantidad),
      };
    });

    return repoPedidos.guardar({
      usuarioId: usuario.id,
      items: detalle,
      total: redondear(detalle.reduce((suma, linea) => suma + linea.subtotal, 0)),
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
    });
  };

  /** Lista los pedidos del usuario (o todos si es admin), con filtro opcional por estado. */
  const listar = (usuario, estado) => repoPedidos.listar({
    usuarioId: usuario.rol === 'admin' ? undefined : usuario.id,
    estado,
  });

  const obtener = (usuario, id) => buscarAccesible(usuario, id);

  /**
   * Cancela un pedido pendiente y devuelve el stock.
   * @throws {ErrorHttp} 409 si el pedido ya no está pendiente.
   */
  const cancelar = (usuario, id) => {
    const pedido = buscarAccesible(usuario, id);
    if (pedido.estado !== 'pendiente') {
      throw new ErrorHttp(409, `Solo se pueden cancelar pedidos pendientes (estado actual: ${pedido.estado})`);
    }

    devolverStock(pedido);
    return repoPedidos.guardar({ ...pedido, estado: 'cancelado' });
  };

  /**
   * Cambia el estado de un pedido (operación del administrador).
   * @throws {ErrorHttp} 409 si la transición no está permitida.
   */
  const cambiarEstado = (id, nuevoEstado) => {
    const pedido = repoPedidos.obtenerPorId(id);
    if (!pedido) throw new ErrorHttp(404, 'Pedido no encontrado');

    if (!TRANSICIONES[pedido.estado].includes(nuevoEstado)) {
      throw new ErrorHttp(409, `No se puede pasar de "${pedido.estado}" a "${nuevoEstado}"`);
    }

    if (nuevoEstado === 'cancelado') devolverStock(pedido);
    return repoPedidos.guardar({ ...pedido, estado: nuevoEstado });
  };

  return {
    crear, listar, obtener, cancelar, cambiarEstado,
  };
};

module.exports = { crearServicioPedidos };

/**
 * Reglas de validación de los datos que recibe la API.
 *
 * Cada función devuelve una lista de mensajes de error; si la lista está
 * vacía, los datos son válidos. Las reglas de producto son las mismas de los
 * demás módulos del proyecto TechShop (Java, Android y front-end web).
 */

// ---------- Límites ----------
const USUARIO_MIN = 3;
const USUARIO_MAX = 20;
const CONTRASENA_MIN = 8;
const CONTRASENA_MAX = 64;
const NOMBRE_MIN = 3;
const NOMBRE_MAX = 50;
const DESCRIPCION_MAX = 150;
const PRECIO_MAX = 99999999;
const STOCK_MAX = 100000;
const PEDIDO_MAX_LINEAS = 50;
const CANTIDAD_MAX = 100;

const ESTADOS_PEDIDO = ['pendiente', 'enviado', 'entregado', 'cancelado'];

// Letras, números, punto y guion bajo
const PATRON_USUARIO = /^[A-Za-z0-9._]+$/;
// Letras (con tildes y ñ), números, espacio, punto y guion
const PATRON_NOMBRE_PRODUCTO = /^[\p{L}0-9 .-]+$/u;

// ---------- Registro e inicio de sesión ----------
/**
 * Valida los datos de registro.
 * @param {{usuario: *, contrasena: *}} datos Cuerpo recibido en la petición.
 * @returns {string[]} Lista de errores; vacía si los datos son válidos.
 */
const validarRegistro = ({ usuario, contrasena }) => {
  const errores = [];

  if (typeof usuario !== 'string' || usuario.trim() === '') {
    errores.push('El usuario es obligatorio y debe ser texto');
  } else {
    const nombre = usuario.trim();
    if (nombre.length < USUARIO_MIN || nombre.length > USUARIO_MAX) {
      errores.push(`El usuario debe tener entre ${USUARIO_MIN} y ${USUARIO_MAX} caracteres`);
    }
    if (!PATRON_USUARIO.test(nombre)) {
      errores.push('El usuario solo admite letras, números, punto y guion bajo');
    }
  }

  if (typeof contrasena !== 'string' || contrasena === '') {
    errores.push('La contraseña es obligatoria y debe ser texto');
  } else {
    if (contrasena.length < CONTRASENA_MIN || contrasena.length > CONTRASENA_MAX) {
      errores.push(`La contraseña debe tener entre ${CONTRASENA_MIN} y ${CONTRASENA_MAX} caracteres`);
    }
    if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
      errores.push('La contraseña debe incluir al menos una letra y un número');
    }
  }

  return errores;
};

/**
 * Comprueba que el inicio de sesión traiga usuario y contraseña con texto.
 * En el login no se exigen las reglas del registro para no revelar el
 * formato de las contraseñas válidas.
 */
const hayCredenciales = ({ usuario, contrasena }) => (
  typeof usuario === 'string' && usuario.trim() !== ''
  && typeof contrasena === 'string' && contrasena !== ''
);

// ---------- Productos ----------
/**
 * Valida el cuerpo de un producto (crear o reemplazar).
 * El precio y el stock deben llegar como números JSON, no como texto.
 * @returns {string[]} Lista de errores; vacía si los datos son válidos.
 */
const validarProducto = (datos) => {
  const {
    nombre, descripcion, precio, stock,
  } = datos;
  const errores = [];

  if (typeof nombre !== 'string' || nombre.trim() === '') {
    errores.push('El nombre es obligatorio y debe ser texto');
  } else {
    const limpio = nombre.trim();
    if (limpio.length < NOMBRE_MIN || limpio.length > NOMBRE_MAX) {
      errores.push(`El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres`);
    }
    if (!PATRON_NOMBRE_PRODUCTO.test(limpio)) {
      errores.push('El nombre solo admite letras, números, espacios, punto y guion');
    }
  }

  // La descripción es opcional
  if (descripcion !== undefined && descripcion !== null) {
    if (typeof descripcion !== 'string') {
      errores.push('La descripción debe ser texto');
    } else if (descripcion.trim().length > DESCRIPCION_MAX) {
      errores.push(`La descripción no puede superar ${DESCRIPCION_MAX} caracteres`);
    }
  }

  if (typeof precio !== 'number' || !Number.isFinite(precio)) {
    errores.push('El precio es obligatorio y debe ser un número');
  } else if (precio <= 0) {
    errores.push('El precio debe ser mayor a cero');
  } else if (Math.abs(Math.round(precio * 100) - precio * 100) > 1e-6) {
    errores.push('El precio admite máximo 2 decimales');
  } else if (precio > PRECIO_MAX) {
    errores.push(`El precio no puede superar ${PRECIO_MAX}`);
  }

  if (typeof stock !== 'number' || !Number.isInteger(stock)) {
    errores.push('El stock es obligatorio y debe ser un número entero');
  } else if (stock < 0) {
    errores.push('El stock no puede ser negativo');
  } else if (stock > STOCK_MAX) {
    errores.push(`El stock no puede superar ${STOCK_MAX}`);
  }

  return errores;
};

/**
 * Convierte un parámetro de la URL (texto) en un id entero positivo.
 * @returns {number|null} El id, o null si no es un entero positivo.
 */
const leerId = (texto) => (/^\d+$/.test(texto) && Number(texto) > 0 ? Number(texto) : null);

// ---------- Pedidos ----------
/**
 * Valida el cuerpo de un pedido: { items: [{ productoId, cantidad }] }.
 * @returns {string[]} Lista de errores; vacía si los datos son válidos.
 */
const validarPedido = (datos) => {
  const { items } = datos;
  const errores = [];

  if (!Array.isArray(items) || items.length === 0) {
    return ['El pedido debe incluir al menos un producto en "items"'];
  }
  if (items.length > PEDIDO_MAX_LINEAS) {
    return [`El pedido no puede tener más de ${PEDIDO_MAX_LINEAS} productos distintos`];
  }

  const vistos = new Set();
  items.forEach((item, posicion) => {
    const numero = posicion + 1;
    const { productoId, cantidad } = item || {};

    if (!Number.isInteger(productoId) || productoId <= 0) {
      errores.push(`Ítem ${numero}: productoId debe ser un entero positivo`);
    } else if (vistos.has(productoId)) {
      errores.push(`Ítem ${numero}: el producto ${productoId} está repetido`);
    } else {
      vistos.add(productoId);
    }

    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAX) {
      errores.push(`Ítem ${numero}: cantidad debe ser un entero entre 1 y ${CANTIDAD_MAX}`);
    }
  });

  return errores;
};

/** Valida que el estado recibido sea uno de los estados permitidos. */
const validarEstado = (estado) => (ESTADOS_PEDIDO.includes(estado)
  ? []
  : [`El estado debe ser uno de: ${ESTADOS_PEDIDO.join(', ')}`]);

module.exports = {
  ESTADOS_PEDIDO,
  validarRegistro,
  hayCredenciales,
  validarProducto,
  validarPedido,
  validarEstado,
  leerId,
};

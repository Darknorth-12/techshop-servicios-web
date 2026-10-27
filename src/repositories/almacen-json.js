/**
 * Almacén genérico basado en un archivo JSON.
 *
 * Lo comparten los tres repositorios (usuarios, productos y pedidos) para no
 * repetir el código de lectura y escritura. Si más adelante los datos pasan
 * a una base de datos real (MySQL, MongoDB), solo se reemplazan los
 * repositorios y el resto de la API no cambia.
 *
 * Limitación conocida: las operaciones son síncronas y sin bloqueo entre
 * procesos; es suficiente para un servicio formativo de un solo proceso.
 */
const fs = require('fs');
const path = require('path');

/**
 * @param {string} rutaArchivo Ruta del archivo JSON (se crea si no existe).
 * @returns {{leer: Function, escribir: Function, siguienteId: Function}}
 */
const crearAlmacenJson = (rutaArchivo) => {
  /** Lee la lista completa; si el archivo no existe o está dañado devuelve []. */
  const leer = () => {
    try {
      const lista = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
      return Array.isArray(lista) ? lista : [];
    } catch (error) {
      return [];
    }
  };

  /** Reemplaza el contenido del archivo con la lista recibida. */
  const escribir = (lista) => {
    fs.mkdirSync(path.dirname(rutaArchivo), { recursive: true });
    fs.writeFileSync(rutaArchivo, JSON.stringify(lista, null, 2));
  };

  /** Calcula el siguiente id: el mayor existente más uno. */
  const siguienteId = (lista) => lista.reduce((mayor, actual) => Math.max(mayor, actual.id), 0) + 1;

  return { leer, escribir, siguienteId };
};

module.exports = { crearAlmacenJson };

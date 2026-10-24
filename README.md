# TechShop – Servicio web de registro e inicio de sesión (Node.js + Express)

**Evidencia:** GA7-220501096-AA5-EV01 — Diseño y desarrollo de servicios web (caso)
**Tecnologías:** Node.js, Express, bcryptjs. Persistencia en archivo JSON.

## Descripción

API REST que permite **registrar** un usuario e **iniciar sesión**. Recibe un
usuario y una contraseña; si la autenticación es correcta responde
*«Autenticación satisfactoria»* y, si no, *«Error en la autenticación»*.

El diseño completo (decisiones, arquitectura, modelo de datos, contrato de la
API y flujo) está en [`docs/DISENO_API.md`](docs/DISENO_API.md).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/registro` | Registra un usuario |
| POST | `/api/login` | Inicia sesión |
| GET | `/api/salud` | Comprueba que el servicio está activo |

## Cómo ejecutarlo

Requiere Node.js 18 o superior.

```bash
npm install     # instala Express, bcryptjs y las herramientas de desarrollo
npm start       # inicia el servicio en http://localhost:3000
```

Variables opcionales: `PORT` (puerto) y `DATA_FILE` (ruta del archivo JSON).

## Probarlo con curl o Postman

Registro:

```bash
curl -X POST http://localhost:3000/api/registro \
  -H "Content-Type: application/json" \
  -d '{"usuario":"elkin.g","contrasena":"Clave1234"}'
```

Respuesta (201):

```json
{"exito":true,"mensaje":"Usuario registrado correctamente","usuario":{"id":1,"usuario":"elkin.g"}}
```

Inicio de sesión correcto:

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"elkin.g","contrasena":"Clave1234"}'
```

Respuesta (200):

```json
{"exito":true,"mensaje":"Autenticación satisfactoria"}
```

Inicio de sesión con contraseña incorrecta, respuesta (401):

```json
{"exito":false,"mensaje":"Error en la autenticación"}
```

En Postman: método `POST`, URL `http://localhost:3000/api/login`, pestaña
Body → raw → JSON, y pegar el cuerpo de ejemplo.

## Pruebas con Postman

En la carpeta `postman/` hay una colección lista para importar con 15
peticiones y sus pruebas automáticas:

1. Iniciar el servicio con `npm start`.
2. En Postman: **Import** y elegir `TechShop_API.postman_collection.json` y
   `TechShop_Local.postman_environment.json`.
3. Seleccionar el entorno **TechShop - Local** (arriba a la derecha).
4. Ejecutar la colección completa con **Run collection** (en orden).

## Pruebas y calidad de código

```bash
npm test        # 20 pruebas automatizadas de la API (node:test)
npm run lint    # estándar de codificación Airbnb (ESLint)
```

## Estructura

```
src/
├── server.js                         -> arranque del servidor
├── app.js                            -> rutas y manejo de errores
├── controllers/auth.controller.js    -> peticiones y respuestas HTTP
├── services/auth.service.js          -> reglas de negocio y bcrypt
├── repositories/usuario.repository.js-> lectura y escritura del JSON
└── utils/                            -> validaciones y errores
tests/auth.test.js                    -> pruebas de la API
docs/DISENO_API.md                    -> documento de diseño
data/                                 -> aquí se crea usuarios.json
```

## Seguridad aplicada

- Las contraseñas se guardan con hash bcrypt, nunca en texto plano.
- Usuario inexistente y contraseña incorrecta devuelven el mismo error.
- Las respuestas nunca incluyen el hash ni la contraseña.
- Límite de 10 KB en el cuerpo de las peticiones.
- Los errores inesperados no revelan detalles internos al cliente.

## Control de versiones

Proyecto gestionado con Git (commits con formato `feat:`, `test:`, `docs:`).
El enlace del repositorio remoto está en `enlace_repositorio.txt`.

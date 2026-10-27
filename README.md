# TechShop – Servicios web (Node.js + Express)

**Evidencia:** GA7-220501096-AA5-EV03 — Diseño y desarrollo de servicios web (proyecto)
**Tecnologías:** Node.js, Express, JWT, bcryptjs, OpenAPI/Swagger UI. Persistencia en archivos JSON.

## Descripción

API REST del proyecto formativo TechShop (venta de productos electrónicos) con
los servicios necesarios para el flujo principal del software:

| Grupo | Servicios |
|---|---|
| Autenticación | Registro, inicio de sesión (con token JWT) y perfil |
| Productos | Listar con búsqueda y paginación, consultar, crear, modificar y eliminar |
| Pedidos | Crear (con control de stock), listar, consultar, cancelar y cambiar estado |

Incluye roles (`cliente` y `admin`), validación de datos y la documentación de
cada servicio. Parte del servicio de registro e inicio de sesión de AA5-EV01.

## Documentación

- [`docs/DOCUMENTACION_API.md`](docs/DOCUMENTACION_API.md): cada servicio con su método, URL, permisos, cuerpo, reglas y respuestas.
- [`docs/DISENO_API.md`](docs/DISENO_API.md): análisis, decisiones de diseño, arquitectura, modelo de datos, flujos y seguridad.
- [`docs/openapi.yaml`](docs/openapi.yaml): especificación OpenAPI 3.
- **Documentación interactiva:** con el servicio iniciado, abrir http://localhost:3000/api/docs (permite probar los servicios desde el navegador).

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/registro` | Público |
| POST | `/api/login` | Público |
| GET | `/api/perfil` | Token |
| GET | `/api/productos` | Público |
| GET | `/api/productos/{id}` | Público |
| POST | `/api/productos` | Admin |
| PUT | `/api/productos/{id}` | Admin |
| DELETE | `/api/productos/{id}` | Admin |
| POST | `/api/pedidos` | Token |
| GET | `/api/pedidos` | Token (cliente: los suyos; admin: todos) |
| GET | `/api/pedidos/{id}` | Token (dueño o admin) |
| PATCH | `/api/pedidos/{id}/cancelar` | Token (dueño o admin) |
| PATCH | `/api/pedidos/{id}/estado` | Admin |
| GET | `/api/salud` | Público |

## Cómo ejecutarlo

Requiere Node.js 18 o superior.

```bash
npm install                                  # instala las dependencias
npm run crear-admin -- admin Admin1234       # crea el usuario administrador (una vez)
npm start                                    # inicia en http://localhost:3000
```

Variables opcionales: `PORT` (puerto), `DATA_DIR` (carpeta de los datos) y
`JWT_SECRET` (clave de los tokens; **obligatoria** con `NODE_ENV=production`).
Cambie la contraseña de ejemplo del administrador.

## Ejemplo de uso

```bash
# 1. Iniciar sesión como admin y guardar el token
curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" \
  -d '{"usuario":"admin","contrasena":"Admin1234"}'

# 2. Crear un producto (reemplace TOKEN por el token recibido)
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" \
  -d '{"nombre":"Mouse inalámbrico","descripcion":"Mouse óptico USB 2.4GHz","precio":35000,"stock":20}'

# 3. Consultar el catálogo (público)
curl "http://localhost:3000/api/productos?buscar=mouse"
```

En Postman: pestaña Authorization → tipo **Bearer Token** → pegar el token.
La carpeta `postman/` trae una colección de pruebas del registro y el login
(evidencia AA5-EV02) que sigue funcionando con esta versión.

## Pruebas y calidad de código

```bash
npm test        # 105 pruebas automatizadas (node:test)
npm run lint    # estándar de codificación Airbnb (ESLint)
```

Las pruebas cubren autenticación, seguridad del token y de los roles,
productos, pedidos (stock, totales, permisos y estados) y la documentación:
la especificación OpenAPI debe ser válida y **cada servicio documentado debe
existir de verdad** en la API.

## Estructura

```
src/
├── server.js                 -> arranque
├── app.js                    -> configuración, documentación y manejo de errores
├── routes/                   -> URLs de cada grupo de servicios
├── middlewares/              -> autenticación (token) y roles
├── controllers/              -> peticiones y respuestas HTTP
├── services/                 -> reglas de negocio
├── repositories/             -> acceso a los archivos JSON
└── utils/                    -> validaciones, errores y tokens
scripts/crear-admin.js        -> crea el usuario administrador
tests/                        -> pruebas automatizadas
docs/                         -> documentación y diseño
postman/                      -> colección de Postman (AA5-EV02)
data/                         -> aquí se crean los archivos JSON de datos
```

## Control de versiones

Proyecto gestionado con Git (commits con formato `feat:`, `test:`, `docs:`).
El enlace del repositorio remoto está en `enlace_repositorio.txt`.

# Documentación de los servicios web – TechShop

**Evidencia:** GA7-220501096-AA5-EV03 — Diseño y desarrollo de servicios web (proyecto)

Este documento describe cada servicio de la API. La misma información está en
formato OpenAPI en [`openapi.yaml`](openapi.yaml) y se puede ver de forma
interactiva (y probar desde el navegador) en **http://localhost:3000/api/docs**
con el servicio iniciado.

## 1. Convenciones generales

| Aspecto | Detalle |
|---|---|
| URL base | `http://localhost:3000` |
| Formato | JSON en peticiones y respuestas (`Content-Type: application/json`) |
| Respuesta | Siempre incluye `exito` (true/false) y `mensaje`; los errores de validación traen además `errores` (lista) |
| Autenticación | Encabezado `Authorization: Bearer <token>`; el token se obtiene en `POST /api/login` y dura 2 horas |
| Roles | `cliente` (por defecto al registrarse) y `admin` (se crea con `npm run crear-admin`) |

### Códigos de estado usados

| Código | Significado |
|---|---|
| 200 | Operación correcta |
| 201 | Recurso creado |
| 400 | Datos inválidos, JSON mal formado o id con formato incorrecto |
| 401 | Falta el token, es inválido o venció (o credenciales incorrectas en el login) |
| 403 | El rol del usuario no permite la operación |
| 404 | El recurso no existe (o no pertenece al usuario) |
| 409 | Conflicto: usuario duplicado, stock insuficiente o transición de estado no permitida |
| 413 | Cuerpo de la petición mayor a 10 KB |
| 500 | Error inesperado del servidor |

### Matriz de permisos

| Servicio | Público | Cliente | Admin |
|---|:---:|:---:|:---:|
| Registro, login, salud, consultar productos | ✔ | ✔ | ✔ |
| Perfil | | ✔ | ✔ |
| Crear, modificar y eliminar productos | | | ✔ |
| Crear pedido, ver y cancelar **sus** pedidos | | ✔ | ✔ |
| Ver y cancelar pedidos de **cualquiera** | | | ✔ |
| Cambiar el estado de un pedido | | | ✔ |

---

## 2. Servicios de autenticación

### 2.1 POST /api/registro — Registrar un usuario

Crea un usuario con rol `cliente`. Cualquier campo `rol` enviado se ignora.

**Cuerpo:** `{ "usuario": "elkin.g", "contrasena": "Clave1234" }`

| Campo | Regla |
|---|---|
| `usuario` | 3 a 20 caracteres; solo letras, números, punto y guion bajo. No distingue mayúsculas (`Elkin.G` = `elkin.g`) |
| `contrasena` | 8 a 64 caracteres; al menos una letra y un número. Se guarda cifrada (bcrypt) |

| Código | Respuesta |
|---|---|
| 201 | `{"exito":true,"mensaje":"Usuario registrado correctamente","usuario":{"id":2,"usuario":"elkin.g","rol":"cliente"}}` |
| 400 | `{"exito":false,"mensaje":"Datos de registro inválidos","errores":[...]}` |
| 409 | `{"exito":false,"mensaje":"El usuario ya está registrado"}` |

### 2.2 POST /api/login — Iniciar sesión

**Cuerpo:** `{ "usuario": "elkin.g", "contrasena": "Clave1234" }`

| Código | Respuesta |
|---|---|
| 200 | `{"exito":true,"mensaje":"Autenticación satisfactoria","token":"<JWT>","usuario":{"id":2,"usuario":"elkin.g","rol":"cliente"}}` |
| 401 | `{"exito":false,"mensaje":"Error en la autenticación"}` (mismo mensaje si el usuario no existe o la contraseña es incorrecta) |
| 400 | `{"exito":false,"mensaje":"Debe enviar usuario y contraseña"}` |

### 2.3 GET /api/perfil — Perfil del usuario autenticado

**Requiere token.**

| Código | Respuesta |
|---|---|
| 200 | `{"exito":true,"usuario":{"id":2,"usuario":"elkin.g","rol":"cliente","fechaRegistro":"2026-10-27T21:46:53.235Z"}}` |
| 401 | `{"exito":false,"mensaje":"No autenticado: se requiere un token válido"}` |

---

## 3. Servicios de productos (catálogo)

Entidad **Producto**: `id`, `nombre`, `descripcion`, `precio`, `stock` (la misma de los módulos Java, Android y web del proyecto).

### 3.1 GET /api/productos — Listar productos (público)

| Parámetro (query) | Descripción |
|---|---|
| `buscar` | Texto a buscar dentro del nombre (sin distinguir mayúsculas) |
| `pagina` | Número de página, desde 1 (por defecto 1) |
| `limite` | Productos por página, de 1 a 50 (por defecto 10) |

**200:** `{"exito":true,"total":4,"pagina":1,"limite":10,"productos":[{"id":1,"nombre":"Mouse inalámbrico","descripcion":"...","precio":35000,"stock":20}]}`
(`total` es el número de coincidencias, no solo los de la página.)

### 3.2 GET /api/productos/{id} — Consultar un producto (público)

| Código | Respuesta |
|---|---|
| 200 | `{"exito":true,"producto":{...}}` |
| 400 | id que no es un entero positivo |
| 404 | `{"exito":false,"mensaje":"Producto no encontrado"}` |

### 3.3 POST /api/productos — Crear un producto (solo admin)

**Cuerpo:** `{ "nombre": "Mouse inalámbrico", "descripcion": "Mouse óptico USB 2.4GHz", "precio": 35000, "stock": 20 }`

| Campo | Regla |
|---|---|
| `nombre` | Obligatorio; 3 a 50 caracteres; solo letras (con tildes), números, espacios, punto y guion |
| `descripcion` | Opcional; máximo 150 caracteres |
| `precio` | Obligatorio; **número** mayor a 0; máximo 2 decimales; hasta 99999999 |
| `stock` | Obligatorio; **entero** entre 0 y 100000 |

| Código | Respuesta |
|---|---|
| 201 | `{"exito":true,"mensaje":"Producto creado correctamente","producto":{...}}` |
| 400 | `{"exito":false,"mensaje":"Datos de producto inválidos","errores":[...]}` |
| 401 / 403 | Sin token / el usuario no es admin |

### 3.4 PUT /api/productos/{id} — Reemplazar un producto (solo admin)

Mismo cuerpo y reglas que la creación; reemplaza **todos** los datos.
Respuestas: 200 (`"Producto actualizado correctamente"`), 400, 401, 403, 404.

### 3.5 DELETE /api/productos/{id} — Eliminar un producto (solo admin)

Respuestas: 200 (`"Producto eliminado correctamente"`), 400, 401, 403, 404.
Los pedidos ya hechos conservan una copia del nombre y precio del producto.

---

## 4. Servicios de pedidos

Todos exigen **token**. Entidad **Pedido**: `id`, `usuarioId`, `items[]` (`productoId`, `nombre`, `precioUnitario`, `cantidad`, `subtotal`), `total`, `estado`, `fechaCreacion`.

**Ciclo de vida del estado:**

```
pendiente ──► enviado ──► entregado
    └──────► cancelado
```

### 4.1 POST /api/pedidos — Crear un pedido

**Cuerpo:** `{ "items": [ { "productoId": 1, "cantidad": 2 }, { "productoId": 2, "cantidad": 1 } ] }`

Reglas: al menos 1 producto y máximo 50; `productoId` entero positivo sin repetir; `cantidad` entero de 1 a 100.

El servidor: toma los **precios del catálogo** (ignora cualquier precio enviado), calcula subtotales y total, **descuenta el stock** y crea el pedido en estado `pendiente`. Si algún producto no existe o no hay stock, **no se descuenta nada**.

| Código | Respuesta |
|---|---|
| 201 | `{"exito":true,"mensaje":"Pedido creado correctamente","pedido":{...}}` |
| 400 | Datos inválidos, o un producto no existe (`errores`: `"El producto 999 no existe"`) |
| 401 | Sin token |
| 409 | `{"exito":false,"mensaje":"No hay stock suficiente para completar el pedido","errores":["Stock insuficiente de \"Mouse inalámbrico\": disponible 1"]}` |

### 4.2 GET /api/pedidos — Listar pedidos

El cliente ve **solo los suyos**; el admin ve todos. Parámetro opcional `estado` (`pendiente`, `enviado`, `entregado`, `cancelado`).

**200:** `{"exito":true,"total":1,"pedidos":[{...}]}` — 400 si el filtro de estado no es válido.

### 4.3 GET /api/pedidos/{id} — Consultar un pedido

200 con el pedido. Si el pedido es de otra persona responde **404** (no revela que existe).

### 4.4 PATCH /api/pedidos/{id}/cancelar — Cancelar un pedido

Cancela un pedido `pendiente` y **devuelve el stock**. Lo puede hacer su dueño o el admin.
Respuestas: 200, 400, 401, 404, 409 (el pedido ya no está pendiente).

### 4.5 PATCH /api/pedidos/{id}/estado — Cambiar el estado (solo admin)

**Cuerpo:** `{ "estado": "enviado" }`. Transiciones permitidas: `pendiente→enviado`, `pendiente→cancelado` (devuelve stock) y `enviado→entregado`.
Respuestas: 200, 400 (estado inexistente), 401, 403, 404, 409 (transición no permitida).

---

## 5. Utilidades

| Servicio | Descripción |
|---|---|
| `GET /api/salud` | Responde `{"exito":true,"mensaje":"Servicio activo"}` |
| `GET /api/docs` | Documentación interactiva (Swagger UI) |
| `GET /api/openapi.json` | Especificación OpenAPI en JSON |

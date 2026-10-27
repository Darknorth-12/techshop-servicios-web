# Diseño de los servicios web – TechShop

**Evidencia:** GA7-220501096-AA5-EV03 — Diseño y desarrollo de servicios web (proyecto)
**Tecnología:** Node.js + Express (API REST con respuestas JSON)

## 1. Análisis: ¿qué servicios necesita TechShop?

TechShop es una aplicación de venta de productos electrónicos. Los módulos
del proyecto (Java/JDBC, Servlets/JSP, Android y front-end web) gestionan el
catálogo; para que todos consuman los mismos datos se necesita un backend con
tres grupos de servicios:

| Grupo | Necesidad del negocio | Usuarios |
|---|---|---|
| Autenticación | Que cada persona se registre, inicie sesión y se identifique | Todos |
| Productos | Mantener el catálogo (admin) y consultarlo (todos) | Admin y público |
| Pedidos | Que un cliente compre y que el admin gestione la entrega | Cliente y admin |

## 2. Decisiones de diseño

| Decisión | Justificación |
|---|---|
| API REST con JSON | Cualquier cliente (web, Android, Postman) puede consumirla |
| Recursos en plural y verbos HTTP | `GET/POST /api/productos`, `PUT/DELETE /api/productos/{id}`: la URL nombra el recurso y el método indica la acción |
| Tokens JWT con vigencia de 2 horas | El servidor no guarda sesiones; cada petición lleva su credencial firmada |
| Dos roles (cliente y admin) | El catálogo solo lo modifica el admin; el cliente solo compra |
| El admin no se crea por la API | Evita que alguien se auto-asigne el rol; se crea desde el servidor (`npm run crear-admin`) |
| Contraseñas con bcrypt | Nunca se guarda la contraseña, solo su hash con sal |
| Mismo error para usuario inexistente y contraseña errónea | No revela qué usuarios existen |
| El servidor calcula precios y totales | Nunca confía en precios enviados por el cliente |
| El pedido guarda copia de nombre y precio | Un cambio posterior en el catálogo no altera pedidos ya hechos |
| Pedido de otra persona → 404 (no 403) | No revela que el pedido existe |
| Validar todo antes de modificar | Si falta stock en un producto, no se descuenta ninguno |
| Arquitectura por capas | Rutas → controlador → servicio → repositorio, igual que los módulos Java del proyecto |
| Persistencia en archivos JSON | Suficiente para la evidencia; solo habría que reemplazar la capa de repositorio por MySQL/MongoDB |

## 3. Arquitectura

```
Cliente (app web / app Android / Postman)
        │  HTTP + JSON  (+ Authorization: Bearer <token>)
        ▼
  app.js ─ configuración, documentación (/api/docs) y manejo central de errores
        │
        ├─ routes/            ─ qué URL y método llegan a qué controlador
        │    └─ middlewares/  ─ autenticar (token) y exigirRol (permisos)
        ├─ controllers/       ─ leen la petición, validan y arman la respuesta
        ├─ services/          ─ reglas de negocio (stock, estados, bcrypt)
        └─ repositories/      ─ leen y escriben los archivos JSON de data/
```

## 4. Modelo de datos

```
┌────────────────┐        ┌─────────────────┐        ┌────────────────────┐
│ Usuario        │ 1    * │ Pedido          │ 1    * │ Línea de pedido    │
├────────────────┤────────├─────────────────┤────────├────────────────────┤
│ id             │        │ id              │        │ productoId         │
│ usuario        │        │ usuarioId       │        │ nombre (copia)     │
│ contrasenaHash │        │ total           │        │ precioUnitario     │
│ rol            │        │ estado          │        │ cantidad           │
│ fechaRegistro  │        │ fechaCreacion   │        │ subtotal           │
└────────────────┘        └─────────────────┘        └─────────┬──────────┘
                                                               │ * referencia
                                                      ┌────────▼───────────┐
                                                      │ Producto           │
                                                      ├────────────────────┤
                                                      │ id, nombre,        │
                                                      │ descripcion,       │
                                                      │ precio, stock      │
                                                      └────────────────────┘
```

Archivos: `data/usuarios.json`, `data/productos.json`, `data/pedidos.json`
(las líneas de pedido viven dentro de cada pedido).

## 5. Flujo de un pedido

```
POST /api/pedidos (cliente con token)
   │
   ├─ ¿Datos válidos? ───────────── no ─► 400
   ├─ ¿Existen todos los productos? ─ no ─► 400
   ├─ ¿Hay stock de todos? ───────── no ─► 409 (no se descuenta nada)
   │
   ▼
Descuenta stock → guarda el pedido (estado: pendiente, precios del catálogo) → 201

Después:
   Cliente ─ cancela (si está pendiente) ─► stock devuelto, estado: cancelado
   Admin ─── pendiente → enviado → entregado   (o cancelado desde pendiente)
```

## 6. Seguridad aplicada

- Contraseñas con hash bcrypt; las respuestas nunca incluyen el hash.
- Tokens JWT firmados; se rechazan los inventados, de otra clave, vencidos o mal formados.
- Control de acceso por rol y por dueño del recurso.
- El rol de un usuario nuevo no se puede elegir desde la API (evita escalar privilegios).
- Validación estricta de entradas (tipos, longitudes, rangos, caracteres) y de ids en la URL.
- Límite de 10 KB en el cuerpo de las peticiones.
- Errores inesperados sin detalles internos para el cliente.
- En producción la clave del token es obligatoria (`JWT_SECRET`).

## 7. Alcance y mejoras futuras

Cubre los servicios necesarios para el flujo principal de TechShop. Para un
sistema en producción se recomienda: límite de intentos de login (rate
limiting), HTTPS, renovación de tokens (refresh token), base de datos real con
transacciones (hoy el descuento de stock y la creación del pedido no son
atómicos entre archivos), pagos y categorías de productos.

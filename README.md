# Cafe Artesanal Zaruma

Aplicacion de venta de cafe artesanal con API en Node.js + Express y frontend en React + Vite.

Este README esta pensado para que otra persona pueda levantar y entender la API sin tener que leer todo el codigo primero.

## Que hace la API

- autentica usuarios con JWT
- registra clientes y crea su usuario asociado
- expone catalogo de productos
- permite crear pedidos con reglas de negocio
- permite moderacion y consulta de pedidos por parte de Coffee Drinks
- permite reseñas de plataforma y de producto
- sube imagenes de producto para el panel administrativo
- sirve el frontend compilado en produccion

## Stack y archivos clave

- [api/server.js](api/server.js): arranque de Express, CORS, JSON, rutas, archivos estaticos y fallback del frontend
- [api/db.js](api/db.js): conexion MySQL, soporte SSL y pool de conexiones
- [api/middleware/auth.js](api/middleware/auth.js): middleware JWT y permisos de administrador
- [api/routes/authRoutes.js](api/routes/authRoutes.js): registro, login y sesion activa
- [api/routes/productRoutes.js](api/routes/productRoutes.js): catalogo, CRUD de productos, categorias e imagenes
- [api/routes/orderRoutes.js](api/routes/orderRoutes.js): checkout, historial y gestion administrativa de pedidos
- [api/routes/reviewRoutes.js](api/routes/reviewRoutes.js): reseñas, respuestas y conversacion
- [api/orderStore.js](api/orderStore.js): store auxiliar de pedidos en JSON
- [api/reviewStore.js](api/reviewStore.js): store de reseñas en JSON
- [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql): esquema base y datos base obligatorios
- [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql): productos semilla recomendados
- [.env.example](.env.example): plantilla de variables de entorno
- [render.yaml](render.yaml): despliegue en Render

## Requisitos previos

- Node.js 20 o superior
- npm 10 o superior
- MySQL 8 o un servicio compatible, por ejemplo Aiven MySQL
- una base de datos accesible desde la maquina o servicio donde corre la API

## Lo minimo para que la API funcione

Para que la API arranque correctamente necesitas estas 5 piezas:

1. una base de datos MySQL llamada `cafe_artesanal`
2. el esquema cargado desde [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql)
3. un archivo `.env` valido basado en [.env.example](.env.example)
4. dependencias instaladas con `npm install`
5. `JWT_SECRET` definido

Sin el SQL base no funcionaran correctamente registro, roles, sucursales, catalogo ni pedidos.

## Puesta en marcha rapida

### Opcion A: levantar solo la API en local

1. Clona el repositorio.
2. Ejecuta `npm install`.
3. Crea la base `cafe_artesanal`.
4. Ejecuta [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql).
5. Ejecuta [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql).
6. Crea `.env` copiando [.env.example](.env.example).
7. Ajusta credenciales reales de MySQL y `JWT_SECRET`.
8. Inicia la API con `npm run api`.
9. Prueba `GET /api/health`.

### Opcion B: API + frontend en local

1. Sigue todos los pasos de la opcion A.
2. En otra terminal ejecuta `npm run dev`.
3. Abre `http://localhost:5173`.

## Preparar la base de datos

### 1. Crear la base

```sql
CREATE DATABASE cafe_artesanal;
```

### 2. Cargar el esquema principal

Ejecuta [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql).

Ese archivo no solo crea tablas. Tambien inserta datos base que la API necesita, por ejemplo:

- roles
- sucursal `Matriz`
- relaciones base para usuarios

### 3. Cargar productos semilla

Ejecuta [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql).

No siempre es estrictamente obligatorio para que la API arranque, pero si es muy recomendable para poder probar el catalogo y los pedidos desde el primer inicio.

## Variables de entorno

Usa [.env.example](.env.example) como base.

### Variables obligatorias

- `JWT_SECRET`: firma y valida tokens JWT
- `CLIENT_ORIGIN`: origen permitido por CORS
- una de estas dos opciones de conexion a DB:
  - `DB_URL`
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Variables soportadas por la API

- `PORT`: puerto HTTP de la API
- `CLIENT_ORIGIN`: origen del frontend permitido por CORS
- `JWT_SECRET`: secreto JWT
- `DB_URL`: URL completa de MySQL. Si existe, tiene prioridad
- `DB_HOST`: host de MySQL
- `DB_PORT`: puerto de MySQL
- `DB_USER`: usuario de MySQL
- `DB_PASSWORD`: clave de MySQL
- `DB_NAME`: nombre de la base
- `DB_SSL`: activa SSL si vale `true`, `1`, `yes` u `on`
- `DB_SSL_MODE`: `require` o `verify-ca`
- `DB_SSL_CA`: certificado CA inline
- `DB_SSL_CA_FILE`: ruta a archivo CA, por ejemplo `./ca.pem`
- `DB_CONNECTION_LIMIT`: tamano del pool
- `DB_CONNECT_TIMEOUT_MS`: timeout de conexion
- `DB_KEEP_ALIVE`: keep alive del pool
- `VITE_API_URL`: usada por el frontend

### Ejemplo local sin SSL

```env
PORT=14875
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=pon_una_clave_segura_y_larga

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=cafe_artesanal

DB_SSL=false
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT_MS=10000
DB_KEEP_ALIVE=true

VITE_API_URL=http://localhost:14875/api
```

### Ejemplo con Aiven y URL unica

```env
PORT=14875
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=pon_una_clave_segura_y_larga

DB_URL=mysql://usuario:password@host:puerto/cafe_artesanal
DB_SSL=true
DB_SSL_MODE=require

VITE_API_URL=http://localhost:14875/api
```

### Ejemplo con Aiven y validacion CA

```env
DB_SSL=true
DB_SSL_MODE=verify-ca
DB_SSL_CA_FILE=./ca.pem
```

Si usas `verify-ca`, necesitas certificado CA. Puedes usar [ca.pem](ca.pem).

## Instalar y ejecutar

### Instalar dependencias

```bash
npm install
```

### Ejecutar solo la API

```bash
npm run api
```

La API arranca por defecto en `http://localhost:4000`, salvo que hayas definido `PORT`.

### Ejecutar frontend en desarrollo

```bash
npm run dev
```

### Build y produccion

```bash
npm run build
npm start
```

En produccion, la API sirve tambien el frontend compilado cuando existe la carpeta `dist`.

## Scripts disponibles

```bash
npm run dev
npm run api
npm run build
npm run build:render
npm run preview
npm run lint
npm start
```

## Verificaciones basicas despues del arranque

### Health check

Peticion:

```http
GET /api/health
```

Respuesta esperada:

```json
{ "ok": true, "service": "Cafe Artesanal API" }
```

### Catalogo PDF

Peticion:

```http
GET /api/catalog/pdf
```

Debe descargar el PDF si existe en `public/imagenes/Catalogo_Coffe_Drink.pdf`.

## Autenticacion y permisos

La API usa JWT con expiracion de 8 horas.

### Flujo normal

1. el cliente se registra o inicia sesion
2. la API devuelve `token`
3. ese token debe enviarse asi en rutas protegidas:

```http
Authorization: Bearer TU_TOKEN
```

### Rutas publicas

- `GET /api/health`
- `GET /api/catalog/pdf`
- `GET /api/reviews/public`
- `POST /api/auth/register`
- `POST /api/auth/login`

### Rutas protegidas

Requieren token:

- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/orders`
- `GET /api/orders/my`
- `POST /api/reviews`

### Rutas de administrador

Ademas del token, requieren un usuario cuyo rol interno sea `administrador`.

## Usuario administrador de prueba

Si ejecutaste [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql), el sistema ya crea un administrador semilla.

### Credenciales del administrador semilla

- usuario: `admin`
- correo: `admin@cafe.com`
- password inicial: `Admin123`

Ese usuario se inserta en [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql) con hash SHA-256. La API permite iniciar sesion con esa clave y, en el primer login exitoso, migra automaticamente el hash a bcrypt.

### Como identificar si un usuario es administrador

Puedes verificarlo de cualquiera de estas formas:

1. inicia sesion en `POST /api/auth/login` y revisa `user.rol` en la respuesta
2. consulta la tabla `usuarios` unida con `roles` en MySQL
3. prueba una ruta administrativa, por ejemplo `GET /api/products/meta`

Consulta SQL sugerida:

```sql
SELECT
  u.id_usuario,
  u.usuario,
  u.correo,
  r.nombre AS rol
FROM usuarios u
INNER JOIN roles r ON r.id_rol = u.id_rol
ORDER BY u.id_usuario;
```

### Como crear manualmente otro administrador de prueba

Si no quieres usar el usuario semilla, puedes crear uno manualmente reutilizando un cliente existente o creando uno nuevo. Lo importante es que en `usuarios.id_rol` apunte al rol `Administrador` y `id_sucursal` apunte a una sucursal valida, normalmente `Matriz`.

Ejemplo de consulta para identificar el ID del rol y la sucursal:

```sql
SELECT id_rol, nombre FROM roles;
SELECT id_sucursal, nombre FROM sucursales;
```

Ejemplo de insercion de un administrador usando SHA-256 compatible con la API actual:

```sql
INSERT INTO clientes (cedula, nombres, apellidos, telefono, correo, direccion)
VALUES ('1234567890', 'Admin', 'Pruebas', '0980000000', 'admin2@cafe.com', 'Oficina');

INSERT INTO usuarios (id_cliente, id_rol, id_sucursal, usuario, correo, password)
VALUES (
  LAST_INSERT_ID(),
  1,
  1,
  'admin2',
  'admin2@cafe.com',
  SHA2('Admin123', 256)
);
```

Si en tu base los IDs no coinciden con `1`, usa primero las consultas a `roles` y `sucursales` para obtener los IDs reales.

## Endpoints principales de la API

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Productos

- `GET /api/products`
- `GET /api/products/meta`
- `POST /api/products`
- `PUT /api/products/:idProducto`
- `DELETE /api/products/:idProducto`
- `POST /api/products/images`
- `POST /api/products/categories`
- `PUT /api/products/categories/:idCategoria`
- `DELETE /api/products/categories/:idCategoria`

### Pedidos

- `POST /api/orders`
- `GET /api/orders/my`
- `DELETE /api/orders/my/:idVenta`
- `DELETE /api/orders/my`
- `GET /api/orders/admin/pending`
- `GET /api/orders/admin/all`
- `PUT /api/orders/admin/:idVenta/approve`
- `PUT /api/orders/admin/:idVenta/reject`
- `GET /api/orders/admin/sales-summary`

### Reseñas

- `GET /api/reviews`
- `GET /api/reviews/public`
- `POST /api/reviews`
- `POST /api/reviews/:idReview/reply`
- `POST /api/reviews/:idReview/conversation`
- `DELETE /api/reviews/:idReview/conversation/:idReply`
- `DELETE /api/reviews/:idReview`

## Ejemplos minimos de uso

### 1. Registrar usuario

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "nombres": "Ana",
  "apellidos": "Lopez",
  "telefono": "0987654321",
  "correo": "ana@example.com",
  "direccion": "Zaruma",
  "usuario": "ana_lopez",
  "password": "claveSegura123"
}
```

Validaciones importantes:

- telefono obligatorio y de 10 digitos
- contrasena minima de 8 caracteres
- usuario unico
- correo unico
- no se puede reutilizar exactamente una contrasena ya existente

### 2. Iniciar sesion

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "usuario": "ana_lopez",
  "password": "claveSegura123"
}
```

Respuesta esperada:

```json
{
  "token": "jwt...",
  "user": {
    "id_usuario": 1,
    "id_cliente": 1,
    "usuario": "ana_lopez",
    "correo": "ana@example.com",
    "rol": "Usuario"
  }
}
```

### 3. Consultar catalogo

```http
GET /api/products
Authorization: Bearer TU_TOKEN
```

Comportamiento:

- si el usuario es cliente, solo ve productos activos con stock
- si el usuario es administrador, ve el catalogo completo
- al cargar el catalogo, la API intenta asegurar productos base automaticamente

### 4. Crear un pedido

```http
POST /api/orders
Authorization: Bearer TU_TOKEN
Content-Type: application/json
```

```json
{
  "items": [
    { "id_producto": 1, "cantidad": 2 },
    { "id_producto": 2, "cantidad": 1 }
  ],
  "metodo_pago": "DEPOSITO_BANCARIO",
  "referencia_deposito": "DEP-001",
  "forma_entrega": "ENTREGA_DOMICILIO",
  "provincia_entrega": "El Oro",
  "ciudad_entrega": "Zaruma",
  "sector_entrega": "Centro",
  "direccion_entrega": "Calle Principal 123"
}
```

Validaciones importantes:

- `items` debe existir y no ir vacio
- `metodo_pago` permitido: `DEPOSITO_BANCARIO` o `TRANSFERENCIA_BANCARIA`
- `forma_entrega` permitida: `RETIRO_TIENDA` o `ENTREGA_DOMICILIO`
- si es entrega a domicilio, provincia, ciudad, sector y direccion son obligatorios
- maximo de 6 unidades de cafe por pedido

### 5. Crear una reseña

```http
POST /api/reviews
Authorization: Bearer TU_TOKEN
Content-Type: application/json
```

Reseña de plataforma:

```json
{
  "scope": "APP",
  "rating": 5,
  "comment": "Excelente atencion"
}
```

Reseña de producto:

```json
{
  "scope": "PRODUCT",
  "rating": 5,
  "comment": "Muy buen aroma",
  "id_producto": 1
}
```

Validacion importante:

- solo se puede reseñar un producto si ese cliente ya lo compro y el pedido esta pagado

## Orden exacto de pruebas para Postman o Insomnia

La forma mas simple de probar esta API es usar dos sesiones:

- una sesion cliente
- una sesion administrador

### Variables recomendadas de coleccion o entorno

- `baseUrl`: `http://localhost:14875/api` o tu URL real
- `clientToken`: vacia al inicio
- `adminToken`: vacia al inicio
- `productId`: vacia al inicio
- `orderId`: vacia al inicio
- `reviewId`: vacia al inicio

### Secuencia exacta

1. `GET {{baseUrl}}/health`
Verifica que la API responda antes de autenticarte.

2. `POST {{baseUrl}}/auth/login`
Body para administrador semilla:

```json
{
  "usuario": "admin",
  "password": "Admin123"
}
```

Guarda el `token` como `adminToken`.

3. `POST {{baseUrl}}/auth/register`
Body para cliente de prueba:

```json
{
  "nombres": "Cliente",
  "apellidos": "Prueba",
  "telefono": "0987654321",
  "correo": "cliente.prueba@example.com",
  "direccion": "Zaruma",
  "usuario": "cliente_prueba",
  "password": "Cliente123"
}
```

Si ese usuario ya existe, puedes saltar este paso.

4. `POST {{baseUrl}}/auth/login`
Body para cliente:

```json
{
  "usuario": "cliente_prueba",
  "password": "Cliente123"
}
```

Guarda el `token` como `clientToken`.

5. `GET {{baseUrl}}/auth/me`
Header:

```http
Authorization: Bearer {{clientToken}}
```

Confirma que el token del cliente funciona.

6. `GET {{baseUrl}}/products`
Header:

```http
Authorization: Bearer {{clientToken}}
```

Toma el `id_producto` de un producto valido y guardalo como `productId`.

7. `GET {{baseUrl}}/products/meta`
Header:

```http
Authorization: Bearer {{adminToken}}
```

Confirma que el token administrador si puede entrar a rutas admin.

8. `POST {{baseUrl}}/orders`
Header:

```http
Authorization: Bearer {{clientToken}}
Content-Type: application/json
```

Body:

```json
{
  "items": [
    { "id_producto": {{productId}}, "cantidad": 1 }
  ],
  "metodo_pago": "DEPOSITO_BANCARIO",
  "referencia_deposito": "DEP-POSTMAN-001",
  "forma_entrega": "RETIRO_TIENDA"
}
```

Guarda `order.id_venta` como `orderId`.

9. `GET {{baseUrl}}/orders/my`
Header:

```http
Authorization: Bearer {{clientToken}}
```

Verifica que el pedido aparezca como pendiente.

10. `GET {{baseUrl}}/orders/admin/pending`
Header:

```http
Authorization: Bearer {{adminToken}}
```

Verifica que el pedido del cliente aparezca en pendientes.

11. `PUT {{baseUrl}}/orders/admin/{{orderId}}/approve`
Header:

```http
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Si tu flujo actual no exige body adicional, envialo vacio.

12. `GET {{baseUrl}}/orders/my`
Header:

```http
Authorization: Bearer {{clientToken}}
```

Confirma que el pedido cambio a pagado o aprobado segun la respuesta operativa.

13. `POST {{baseUrl}}/reviews`
Header:

```http
Authorization: Bearer {{clientToken}}
Content-Type: application/json
```

Body:

```json
{
  "scope": "PRODUCT",
  "rating": 5,
  "comment": "Prueba desde Postman",
  "id_producto": {{productId}}
}
```

Guarda el identificador de la reseña como `reviewId` si viene en la respuesta.

14. `GET {{baseUrl}}/reviews`
Header:

```http
Authorization: Bearer {{clientToken}}
```

Confirma que la reseña se haya creado.

15. `POST {{baseUrl}}/reviews/{{reviewId}}/reply`
Header:

```http
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

Body:

```json
{
  "reply": "Respuesta de prueba de Coffee Drinks"
}
```

Esto valida el flujo de moderacion de reseñas.

### Prueba alternativa de rechazo de pedido

Si quieres probar rechazo en vez de aprobacion, sustituye el paso 11 por este:

`PUT {{baseUrl}}/orders/admin/{{orderId}}/reject`

Body:

```json
{
  "motivo_rechazo": "Comprobante no valido"
}
```

Luego repite `GET {{baseUrl}}/orders/my` para confirmar el cambio de estado.

### Orden minimo si solo quieres probar permisos

1. `GET /api/health`
2. `POST /api/auth/login` con `admin`
3. `POST /api/auth/login` o `POST /api/auth/register` para cliente
4. `GET /api/products` con token cliente
5. `GET /api/products/meta` con token admin
6. `GET /api/orders/admin/pending` con token admin

## Reglas de negocio importantes

- el catalogo requiere autenticacion
- el token invalido o expirado devuelve 401
- el registro crea cliente y usuario dentro de una transaccion
- el login soporta migracion de hashes legacy SHA-256 a bcrypt
- los pedidos crean registros en MySQL y tambien una copia operativa en JSON
- el limite de cafe por pedido es 6 unidades
- aprobar un pedido descuenta stock
- rechazar un pedido exige motivo
- las categorias no se pueden eliminar si tienen productos asociados
- las imagenes subidas solo aceptan archivos `image/*` y hasta 5 MB
- la API intenta crear en runtime la columna `imagen_url` si aun no existe en `productos`

## Persistencia y archivos generados

- MySQL: fuente principal de verdad para usuarios, clientes, productos, ventas y pagos
- [api/data/orders.json](api/data/orders.json): store auxiliar de pedidos
- [api/data/reviews.json](api/data/reviews.json): store de reseñas y conversaciones
- [public/imagenes/uploads](public/imagenes/uploads): imagenes cargadas desde el panel admin
- [dist](dist): build del frontend en produccion

Si despliegas la API en un entorno efimero, recuerda que los archivos JSON y uploads pueden perderse si el disco no es persistente.

## Estructura general del frontend

Aunque este README esta orientado a la API, estas rutas te ayudan a entender como se consume:

- `/`: home y descarga del PDF
- `/login`: inicio de sesion
- `/registro`: registro
- `/catalogo`: consumo principal del catalogo
- `/carrito`: pre-checkout
- `/pago`: creacion de pedidos
- `/mis-pedidos`: historial del cliente
- `/solicitudes`: gestion administrativa de pedidos
- `/inventario`: administracion de productos y categorias
- `/ingresos`: resumen administrativo

## Despliegue en Render

El proyecto ya incluye [render.yaml](render.yaml).

Variables configuradas ahi:

- `NODE_ENV=production`
- `PORT=10000`
- `CLIENT_ORIGIN=https://cafe-artesanal-1.onrender.com`
- `DB_SSL=true`
- `DB_SSL_MODE=require`
- `VITE_API_URL=/api`

Variables que debes completar manualmente en Render:

- `JWT_SECRET`
- `DB_URL`

Comandos usados por Render:

- build: `npm ci && npm run build:render`
- start: `npm run start`

## Problemas comunes

### Error de conexion a MySQL

Revisa:

- que la base exista
- que ejecutaste [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql)
- que `DB_URL` o `DB_HOST` y compania sean correctos
- que el usuario tenga permisos
- que SSL este bien configurado si usas Aiven

### Error `DB_SSL_MODE=verify-ca requiere certificado CA`

Solucion:

- define `DB_SSL_CA`
- o define `DB_SSL_CA_FILE`
- o coloca [ca.pem](ca.pem) en la raiz del proyecto

### Error `Token requerido`

Estas llamando una ruta protegida sin encabezado:

```http
Authorization: Bearer TU_TOKEN
```

### Error `Token invalido o expirado`

El token expira a las 8 horas. Debes volver a iniciar sesion.

### Registro falla con `Configuracion inicial incompleta en roles o sucursales`

No se cargo correctamente [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql), o se borraron datos base como:

- rol `Usuario`
- sucursal `Matriz`

### Catalogo vacio

Puede deberse a cualquiera de estas causas:

- no cargaste productos semilla
- el usuario no tiene token valido
- todos los productos estan inactivos o sin stock
- la API no logra consultar la base

## Recomendacion para entregar este proyecto a otra persona

Si otra persona va a continuar el proyecto, entregale junto con este README:

- el archivo [.env.example](.env.example)
- una copia de [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql)
- una copia de [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql)
- el certificado [ca.pem](ca.pem) si usa Aiven con CA
- un usuario administrador de pruebas o instrucciones para crearlo

## Resumen corto

Si solo quieres validar que la API esta viva, haz esto:

1. `npm install`
2. crea `.env`
3. crea la base `cafe_artesanal`
4. ejecuta [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql)
5. ejecuta [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql)
6. corre `npm run api`
7. abre `http://localhost:PUERTO/api/health`

Con eso ya deberias tener la API lista para pruebas.

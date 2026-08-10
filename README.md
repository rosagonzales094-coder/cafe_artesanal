# Cafe Artesanal Zaruma - API + Frontend

Aplicacion de venta de cafe artesanal con API en Node.js + Express y frontend en React + Vite.

## Que incluye el proyecto

- API REST con autenticacion JWT
- Conexion a MySQL (local o Aiven)
- Registro y login con hash de contrasena (bcrypt)
- Catalogo protegido para usuarios autenticados
- Carrito y checkout con reglas de negocio
- Gestion de pedidos por cliente y administrador
- Reseñas de productos y de plataforma
- Carga de imagenes de producto
- Build unico para Render (API + frontend en el mismo servicio)

## Estructura principal

- [api/server.js](api/server.js): arranque de Express, CORS, rutas API, archivos estaticos y fallback del frontend
- [api/db.js](api/db.js): pool MySQL y configuracion SSL
- [api/routes/authRoutes.js](api/routes/authRoutes.js): registro, login y sesion
- [api/routes/productRoutes.js](api/routes/productRoutes.js): CRUD de productos, categorias, proveedores, upload imagen
- [api/routes/orderRoutes.js](api/routes/orderRoutes.js): checkout, pedidos cliente, aprobacion/rechazo admin
- [api/routes/reviewRoutes.js](api/routes/reviewRoutes.js): reseñas y respuestas
- [api/orderStore.js](api/orderStore.js): persistencia auxiliar de pedidos en JSON
- [api/data/orders.json](api/data/orders.json): store de pedidos
- [src/App.jsx](src/App.jsx): app principal del frontend
- [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql): esquema base de datos
- [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql): datos iniciales de productos

## Requisitos previos

- Node.js 20 o superior
- npm 10 o superior
- MySQL 8+ (o Aiven MySQL)
- Git (opcional, recomendado)

## 1) Preparar base de datos

1. Crea una base llamada cafe_artesanal.
2. Ejecuta [Database/cafe_artesanal.sql](Database/cafe_artesanal.sql).
3. Carga productos semilla con [Database/seed_productos_zaruma.sql](Database/seed_productos_zaruma.sql).

## 2) Configurar variables de entorno

1. Crea .env desde [\.env.example](.env.example).
2. Ajusta las variables de DB y JWT_SECRET.

Variables importantes para API:

- PORT: puerto de API (ejemplo 4000 en local)
- CLIENT_ORIGIN: origen permitido por CORS (ejemplo http://localhost:5173)
- JWT_SECRET: clave para firmar tokens JWT
- DB_URL: URL completa de MySQL (si existe, tiene prioridad)
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME: alternativa sin DB_URL
- DB_SSL: true/false
- DB_SSL_MODE: require o verify-ca
- DB_SSL_CA o DB_SSL_CA_FILE: CA para SSL estricto
- DB_CONNECTION_LIMIT: tamano del pool
- DB_CONNECT_TIMEOUT_MS: timeout de conexion
- DB_KEEP_ALIVE: true/false

Variables importantes para frontend:

- VITE_API_URL: base URL de la API

Ejemplo local:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=pon_una_clave_segura

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=cafe_artesanal

DB_SSL=false
DB_SSL_MODE=require
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT_MS=10000
DB_KEEP_ALIVE=true

VITE_API_URL=http://localhost:4000/api
```

Ejemplo Aiven con URL:

```env
JWT_SECRET=pon_una_clave_segura
CLIENT_ORIGIN=http://localhost:5173

DB_URL=mysql://usuario:password@host:puerto/cafe_artesanal
DB_SSL=true
DB_SSL_MODE=require

VITE_API_URL=http://localhost:4000/api
```

Ejemplo Aiven con CA:

```env
DB_SSL=true
DB_SSL_MODE=verify-ca
DB_SSL_CA_FILE=./ca.pem
```

## 3) Instalar dependencias

```bash
npm install
```

## 4) Ejecutar en local

Terminal 1 (API):

```bash
npm run api
```

Terminal 2 (Frontend):

```bash
npm run dev
```

Build de frontend:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## 5) Verificar que la API funciona

Health check:

- GET /api/health

Debe responder JSON como:

```json
{ "ok": true, "service": "Cafe Artesanal API" }
```

## Endpoints principales

Auth:

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

Productos:

- GET /api/products
- GET /api/products/meta
- POST /api/products (admin)
- PUT /api/products/:id (admin)
- DELETE /api/products/:id (admin)
- POST /api/products/images (admin)

Pedidos:

- POST /api/orders
- GET /api/orders/my
- DELETE /api/orders/my/:idVenta
- DELETE /api/orders/my
- GET /api/orders/admin/pending (admin)
- GET /api/orders/admin/all (admin)
- PUT /api/orders/admin/:idVenta/approve (admin)
- PUT /api/orders/admin/:idVenta/reject (admin)
- GET /api/orders/admin/sales-summary (admin)

Reseñas:

- GET /api/reviews
- GET /api/reviews/public
- POST /api/reviews
- POST /api/reviews/:idReview/reply
- POST /api/reviews/:idReview/conversation
- DELETE /api/reviews/:idReview/conversation/:idReply
- DELETE /api/reviews/:idReview

## Reglas de negocio relevantes en la API

- usuario unico y correo unico
- contrasena con hash bcrypt
- no reutilizar una contrasena ya usada
- catalogo protegido por token
- pedido requiere items validos
- limite de cafes por pedido
- validacion de datos de entrega a domicilio
- aprobacion admin descuenta stock
- rechazo admin exige motivo
- reseñas de producto solo para compras pagadas del cliente

## Uso de API Render desde frontend local

Si no ejecutas API local y quieres usar Render:

```env
VITE_API_URL=https://cafe-artesanal-1.onrender.com/api
```

Luego reinicia npm run dev.

## Despliegue en Render

Proyecto preparado para Blueprint con [render.yaml](render.yaml).

Pasos:

1. Subir repo a GitHub.
2. En Render: New + -> Blueprint.
3. Conectar repo.
4. Completar variables sensibles:
	- JWT_SECRET
	- DB_URL (recomendado)
5. Confirmar CLIENT_ORIGIN en dominio publicado:
	- https://cafe-artesanal-1.onrender.com

Notas:

- El servicio usa Node y sirve API + build de frontend.
- En produccion se usa /api como base del frontend.
- Si no usas DB_URL, define DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME.

## Problemas comunes y solucion

1. Error CORS:
	- Revisar CLIENT_ORIGIN y que coincida con el frontend.

2. Error de conexion MySQL:
	- Verificar DB_URL o DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.
	- Revisar SSL (DB_SSL y DB_SSL_MODE).

3. Error JWT:
	- Definir JWT_SECRET en .env o en Render.

4. Pantalla sin datos en catalogo:
	- Revisar token de sesion valido.
	- Verificar que API responda en /api/health.

5. Build falla en deploy:
	- Ejecutar npm run build en local y corregir errores antes de push.
